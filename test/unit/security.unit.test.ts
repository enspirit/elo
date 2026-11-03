import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileToRuby, compileToJavaScript, compileToSQL, compileToPython, compile } from '../../src/index';
import { dateLiteral, dateTimeLiteral, durationLiteral } from '../../src/ast';
import { parse } from '../../src/parser';
import { transform } from '../../src/transform';
import { defaultFormats } from '../../src/formats';

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
 * The fix uses JSON.stringify (JS/Ruby) and single-quote doubling (SQL) so
 * the malicious payload stays inside the string boundary.
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
        `(function(_) { return DateTime.fromISO("'+process.exit(1)+'"); })`
      );
    });

    it('datetime_literal for JavaScript', () => {
      assert.strictEqual(
        compileToJavaScript(dateTimeLiteral(sqInjection)),
        `(function(_) { return DateTime.fromISO("'+process.exit(1)+'"); })`
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
        '(function(_) { return DateTime.fromISO("\\"+process.exit(1)+\\""); })'
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
