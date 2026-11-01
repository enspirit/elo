import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../../src/parser';
import { BUILTIN_TYPE_SELECTORS } from '../../src/transform';
import { compileToJavaScript } from '../../src/compilers/javascript';
import { compileToRuby } from '../../src/compilers/ruby';
import { compileToPython } from '../../src/compilers/python';

/**
 * Every name admitted as a schema type must have a parser behind it, in every
 * target that supports schemas.
 *
 * `BUILTIN_TYPE_SELECTORS` in transform.ts is the parse-time allowlist, and
 * each compiler keeps its own map from those names to runtime parser helpers.
 * Nothing kept the two in step, and both directions had gone wrong:
 *
 *  - `Duration` and `Data` were documented as schema types, had parser helpers
 *    ready in the JavaScript and Ruby runtimes, and were missing from the
 *    allowlist — so `{ d: Duration }` was rejected outright.
 *  - `Interval` was on the allowlist with no parser anywhere, so
 *    `{ i: Interval }` compiled to a call to an undefined `_p_Interval` and
 *    failed at runtime. Emitting broken code is worse than refusing it, which
 *    is why it was taken off the list rather than left there.
 *
 * This test closes both directions at once: a name on the list must compile to
 * something every target can actually run.
 */

const targets: Array<[string, (ast: ReturnType<typeof parse>) => string]> = [
  ['javascript', compileToJavaScript],
  ['ruby', compileToRuby],
  ['python', compileToPython],
];

/**
 * SQL has no type definitions at all, so schemas never reach it.
 */
describe('Schema types - every admitted name has a parser', () => {
  for (const name of BUILTIN_TYPE_SELECTORS) {
    for (const [target, compile] of targets) {
      it(`${name} compiles to a real parser on ${target}`, () => {
        const ast = parse(`let X = { f: ${name} } in _ |> X`);
        const code = compile(ast);

        // A name with no entry in the compiler's parser map falls through to
        // the user-defined-type path and emits a reference to a parser that
        // was never defined. That compiles and then fails at runtime, which is
        // exactly what must not happen.
        assert.ok(
          !new RegExp(`_p_${name}\\b`).test(code),
          `${target} emits a reference to an undefined _p_${name}: ${name} is ` +
          `on the allowlist in transform.ts but missing from the parser map in ` +
          `src/compilers/${target}.ts`
        );
      });
    }
  }

  it('admits the names the documentation promises', () => {
    // The reference page and the README both say these are usable as schema
    // types. Keeping the assertion here means the docs cannot drift from the
    // implementation unnoticed.
    for (const name of ['Int', 'Float', 'Bool', 'String', 'Null', 'Date', 'Datetime', 'Duration', 'Data']) {
      assert.ok(BUILTIN_TYPE_SELECTORS.has(name), `${name} should be a schema type`);
    }
  });

  it('refuses a name it has no parser for, rather than emitting broken code', () => {
    // Interval is the case in point: it is a selector *function*, not a schema
    // type, until someone writes the parser for it.
    assert.ok(!BUILTIN_TYPE_SELECTORS.has('Interval'));
    assert.throws(() => parse('let X = { i: Interval } in _ |> X') && compileToJavaScript(parse('let X = { i: Interval } in _ |> X')),
      /Unknown type selector: 'Interval'/);
  });
});
