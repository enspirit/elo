import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileToRuby, compileToJavaScript, compileToSQL, compileToPython, compile } from '../../src/index';
import { dateLiteral, dateTimeLiteral, durationLiteral } from '../../src/ast';
import { parse, parseTypeExpr } from '../../src/parser';
import { typecheckWithAnnotations } from '../../src/typecheck';
import { transform } from '../../src/transform';
import { defaultFormats } from '../../src/formats';
import { sqlPrelude } from '../../src/preludes/sql';
import { MAX_STRING_LENGTH } from '../../src/runtime';

/**
 * Security: Ensure that values in date/datetime/duration literals are properly
 * escaped in emitted code. Without sanitization, a crafted value passed through
 * the programmatic AST API (e.g. dateLiteral(userInput)) could break out of
 * the generated string literal and inject arbitrary code in the target language.
 *
 * For example, a date value of: '+process.exit(1)+'
 * without escaping would produce:
 *   DateTime.fromISO(''+process.exit(1)+'')
 * which evaluates process.exit(1) as part of the return expression.
 *
 * The fix uses JSON.stringify (JS), escapeRubyDQ (Ruby) and single-quote
 * doubling (SQL) so the malicious payload stays inside the string boundary.
 * Ruby needs more than JSON.stringify: see the `#{}` interpolation suite below.
 */
describe('Security - Literal injection prevention', () => {

  // This payload injects code *within* the return expression via string
  // concatenation, so it executes when the function is called.
  // Without the fix, the emitter produces:
  //   DateTime.fromISO(''+process.exit(1)+'')
  // After the fix, JSON.stringify wraps the value in double quotes with
  // proper escaping, keeping everything inside a single string argument.
  const sqInjection = "'+process.exit(1)+'";

  // Same technique with double quotes
  const dqInjection = '"+process.exit(1)+"';

  describe('Exact output - single-quote injection', () => {
    it('date_literal for JavaScript', () => {
      assert.strictEqual(
        compileToJavaScript(dateLiteral(sqInjection)),
        `(function(_) { return DateTime.fromISO("'+process.exit(1)+'", { zone: "utc" }); })`
      );
    });

    it('datetime_literal for JavaScript', () => {
      assert.strictEqual(
        compileToJavaScript(dateTimeLiteral(sqInjection)),
        `(function(_) { return DateTime.fromISO("'+process.exit(1)+'", { zone: "utc" }); })`
      );
    });

    it('duration_literal for JavaScript', () => {
      assert.strictEqual(
        compileToJavaScript(durationLiteral(sqInjection)),
        `(function(_) { return Duration.fromISO("'+process.exit(1)+'"); })`
      );
    });

    it('date_literal for Ruby', () => {
      assert.strictEqual(
        compileToRuby(dateLiteral(sqInjection)),
        `->(_) { Date.parse("'+process.exit(1)+'") }`
      );
    });

    it('datetime_literal for Ruby', () => {
      assert.strictEqual(
        compileToRuby(dateTimeLiteral(sqInjection)),
        `->(_) { DateTime.parse("'+process.exit(1)+'") }`
      );
    });

    it('duration_literal for Ruby', () => {
      assert.strictEqual(
        compileToRuby(durationLiteral(sqInjection)),
        `->(_) { ActiveSupport::Duration.parse("'+process.exit(1)+'") }`
      );
    });

    it('date_literal for SQL', () => {
      assert.strictEqual(
        compileToSQL(dateLiteral(sqInjection)),
        "DATE '''+process.exit(1)+'''"
      );
    });

    it('duration_literal for SQL', () => {
      assert.strictEqual(
        compileToSQL(durationLiteral(sqInjection)),
        "INTERVAL '''+process.exit(1)+'''"
      );
    });
  });

  describe('Exact output - double-quote injection', () => {
    it('date_literal for JavaScript', () => {
      assert.strictEqual(
        compileToJavaScript(dateLiteral(dqInjection)),
        '(function(_) { return DateTime.fromISO("\\"+process.exit(1)+\\"", { zone: "utc" }); })'
      );
    });

    it('date_literal for Ruby', () => {
      assert.strictEqual(
        compileToRuby(dateLiteral(dqInjection)),
        '->(_) { Date.parse("\\"+process.exit(1)+\\"") }'
      );
    });

    it('date_literal for SQL', () => {
      assert.strictEqual(
        compileToSQL(dateLiteral(dqInjection)),
        `DATE '"+process.exit(1)+"'`
      );
    });
  });

  describe('Eval proof - injected code must not execute', () => {
    // The compiled JS output is (function(_) { return ...; }) — a function.
    // We call it with (null) and provide stub DateTime/Duration + mock process.exit.
    // If the injection escapes the string, process.exit(1) calls our mock.
    function assertNoInjection(compiledJs: string) {
      let injectedCodeRan = false;
      const stub = { fromISO: (v: string) => v };
      const fn = new Function('DateTime', 'Duration', 'process',
        `return (${compiledJs})(null);`
      );
      try {
        fn(stub, stub, { exit: () => { injectedCodeRan = true; } });
      } catch {
        // A throw is fine (e.g. bad date), as long as injection didn't run
      }
      assert.strictEqual(injectedCodeRan, false, 'Injected process.exit() must not execute');
    }

    it('single-quote injection in date_literal', () => {
      assertNoInjection(compileToJavaScript(dateLiteral(sqInjection)));
    });

    it('double-quote injection in date_literal', () => {
      assertNoInjection(compileToJavaScript(dateLiteral(dqInjection)));
    });

    it('single-quote injection in datetime_literal', () => {
      assertNoInjection(compileToJavaScript(dateTimeLiteral(sqInjection)));
    });

    it('single-quote injection in duration_literal', () => {
      assertNoInjection(compileToJavaScript(durationLiteral(sqInjection)));
    });
  });
});

/**
 * Security: Ruby double-quoted string interpolation in temporal literals is a
 * code-execution sink distinct from the quote-breakout above.
 *
 * The temporal emitters used JSON.stringify, which escapes `\`, `"` and control
 * characters but NOT `#`. Ruby evaluates `#{...}` (and `#@ivar`, `#$global`)
 * inside a double-quoted string, so a value reaching dateLiteral() /
 * dateTimeLiteral() / durationLiteral() through the compiler AST API — e.g.
 * `2024-01-01#{`id`}` — executed an arbitrary shell command when the emitted
 * `Date.parse("...")` ran under the standard prelude (require 'date'; require
 * 'active_support/all'). JS/Python/SQL embed the same value as an inert string
 * (no `#{}` semantics), so this is Ruby-specific — the classic target divergence.
 *
 * The fix routes temporal values through escapeRubyDQ, exactly as stringLiteral
 * and guard labels already do, so `#` is escaped and no interpolation can fire.
 */
describe('Security - Ruby temporal literal interpolation (RCE)', () => {
  const codeExec = '2024-01-01#{`id`}';   // #{...} arbitrary code
  const ivarRead = '2024-01-01#@x';        // #@ivar instance-variable read
  const gvarRead = '2024-01-01#$x';        // #$global read
  const cases: Array<[string, (v: string) => unknown, string]> = [
    ['date', dateLiteral, 'Date.parse'],
    ['datetime', dateTimeLiteral, 'DateTime.parse'],
    ['duration', durationLiteral, 'ActiveSupport::Duration.parse'],
  ];

  for (const [name, make, call] of cases) {
    it(`${name} literal escapes # so #{...} cannot interpolate`, () => {
      const code = compileToRuby(make(codeExec) as any);
      assert.ok(code.includes(call), `expected a ${call} emission: ${code}`);
      // No live `#{`, `#@` or `#$` preceded by a non-backslash survives.
      assert.doesNotMatch(code, /[^\\]#[{@$]/, `interpolation survived: ${code}`);
      assert.ok(code.includes('\\#'), `# was not escaped: ${code}`);
    });

    it(`${name} literal escapes #@ivar and #$global`, () => {
      assert.doesNotMatch(compileToRuby(make(ivarRead) as any), /[^\\]#@/);
      assert.doesNotMatch(compileToRuby(make(gvarRead) as any), /[^\\]#\$/);
    });
  }

  it('a plain temporal literal is unchanged', () => {
    assert.strictEqual(compileToRuby(dateLiteral('2024-01-01')), `->(_) { Date.parse("2024-01-01") }`);
  });
});

/**
 * Security: extract() builds a Ruby regex *literal* `/.../`, and `escapeRegex`
 * must neutralize `#` so the `#`-interpolation family cannot fire inside it.
 *
 * `#{code}` was already blocked (escapeRegex escapes `{`, so `#{` becomes `#\{`),
 * but `#@ivar` / `#@@cvar` need no brace and `@` was left unescaped — so
 * `extract(_, '#@x pre {{name}}')` emitted `/#@x pre (.*)$/`, interpolating the
 * host instance variable @x at match time (target-divergent result / host read).
 * Escaping `#` closes the whole family uniformly on every target's regex literal.
 */
describe('Security - extract regex # interpolation (Ruby)', () => {
  it('#@ivar in an extract template is escaped, not interpolated', () => {
    const code = compileToRuby(parse(`extract(_, '#@x pre {{name}}')`));
    assert.doesNotMatch(code, /[^\\]#@/, `#@ivar interpolation survived: ${code}`);
  });

  it('#{...} in an extract template cannot interpolate', () => {
    const code = compileToRuby(parse(`extract(_, 'a#{1}b {{name}}')`));
    assert.doesNotMatch(code, /[^\\]#\{/, `#{} interpolation survived: ${code}`);
  });

  it('still extracts normally from a plain template', () => {
    assert.doesNotThrow(() => compileToRuby(parse(`extract(_, 'From: {{name}}')`)));
  });
});

describe('Security - Sandbox escape via meta-property member access', () => {
  const forbidden = [
    'constructor',
    '__proto__',
    'prototype',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
  ];

  for (const name of forbidden) {
    it(`rejects .${name} on an object literal`, () => {
      assert.throws(() => transform(parse(`({}).${name}`)), /forbidden/);
    });

    it(`rejects .${name} on an array literal`, () => {
      assert.throws(() => transform(parse(`[].${name}`)), /forbidden/);
    });

    it(`rejects .${name} on a lambda parameter (any type)`, () => {
      assert.throws(() => transform(parse(`fn(x ~> x.${name})`)), /forbidden/);
    });
  }

  it('rejects the .constructor.constructor escape chain (PoC)', () => {
    const pocs = [
      `({}).constructor.constructor('return 1')()`,
      `[].constructor.constructor('return 1')()`,
      `(fn(x ~> x.constructor.constructor('return 1')()))({})`,
    ];
    for (const poc of pocs) {
      assert.throws(() => transform(parse(poc)), /forbidden/, `PoC must be rejected: ${poc}`);
    }
  });

  it('eloAdapter.parse refuses to evaluate sandbox-escape payloads', () => {
    const payload =
      `({}).constructor.constructor('return process')()`;
    assert.throws(() => defaultFormats.elo.parse(payload), /forbidden/);
  });

  // Regression: fetch() does dynamic obj[segment] lookup at runtime and
  // bypassed the transform-time denylist on meta-property names. A datapath
  // segment or string argument reaching `.constructor` / `.__proto__` /
  // `.prototype` leaks host-runtime internals.
  it('fetch() rejects a forbidden datapath segment', () => {
    assert.throws(() => transform(parse('fetch({}, .constructor)')), /forbidden/);
    assert.throws(() => transform(parse('fetch({}, .__proto__)')), /forbidden/);
    assert.throws(() => transform(parse('fetch({}, .prototype)')), /forbidden/);
  });

  it('fetch() rejects a forbidden string segment', () => {
    assert.throws(() => transform(parse(`fetch({}, 'constructor')`)), /forbidden/);
    assert.throws(() => transform(parse(`fetch({}, '__proto__')`)), /forbidden/);
  });

  it('fetch() rejects a forbidden segment inside a multi-hop datapath', () => {
    assert.throws(() => transform(parse('fetch({}, .foo.constructor)')), /forbidden/);
  });
});

/**
 * Security: the runtime sandbox escape in the JavaScript target, reported by
 * Arthur Deierlein (c0rydoras) under coordinated disclosure.
 *
 * The compile-time denylist above only sees *literal* segment names. The
 * `kFetch`/`kPatch` runtime denylist is what guards a segment computed at run
 * time — and it compared the segment against the forbidden strings with `===`,
 * which a non-string key slips past: `['constructor']` and an object with a
 * `toString` both coerce to `"constructor"` only when JavaScript performs the
 * property read, after the check has passed. Separately, an object literal
 * emitted `{__proto__: v}` with the bare key, which runs the `[[Prototype]]`
 * setter rather than creating a data property — so `{__proto__: [].map}` makes
 * an object whose prototype is a Function while still reporting `typeof
 * 'object'`, defeating kFetch's object guard. Chained:
 *
 *   fetch({__proto__: [].map}, [['constructor']])('alert(1)')()
 *
 * reached the Function constructor and ran arbitrary code. Either hole closes
 * the chain; both are fixed. JS-only: a Ruby Hash and a Python dict neither
 * coerce a non-string key nor expose a prototype chain.
 */
describe('Security - JavaScript runtime sandbox escape via fetch (c0rydoras)', () => {
  const run = (src: string): unknown =>
    compile<(input: unknown) => unknown>(src, { runtime: {} })(null);

  it('kFetch stringifies an array-coerced segment before the denylist', () => {
    // ['constructor'] coerces to "constructor" on the read; the check must see
    // the same string and return null rather than hand back the constructor.
    assert.strictEqual(run(`fetch({}, [['constructor']])`), null);
  });

  it('kFetch stringifies an object-coerced segment before the denylist', () => {
    assert.strictEqual(run(`fetch({}, [{toString: fn(~> 'constructor')}])`), null);
  });

  it('a legitimate list-shaped key still reads through', () => {
    // The fix must not break a segment that merely coerces to an ordinary key.
    assert.strictEqual(run(`fetch({ a: 7 }, [['a']])`), 7);
  });

  it('an object literal key `__proto__` is a data property, not the prototype', () => {
    const result = run(`{__proto__: 5}`) as object;
    assert.strictEqual(
      Object.getPrototypeOf(result), Object.prototype,
      '{__proto__: 5} must not set the prototype'
    );
    assert.deepStrictEqual(Object.getOwnPropertyNames(result), ['__proto__']);
    assert.strictEqual((result as Record<string, unknown>).__proto__, 5);
  });

  it('the emitted object literal uses a computed key for `__proto__`', () => {
    const code = compileToJavaScript(parse('{__proto__: 1}'));
    assert.match(code, /\[['"]__proto__['"]\]\s*:/);
  });

  it('kFetchObject does not let a `__proto__` result key pollute the output', () => {
    const result = run(`fetch({ a: 1 }, {__proto__: .a})`) as object;
    assert.strictEqual(Object.getPrototypeOf(result), Object.prototype);
  });

  it('patch cannot be driven to a meta-property key', () => {
    // patch only accepts a datapath literal (`.a.b`), whose segments the
    // compile-time denylist already guards, so the forbidden key is refused
    // before anything runs — a list path does not even type-check. The kPatch
    // runtime guard is hardened the same way as kFetch regardless, as
    // defense-in-depth for the AST-API trust boundary.
    assert.throws(() => run(`patch({}, .constructor, 1)`), /forbidden/);
    assert.throws(() => run(`patch({}, [['constructor']], 1)`), /forbidden|No signature/);
  });

  it('the full escape chain no longer reaches the Function constructor', () => {
    // After the fix, fetch returns null, so the subsequent call throws a
    // TypeError instead of constructing and running a function. The assertion
    // is that it does NOT execute — a thrown TypeError is the safe outcome.
    (globalThis as Record<string, unknown>).__eloPwned = undefined;
    assert.throws(
      () => run(`fetch({__proto__: [].map}, [['constructor']])('globalThis.__eloPwned = 1')()`),
      /is not a function|null/i
    );
    assert.strictEqual(
      (globalThis as Record<string, unknown>).__eloPwned, undefined,
      'the payload must not have executed'
    );
  });
});

/**
 * Security: member access, fetch and patch must read *data*, not the host
 * prototype chain.
 *
 * The denylist fix above blocks the seven meta-property names that reach the
 * Function constructor, but a denylist cannot name every host property. A
 * JavaScript property read walks the prototype chain, so any *other* builtin —
 * `toString`, `valueOf`, `hasOwnProperty`, `map`, `filter`, `call`, `bind` — was
 * still handed back as a live host function: `[].map` is `Array.prototype.map`,
 * `{a: 1}.toString` is `Object.prototype.toString`, and `fetch({}, 'toString')`
 * the same through the runtime path. None escalate on their own (the Function
 * constructor stays denylisted at every hop), but the security model promises
 * compiled code cannot reach host internals, and a leaked `.call`/`.bind` is the
 * foothold a future gap would build on.
 *
 * The fix is structural rather than a longer denylist: a read resolves to a
 * value only when the key is an *own* property, and otherwise to null — which
 * is what reading an absent key already means in Elo. Legitimate data is
 * unaffected, because a key the author put there is an own property and shadows
 * any namesake on the prototype. JavaScript only: a Ruby Hash and a Python dict
 * index data and never consult a prototype, so both already answer nil/None.
 */
describe('Security - member access reads data, not the host prototype (JS)', () => {
  const run = (src: string): unknown =>
    compile<(input: unknown) => unknown>(src, { runtime: {} })(null);

  const HOST_METHODS = ['toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable'];
  const ARRAY_METHODS = ['map', 'filter', 'sort', 'call', 'bind', 'apply', 'reduce'];

  for (const name of HOST_METHODS) {
    it(`{...}.${name} is null, not Object.prototype.${name}`, () => {
      assert.strictEqual(run(`{a: 1}.${name}`), null);
    });
  }

  for (const name of ARRAY_METHODS) {
    it(`[].${name} is null, not the native array method`, () => {
      assert.strictEqual(run(`[].${name}`), null);
    });
  }

  it('fetch reads an own key, never a prototype method', () => {
    assert.strictEqual(run(`fetch({}, 'toString')`), null);
    assert.strictEqual(run(`fetch({}, [['hasOwnProperty']])`), null);
    assert.strictEqual(run(`fetch([], 'map')`), null);
    assert.strictEqual(run(`fetch({a: {b: 1}}, .a.valueOf)`), null);
  });

  it('a data key that happens to share a host-method name still reads', () => {
    assert.strictEqual(run(`{map: 42}.map`), 42);
    assert.strictEqual(run(`{toString: 7}.toString`), 7);
    assert.strictEqual(run(`fetch({toString: 9}, 'toString')`), 9);
  });

  it('member access never yields a function value', () => {
    for (const src of [`[].map`, `{a: 1}.toString`, `{a: 1}.hasOwnProperty`]) {
      assert.notStrictEqual(typeof run(src), 'function', `${src} leaked a function`);
    }
  });

  it('ordinary data access is unchanged', () => {
    assert.strictEqual(run(`{a: {b: 5}}.a.b`), 5);
    assert.strictEqual(run(`{name: 'Alice'}.name`), 'Alice');
    assert.strictEqual(run(`isNull({a: 1}.missing)`), true);
  });
});

describe('Security - Subtype constraint label injection (JS/Ruby)', () => {
  // Constraint-label emission in JS (javascript.ts:313,410) and Ruby
  // single-quoted branch (ruby.ts:314) escapes only the single quote, not the
  // backslash. A label ending in `\` lets the closing `'` be treated as an
  // escaped quote; the string never terminates, and subsequent source bytes
  // are swallowed into the string literal — DoS at minimum, injectable at
  // worst. Python uses JSON.stringify and is unaffected.

  it('JS: backslash-terminated constraint label produces valid JS', () => {
    const src = "let T = Int(i | 'bad\\\\': i > 0) in T(5)";
    const code = compileToJavaScript(parse(src));
    // Parse-check the emitted JS. If the label escape is broken, `new Function`
    // throws SyntaxError.
    assert.doesNotThrow(
      () => new Function(code),
      'emitted JS must parse — constraint label must not break out of string'
    );
  });

  it('JS: backslash-terminated guard label produces valid JS', () => {
    const src = "guard(x | 'bad\\\\': x > 0)";
    const code = compileToJavaScript(parse(src));
    assert.doesNotThrow(
      () => new Function(code),
      'emitted JS must parse — guard label must not break out of string'
    );
  });

  it('Ruby: backslash-terminated guard label emits a double-quoted string with #-safe escaping', () => {
    const src = "guard(x | 'bad\\\\': x > 0)";
    const code = compileToRuby(parse(src));
    // After the fix, the label is embedded in a double-quoted Ruby string via
    // escapeRubyDQ. A single-quoted emission (the previous buggy form) would
    // have this signature:  raise '...bad\...'  — where the trailing \ before
    // the closing ' would silently swallow the quote.
    assert.ok(
      !/raise '[^']*bad[^']*'/.test(code),
      `label still emitted as single-quoted Ruby string (buggy): ${code}`
    );
  });
});

/**
 * Security: identifier-shaped IR fields must be validated at every emit site.
 *
 * GHSA #3 added assertSafeIdentifier() to the identifier emit sites known at
 * the time. The type-expression IR nodes added afterwards — the
 * subtype_constraint `variable`, the type-schema property `key`, and the
 * typedef `name` — were not covered, so an AST-API consumer (a macro or plugin
 * system that builds/edits AST JSON) could inject arbitrary code into the
 * JavaScript and Ruby output. These names always come from IDENTIFIER tokens
 * when produced by the parser, so validating them rejects no valid program.
 */
describe('Security - AST-API identifier injection (type nodes)', () => {
  const PAYLOAD = "x = 1; DANGER";

  // subtype_constraint variable — constraint deliberately does not reference the
  // binder, so the only emit of the variable is its declaration site.
  function subtypeConstraintAst() {
    const ast: any = parse('let T = Int(i | 1 > 0) in T(5)');
    ast.definitions[0].typeExpr.variable = PAYLOAD;
    return ast;
  }

  // type-schema property key
  function schemaKeyAst() {
    const ast: any = parse('let T = {a: Int} in 1');
    ast.definitions[0].typeExpr.properties[0].key = PAYLOAD;
    return ast;
  }

  // typedef name — body does not reference T, so only the binding site emits it
  function typedefNameAst() {
    const ast: any = parse('let T = {a: Int} in 1');
    ast.definitions[0].name = PAYLOAD;
    return ast;
  }

  for (const [label, make] of [
    ['subtype_constraint variable', subtypeConstraintAst],
    ['type_schema property key', schemaKeyAst],
    ['typedef name', typedefNameAst],
  ] as const) {
    it(`rejects ${label} in JavaScript`, () => {
      assert.throws(() => compileToJavaScript(make()), /Invalid/);
    });
    it(`rejects ${label} in Ruby`, () => {
      assert.throws(() => compileToRuby(make()), /Invalid/);
    });
    it(`rejects ${label} in Python`, () => {
      assert.throws(() => compileToPython(make()), /Invalid/);
    });
  }

  it('still compiles a legitimate typed program on every backend', () => {
    const src = 'let Age = Int(n | n >= 0) in let Person = {name: String, age: Age} in 1';
    assert.doesNotThrow(() => compileToJavaScript(parse(src)));
    assert.doesNotThrow(() => compileToRuby(parse(src)));
    assert.doesNotThrow(() => compileToPython(parse(src)));
  });
});

/**
 * Security: fetch() must not expose JavaScript prototype-chain members at
 * runtime, regardless of how the key is supplied.
 *
 * The compile-time denylist only inspects *literal* string keys, so a variable,
 * array literal or concatenation key (e.g. fetch(_, ['__proto__'])) slipped
 * through and the JS runtime helper kFetch did a bare current[segment], handing
 * back Object.prototype or the Object constructor. Non-object hosts (Ruby Hash,
 * Python dict) only read real keys, so this is a JavaScript-specific hole and
 * the guard belongs in kFetch itself.
 */
describe('Security - fetch() prototype-chain bypass (JS runtime)', () => {
  const vectors: Array<[string, string]> = [
    ['variable key', "let k = '__proto__' in fetch(_, k)"],
    ['array literal key', "fetch(_, ['__proto__'])"],
    ['concatenated key', "fetch(_, '__pro' + 'to__')"],
    ['constructor via array', "fetch(_, ['constructor'])"],
    ['nested __proto__/constructor', "fetch(_, ['__proto__', 'constructor'])"],
  ];

  for (const [label, expr] of vectors) {
    it(`returns null for ${label}`, () => {
      const fn = compile<any>(expr, {});
      const result = fn({ a: 1 });
      assert.strictEqual(
        result,
        null,
        `fetch must not expose a host member; got ${typeof result}: ${String(result)}`
      );
    });
  }

  it('still reads legitimate data keys', () => {
    assert.strictEqual(compile<any>("fetch(_, 'a')", {})({ a: 42 }), 42);
    assert.strictEqual(compile<any>("fetch(_, ['b', 'c'])", {})({ b: { c: 7 } }), 7);
    assert.strictEqual(compile<any>("let k = 'a' in fetch(_, k)", {})({ a: 9 }), 9);
  });
});

/**
 * Security: array multiplication must not allocate unboundedly at runtime.
 *
 * `[1] * n` is rejected statically (see transform tests), but an array can also
 * arrive as untyped data (`_ * n` where _ is a list). The JS and Python kMul
 * helpers therefore reject array operands at runtime too, so a repetition can
 * never be allocated. (JS already coerces arrays to NaN; the guard turns that
 * silent result into an explicit error.)
 */
describe('Security - array multiplication runtime guard', () => {
  it('rejects multiplying an any-typed array (JS runtime)', () => {
    const fn = compile<any>('_ * 1000000000', {});
    assert.throws(() => fn([1, 2, 3]), /Array multiplication is not supported/);
  });
});

/**
 * Security: patch() must honour the member denylist like fetch().
 *
 * patch() has no compile-time denylist check (the transform guard is
 * fetch-only), and the JS kPatch helper did a bare obj[seg] = … for any key.
 * This never achieved prototype pollution — kPatch always builds fresh copies,
 * so Object.prototype stays clean — but it let an attacker-chosen meta-property
 * name (__proto__, constructor, …) reach the write path, inconsistent with the
 * fetch() guard and the documented sandbox. kPatch now rejects such segments.
 */
describe('Security - patch() member denylist (JS runtime)', () => {
  const vectors: Array<[string, string]> = [
    ['array literal segment', "patch(_, ['__proto__', 'x'], 1)"],
    ['variable segment', "let k = 'constructor' in patch(_, [k, 'y'], 2)"],
    ['concatenated segment', "patch(_, ['__pro' + 'to__'], 1)"],
  ];
  for (const [label, expr] of vectors) {
    it(`rejects ${label}`, () => {
      const fn = compile<any>(expr, {});
      assert.throws(() => fn({ a: 1 }), /forbidden/);
    });
  }

  it('still patches legitimate keys and indices', () => {
    assert.deepStrictEqual(compile<any>("patch(_, ['b'], 2)", {})({ a: 1 }), { a: 1, b: 2 });
    assert.deepStrictEqual(compile<any>("patch(_, ['user', 'age'], 30)", {})({ user: { age: 1 } }), { user: { age: 30 } });
  });
});

/**
 * Security: the `at()` array accessor must not reach the host prototype chain.
 *
 * Reported by squ11z1 (Mykhailo Shushman) under coordinated disclosure.
 *
 * `at(array, int)` has a typed binding that indexes an array by an integer.
 * When the operand types are not statically known (a lambda parameter is
 * `any`), the stdlib dispatch fell back to that same emitter, which on the
 * JavaScript target emits a bare `x[k] ?? null`. A string key such as
 * `'constructor'` then walks the prototype chain: `at(s, 'constructor')` is
 * the String constructor, and a second hop reaches the Function constructor —
 * the classic `constructor.constructor('...')()` arbitrary-code escape, with
 * no supplied data object (a string input is enough).
 *
 * The fix adds a dynamic `at(any, any)` binding that indexes only arrays, by
 * an integer, returning null otherwise — exactly what `at` already means.
 * Ruby and Python error on the string comparison instead of leaking, and
 * neither has a Function-from-string escape; the live hole is JavaScript.
 */
describe('Security - at() inherited-member sandbox escape (JS, squ11z1)', () => {
  const run = (src: string): unknown =>
    compile<(input: unknown) => unknown>(src, {})('hello');

  it('at(x, "constructor") on a string reads no host member', () => {
    assert.strictEqual(run(`let f = fn( x ~> at(x, 'constructor') ) in f(_)`), null);
  });

  it('the at().at() -> Function constructor chain does not execute code', () => {
    const src = `let f = fn( x ~> at(at(x, 'constructor'), 'constructor') ) in (f(_))('return 42')()`;
    let result: unknown;
    try { result = compile<(i: unknown) => unknown>(src, {})('hello'); } catch { /* throwing is a safe outcome */ }
    assert.notStrictEqual(result, 42, 'arbitrary JavaScript ran through the at() constructor chain');
  });

  it('at(x, "__proto__") does not expose the prototype', () => {
    assert.strictEqual(compile<(i: unknown) => unknown>(`let f = fn( x ~> at(x, '__proto__') ) in f(_)`, {})({ a: 1 }), null);
  });

  it('the emitted dynamic at never does a bare bracket read', () => {
    // A string key must not even be spelled as `[...]` on an untyped operand.
    const code = compileToJavaScript(parse(`fn( x ~> at(x, 'constructor') )`));
    assert.doesNotMatch(code, /x\["constructor"\]/, 'dynamic at still emits a raw bracket read');
  });

  it('at still indexes arrays normally (typed and dynamic)', () => {
    assert.strictEqual(compile<(i: unknown) => unknown>(`at([10, 20, 30], 1)`, {})(null), 20);
    assert.strictEqual(compile<(i: unknown) => unknown>(`let f = fn( x ~> at(x, 1) ) in f(_)`, {})([10, 20, 30]), 20);
    assert.strictEqual(compile<(i: unknown) => unknown>(`let f = fn( x ~> at(x, 5) ) in f(_)`, {})([10, 20, 30]), null);
  });
});

/**
 * Security: the *typed* at() accessor must not reach the host prototype chain
 * under --optimize, when a declared input type is not runtime-enforced.
 *
 * Sibling of the squ11z1 at() finding above, on the path that fix did not
 * cover. squ11z1 hardened the dynamic `at(any, any)` emitter; the typed
 * `at([Int], Int)` emitter still spelled a bare `x[k] ?? null`. That emitter is
 * only chosen when the checker knows the operand types — which is exactly what
 * `--optimize` does by feeding the checker's annotations back into codegen.
 *
 * But `--input-type` (and a schema coercion in general) is a *declaration*, not
 * a runtime check: `_.i` compiles to a bare `kMember(_, 'i')` that returns the
 * raw value, with no coercion. So an attacker who controls `_` can send
 * `{ xs: [], i: 'constructor' }` against a program the author wrote and declared
 * honestly as `{ xs: [Int], i: Int }`, and the bare read `[]['constructor']`
 * hands back the Array constructor — one hop from the Function constructor and
 * arbitrary code execution. Applying a value is unchecked too, so
 * `(at(_.ctx, _.k))(_.arg)` then calls an attacker-named host member.
 *
 * The fix keeps the sandbox guard on the typed path: a bare bracket read is
 * emitted only for a compile-time-known integer index (a literal, which can
 * never name a meta-property); any runtime-supplied index goes through kAt,
 * which indexes only a real array, by an integer, and returns null otherwise.
 * JavaScript only: Ruby bounds-checks the index (and errors on the string
 * comparison) and Python already routes the typed accessor through kAt.
 */
describe('Security - typed at() sandbox escape under --optimize (type confusion)', () => {
  /** Compile on the typed path, as `eloc --optimize --input-type T` does. */
  function optimizedJs(source: string, inputTypeSrc: string): string {
    const ast = parse(source);
    const inputType = parseTypeExpr(inputTypeSrc);
    const { types, diagnostics } = typecheckWithAnnotations(ast, { inputType });
    assert.deepStrictEqual(diagnostics.map(d => d.message), [],
      'the program must typecheck, or there are no annotations to feed back');
    return compileToJavaScript(ast, { types });
  }

  /** Build and run the compiled `(function(_){...})` against a hostile input. */
  function run(source: string, inputTypeSrc: string, input: unknown): unknown {
    const code = optimizedJs(source, inputTypeSrc);
    // DateTime/Duration are the only free names a compiled JS body references.
    return new Function('DateTime', 'Duration', `return (${code});`)()(input);
  }

  it('at(_.xs, _.i) with a string index reads no host member', () => {
    assert.strictEqual(
      run('at(_.xs, _.i)', '{xs: [Int], i: Int}', { xs: [], i: 'constructor' }),
      null,
    );
    assert.strictEqual(
      run('at(_.xs, _.i)', '{xs: [Int], i: Int}', { xs: {}, i: 'constructor' }),
      null,
    );
    assert.strictEqual(
      run('at(_.xs, _.i)', '{xs: [Int], i: Int}', { xs: [], i: '__proto__' }),
      null,
    );
  });

  it('the typed at() never leaks a function value', () => {
    const leaked = run('at(_.xs, _.i)', '{xs: [Int], i: Int}', { xs: [], i: 'constructor' });
    assert.notStrictEqual(typeof leaked, 'function', 'typed at() leaked a host constructor');
  });

  it('the typed at() emits no bare bracket read of a runtime-supplied index', () => {
    const code = optimizedJs('at(_.xs, _.i)', '{xs: [Int], i: Int}');
    assert.match(code, /kAt\(/, 'a runtime-supplied index must go through the kAt guard');
    assert.doesNotMatch(code, /\)\[kMember/, 'typed at() still spells a bare bracket read');
  });

  it('the full escape-and-apply chain does not execute arbitrary code', () => {
    // A host passes a context object exposing a callable; the attacker names it.
    let pwned = false;
    const input = { ctx: { run: () => { pwned = true; return 1; } }, k: 'run', arg: 0 };
    try {
      run('(at(_.ctx, _.k))(_.arg)', '{ctx: [Int], k: Int, arg: Int}', input);
    } catch { /* a thrown TypeError (calling null) is the safe outcome */ }
    assert.strictEqual(pwned, false, 'an attacker-named host member was invoked');
  });

  it('a compile-time integer index still indexes arrays normally', () => {
    assert.strictEqual(run('at(_.xs, 1)', '{xs: [Int]}', { xs: [10, 20, 30] }), 20);
    assert.strictEqual(run('at(_.xs, 5)', '{xs: [Int]}', { xs: [10, 20, 30] }), null);
  });
});

/**
 * Security: deepMerge must treat `__proto__` as a data key, like every other
 * merge/fetch/patch path and the object literal.
 *
 * `{__proto__: x}` is a *data property* in Elo, and kFetchObject, kPatch and
 * the object-literal emitter all use Object.defineProperty to keep it one.
 * kDeepMerge did a bare `result[key] = …`, which for `__proto__` runs the
 * [[Prototype]] setter instead — so `deepMerge({a: 1}, parsedJSONWithProtoKey)`
 * repointed the *result's* prototype to attacker data rather than storing it as
 * a key. No global Object.prototype pollution (the result is a fresh copy and
 * JavaScript's setter is per-object), but a host handed the result sees an
 * attacker-controlled prototype, and Elo's own `__proto__`-is-data contract is
 * broken. JavaScript only: a Ruby Hash and a Python dict store the key as data.
 */
describe('Security - deepMerge __proto__ is a data key (JS)', () => {
  const run = (src: string, input: unknown): unknown =>
    compile<(i: unknown) => unknown>(src, {})(input);

  it('a merged __proto__ key does not repoint the result prototype', () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": 1}}');
    const result = run('deepMerge({a: 1}, _)', malicious) as object;
    assert.strictEqual(
      Object.getPrototypeOf(result), Object.prototype,
      'deepMerge must not set the result prototype from a __proto__ key'
    );
    assert.strictEqual((result as Record<string, unknown>).a, 1);
  });

  it('global Object.prototype is never polluted', () => {
    delete (Object.prototype as Record<string, unknown>).polluted;
    run('deepMerge({a: {b: 1}}, _)', JSON.parse('{"a": {"__proto__": {"polluted": 1}}}'));
    assert.strictEqual(({} as Record<string, unknown>).polluted, undefined);
  });

  it('ordinary nested deepMerge is unchanged', () => {
    assert.deepStrictEqual(
      run('deepMerge(_, {b: {y: 2}})', { a: 1, b: { x: 1 } }),
      { a: 1, b: { x: 1, y: 2 } }
    );
  });
});

/**
 * Security: arithmetic on the dynamic path must stay bounded and numeric.
 *
 * Disproportionate allocation (Medium/High per the security page). Ruby and
 * Python spell `*`, `%` and `^` with native operators whose *string / bignum*
 * overloads both diverge from JavaScript and skip the ELO_MAX_STRING_LENGTH
 * guards the typed string path enforces:
 *
 *   - `x * n` with x a String repeats it, unbounded, on the dynamic
 *     (any-typed) path — the bounded k_str_mul / kStrMul guard is wired only
 *     into the typed mul(String, Int). JavaScript returned NaN instead.
 *   - `x % n` with x a String runs sprintf, so `'%30000000d' % 1` builds a
 *     30 M-char string past the 10 M cap — and `String % x` is a compile-time
 *     type error anyway, so it has no meaning on the dynamic path either.
 *   - `a ^ b` on integers builds an exact bignum: `2 ^ 1e9` is ~125 MB on
 *     Ruby/Python from a single literal, where JavaScript's Math.pow is a
 *     float (Infinity).
 *
 * The fix: dynamic string*int does the same bounded repeat as the typed path;
 * modulo rejects a non-numeric operand; exponentiation refuses a result whose
 * bit length would exceed the cap. All three behave identically on every
 * target. JavaScript tests run in-process here; Ruby and Python are pinned by
 * the acceptance fixture reference/arith-string-op-bounds.elo.
 */
describe('Security - dynamic arithmetic allocation bounds (JS)', () => {
  const run = (src: string, input: unknown = null): unknown =>
    compile<(i: unknown) => unknown>(src, {})(input);

  it('dynamic string * int repeats, bounded like the typed path', () => {
    assert.strictEqual(run(`let f = fn( x ~> x * 3 ) in f('ab')`), 'ababab');
  });

  it('dynamic string * int past the cap is refused, not allocated', () => {
    assert.throws(() => run(`let f = fn( x ~> x * ${MAX_STRING_LENGTH} ) in f('ab')`), /limit/);
  });

  it('dynamic modulo on a string is refused, not formatted', () => {
    assert.throws(() => run(`let f = fn( x ~> x % 1 ) in f('%5d')`), /[Mm]odulo|numeric/);
  });

  it('dynamic modulo on numbers still floors', () => {
    assert.strictEqual(run(`let f = fn( x ~> x % 3 ) in f(7)`), 1);
    assert.strictEqual(run(`let f = fn( x, y ~> x % y ) in f(-7, 3)`), 2);
  });

  it('exponentiation past the bit-length cap is refused', () => {
    assert.throws(() => run(`2 ^ ${MAX_STRING_LENGTH + 1}`), /limit|exceed/i);
  });

  it('exponentiation within bounds still computes', () => {
    assert.strictEqual(run(`2 ^ 10`), 1024);
    assert.strictEqual(run(`5 ^ 1`), 5);
  });
});

/**
 * Security: SQL date/datetime/duration literals must escape the backslash.
 *
 * Reported by squ11z1 (Mykhailo Shushman) under coordinated disclosure.
 *
 * `stringLiteral` doubles the backslash and E-prefixes the result; the three
 * temporal literal emitters only doubled the single quote. A value carrying a
 * backslash — reachable through the compiler AST API, e.g. dateLiteral(...) —
 * then breaks out of the literal under `standard_conforming_strings=off`,
 * where PostgreSQL reads `\'` as an escaped quote: the doubled `''` no longer
 * closes the string and trailing bytes become SQL. Default PostgreSQL
 * (`standard_conforming_strings=on`) is not injectable, but Elo must emit a
 * literal that cannot escape under either setting, as `stringLiteral` already
 * does.
 */
describe('Security - SQL temporal literal backslash injection (squ11z1)', () => {
  const payload = `2024-01-01\\'; SELECT 424242; --`;
  const cases: Array<[string, (v: string) => unknown]> = [
    ['date', dateLiteral],
    ['datetime', dateTimeLiteral],
    ['duration', durationLiteral],
  ];

  for (const [name, make] of cases) {
    it(`${name} literal doubles the backslash so it cannot escape the quote`, () => {
      const code = compileToSQL(make(payload) as any);
      assert.ok(code.includes('\\\\'), `backslash not doubled: ${code}`);
      // No lone backslash immediately before the string-closing doubled quote.
      assert.doesNotMatch(code, /[^\\]\\''/, `raw backslash can still escape the quote: ${code}`);
    });
  }

  it('a plain temporal literal is unchanged (no needless E-prefix)', () => {
    assert.strictEqual(compileToSQL(dateLiteral('2024-01-01')), `DATE '2024-01-01'`);
  });
});

/**
 * Security: the SQL `fetch(data, {key: path})` object form must validate keys.
 *
 * Reported by squ11z1 (Mykhailo Shushman) under coordinated disclosure.
 *
 * The object-literal emitter runs every key through assertSafeIdentifier; the
 * fetch object form emitted `'${key}'` raw. A key supplied through the AST API
 * (the source parser rejects a quoted mapping key) then escaped the SQL string
 * and injected a sub-select — a single-statement read that works under default
 * `standard_conforming_strings=on`. Keys produced by the parser are always
 * IDENTIFIER tokens, so validating them rejects no valid program.
 */
describe('Security - SQL fetch object-key injection via AST (squ11z1)', () => {
  function poisonedFetchKey(key: string): any {
    const ast: any = parse('fetch(_, {name: .a})');
    ast.args[1].properties[0].key = key;
    return ast;
  }

  it('rejects a quote-bearing fetch object key', () => {
    const key = `x', (SELECT secret FROM secrets)) || jsonb_build_object('y`;
    assert.throws(() => compileToSQL(poisonedFetchKey(key)), /Invalid/);
  });

  it('rejects a stacked-statement fetch object key', () => {
    const key = `x', NULL); SELECT secret FROM secrets; --`;
    assert.throws(() => compileToSQL(poisonedFetchKey(key)), /Invalid/);
  });

  it('still compiles a legitimate fetch object form', () => {
    assert.doesNotThrow(() => compileToSQL(parse('fetch(_, {name: .a, city: .b.c})')));
  });
});

/**
 * Security: patch() array extension and replace() output must be bounded.
 *
 * Reported by squ11z1 (Mykhailo Shushman) under coordinated disclosure.
 *
 * (1) `patch([], .N, 1)` extends an array to N+1 elements. The SQL prelude did
 * it with a per-iteration JSONB concatenation (O(N^2), copying the growing
 * array each step); every target left N unbounded. A short expression could
 * thus monopolise the database or exhaust the evaluator. The array fill is now
 * bounded by the same limit as string repeat/pad, and the SQL fill is a single
 * concatenation rather than a quadratic loop.
 *
 * (2) Elo replace/replaceAll are documented as *literal*. JavaScript's
 * String.prototype.replace and Ruby's gsub interpret special markers in the
 * replacement ($&, $', \1, ...), so a replacement of `$'` ("text after the
 * match") expands the output superlinearly. The replacement must be inserted
 * verbatim; Python and SQL already do.
 */
describe('Security - patch array bound & literal replacement (squ11z1)', () => {
  it('JS patch rejects an out-of-proportion array index', () => {
    const fn = compile<(i: unknown) => unknown>(`patch([], .${MAX_STRING_LENGTH + 1}, 1)`, {});
    assert.throws(() => fn(null), /limit/);
  });

  it('JS patch still extends a reasonable array', () => {
    assert.deepStrictEqual(compile<(i: unknown) => unknown>(`patch([], .3, 7)`, {})(null), [null, null, null, 7]);
  });

  it('the SQL prelude bounds and does not quadratically grow the patch array', () => {
    assert.match(sqlPrelude, new RegExp(String(MAX_STRING_LENGTH)), 'SQL patch is not bounded');
    // The quadratic per-element `arr || 'null'` concat inside the loop is gone.
    assert.doesNotMatch(sqlPrelude, /WHILE[\s\S]*?arr\s*:=\s*arr\s*\|\|\s*'null'::jsonb/);
  });

  it('JS replaceAll inserts the replacement literally, not as a $-pattern', () => {
    // `$'` as a JS replacement means "the text after the match"; literally it
    // is the two characters $ and '. Input 'aZZZZ' -> "$'" + "ZZZZ".
    assert.strictEqual(compile<(i: unknown) => unknown>(`replaceAll(_, 'a', '$\\'')`, {})('aZZZZ'), `$'ZZZZ`);
    assert.strictEqual(compile<(i: unknown) => unknown>(`replaceAll(_, 'a', '$&')`, {})('abc'), '$&bc');
    assert.strictEqual(compile<(i: unknown) => unknown>(`replace(_, 'a', '$\\'')`, {})('aZ'), `$'Z`);
  });

  it('Ruby replace/replaceAll do not interpret backreferences in the replacement', () => {
    // sub/gsub with a string replacement interpret \1, \&, \'; the block form
    // does not. Emission must not use the two-argument string form.
    const code = compileToRuby(parse(`replaceAll(_, 'a', '$\\'')`));
    assert.doesNotMatch(code, /\.gsub\([^)]*,[^)]*\)/, `Ruby replaceAll still uses the backreference-interpreting 2-arg gsub: ${code}`);
  });
});

/**
 * Security audit follow-up (siblings of the squ11z1 reports).
 *
 * The four squ11z1 fixes each belong to a class; sweeping the compiler for
 * the same class turned up two more holes on targets the reporter did not
 * probe. Both are fixed here with the same structural approach.
 */

/**
 * [High] guard/check type AST-API code injection (Ruby).
 *
 * IRGuard.guardType is declared 'guard' | 'check', but the transform copied
 * it from the AST unchecked and the Ruby emitter interpolated it into a
 * single-quoted string: p_raise('${guardType}', ...). A guardType supplied
 * through the compiler AST API — never through the parser, which only ever
 * emits the two keywords — then broke out and injected Ruby. JS and Python
 * JSON-encode it and were safe, but the fix validates the enum in the
 * transform so every target is covered at the source.
 */
describe('Security - guard type AST-API injection (Ruby)', () => {
  function poisonedGuardType(gt: string): any {
    const ast: any = parse('guard(x | x > 0)');
    let found = false;
    (function walk(n: any) {
      if (n && typeof n === 'object') {
        if ('guardType' in n) { n.guardType = gt; found = true; }
        for (const k of Object.keys(n)) walk(n[k]);
      }
    })(ast);
    assert.ok(found, 'test setup: no guardType field to poison');
    return ast;
  }

  it('Ruby rejects a non-enum guardType instead of injecting it', () => {
    const ast = poisonedGuardType(`g'); raise('PWNED'); ('`);
    assert.throws(() => compileToRuby(ast), /guard|Invalid/i);
  });

  it('every target rejects a non-enum guardType', () => {
    for (const fn of [compileToRuby, compileToJavaScript, compileToPython]) {
      assert.throws(() => fn(poisonedGuardType(`x'; y`)), /guard|Invalid/i);
    }
  });

  it('still compiles legitimate guard and check', () => {
    assert.doesNotThrow(() => compileToRuby(parse('guard(x | x > 0)')));
    assert.doesNotThrow(() => compileToRuby(parse('let T = Int(n | n > 0) in T(5)')));
  });
});

/**
 * [Medium] SQL string repeat / padding not bounded.
 *
 * `s * n`, `padStart`, `padEnd` are capped by ELO_MAX_STRING_LENGTH on JS,
 * Ruby and Python (kRepeat / kPad), and the security page says so. The SQL
 * target emitted bare REPEAT / LPAD / RPAD, so a short expression could build
 * an arbitrarily large string on the database backend — the same unbounded
 * allocation class as the patch finding, on a shared service. The emitters now
 * call bounded prelude helpers.
 */
describe('Security - SQL string repeat/pad allocation bound', () => {
  it('repeat goes through the bounded helper, not bare REPEAT', () => {
    const code = compileToSQL(parse(`'a' * 1000000000`));
    assert.match(code, /elo_repeat\(/);
    assert.doesNotMatch(code, /\bREPEAT\(/);
  });

  it('padStart/padEnd go through bounded helpers, not bare LPAD/RPAD', () => {
    const lpad = compileToSQL(parse(`padStart('a', 1000000000, 'x')`));
    const rpad = compileToSQL(parse(`padEnd('a', 1000000000, 'x')`));
    assert.match(lpad, /elo_lpad\(/);
    assert.doesNotMatch(lpad, /\bLPAD\(/);
    assert.match(rpad, /elo_rpad\(/);
    assert.doesNotMatch(rpad, /\bRPAD\(/);
  });

  it('the prelude bounds repeat/pad by ELO_MAX_STRING_LENGTH', () => {
    assert.match(sqlPrelude, /FUNCTION elo_repeat/);
    assert.match(sqlPrelude, /FUNCTION elo_lpad/);
    assert.match(sqlPrelude, /FUNCTION elo_rpad/);
    assert.match(sqlPrelude, new RegExp(String(MAX_STRING_LENGTH)));
  });
});
