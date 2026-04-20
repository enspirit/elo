import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileToRuby, compileToJavaScript, compileToSQL } from '../../src/index';
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
