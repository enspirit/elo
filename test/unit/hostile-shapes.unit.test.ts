import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parse } from '../../src/parser';
import { transform } from '../../src/transform';
import { typecheckWithAnnotations } from '../../src/typecheck';
import { compileToJavaScript } from '../../src/compilers/javascript';
import { compileToRuby } from '../../src/compilers/ruby';
import { compileToPython } from '../../src/compilers/python';
import { compileToSQL } from '../../src/compilers/sql';

/**
 * A short input cannot crash or hang the compiler, whatever shape it is.
 *
 * This is the one compile-time property the security page states outright:
 * *"It always finishes. No expression — however deeply nested or malformed —
 * makes the compiler hang or overflow its stack"*, and *"It never crashes
 * uncontrollably. Bad input yields a typed Elo error, not an uncaught native
 * exception."*
 *
 * Five issues have violated it, each reported or found separately and each
 * fixed for its own shape:
 *
 *  - unbounded recursion in the prefix-operator, exponentiation, guard-sugar
 *    and type-definition descents (1.1.0, reported by uaaw);
 *  - type-expression nesting not counted against the depth guard in either the
 *    parser or the transform (1.1.0, reported by Atsushi Sada);
 *  - applying a value not known to be a function — the Y-combinator
 *    (1.1.0, reported by Atsushi Sada);
 *  - exponential backtracking on nested `let`/`guard`/`check`, which is a hang
 *    *within* an allowed depth so the guard never fires (1.1.1);
 *  - `pathOf` and `collectNonNullPaths` in the checker, which run on the
 *    outermost node and so overflow before the per-node guard can fire (1.2.4).
 *
 * The pattern is one shape at a time, each found by someone looking. The set of
 * shapes is enumerable, so this enumerates it: every construct that nests, at a
 * hostile size, through every stage of the compiler.
 *
 * **Nothing here is red today** — the five fixes hold, and the property is
 * genuinely met. This is a regression net rather than a discovery, which is
 * worth saying plainly: the value is that the sixth shape someone invents has
 * somewhere to go, and that a new recursive walk in `src/` is caught by a test
 * rather than by a report.
 *
 * `parser-termination.unit.test.ts` is the timing half for the 1.1.1 shape
 * specifically, with a tighter budget on fewer shapes. This is the breadth.
 */

/** Deep enough to overflow any unguarded native recursion, short enough to build fast. */
const DEPTH = 50_000;

/**
 * Generous: the slowest shape below is a 50 000-deep member chain at ~130ms
 * through all seven stages. A budget is here to catch a *hang* — the 1.1.1 bug
 * was superlinear within an allowed depth — not to police milliseconds.
 */
const BUDGET_MS = 5_000;

/**
 * Every construct that nests, at a hostile size.
 *
 * A generator rather than a literal so the size is one constant, and so that
 * "add a construct, add a line here" is the obvious thing to do. Shapes that
 * widen rather than deepen are included on purpose: a wide object is not a
 * recursion risk but it is an allocation one, and it costs nothing to ask.
 */
const SHAPES: Record<string, (n: number) => string> = {
  // Reported shapes, named so a regression points at its report.
  'prefix operators (uaaw)': n => '-'.repeat(n) + '1',
  'not chain (uaaw)': n => 'not '.repeat(n) + 'true',
  'exponentiation (uaaw)': n => '2' + ' ^ 2'.repeat(n),
  'guard sugar (uaaw)': n => '5' + ' |> guard(x | x > 0)'.repeat(n),
  'type array nesting (sada)': n => `let T = ${'['.repeat(n)}Int${']'.repeat(n)} in 1`,
  'type object nesting (sada)': n => `let T = ${'{a: '.repeat(n)}Int${'}'.repeat(n)} in 1`,
  'type union (sada)': n => `let T = ${Array(n).fill('Int').join(' | ')} in 1`,
  'nested let (1.1.1)': n => 'let a = 1 in '.repeat(n) + 'a',
  'nested guard (1.1.1)': n => 'guard true in '.repeat(n) + '1',
  'member chain (1.2.4)': n => `_${'.a'.repeat(n)}`,
  'and chain (1.2.4)': n => Array(n).fill('isNotNull(_.a)').join(' and '),

  // The rest of the constructs that nest, by inspection of the grammar.
  parens: n => '('.repeat(n) + '1' + ')'.repeat(n),
  'list nesting': n => '['.repeat(n) + '1' + ']'.repeat(n),
  'object nesting': n => '{a: '.repeat(n) + '1' + '}'.repeat(n),
  'lambda nesting': n => 'fn( x ~> '.repeat(n) + '1' + ' )'.repeat(n),
  'call nesting': n => 'abs('.repeat(n) + '1' + ')'.repeat(n),
  'if chain': n => 'if true then 1 else '.repeat(n) + '1',
  'alternative chain': n => '_.a' + ' ?? _.a'.repeat(n),
  'plus chain': n => '1' + ' + 1'.repeat(n),
  'equality chain': n => '1' + ' == 1'.repeat(n),
  'pipe chain': n => '1' + ' |> Int'.repeat(n),
  'datapath depth': n => `fetch(_, ${'.a'.repeat(n)})`,
  'mixed nesting': n => '[{a: ['.repeat(n) + '1' + ']}]'.repeat(n),
  'typedef reference chain': n =>
    `let T0 = Int${Array(n).fill(0).map((_, i) => `, T${i + 1} = [T${i}]`).join('')} in 1`,
  'subtype constraint chain': n =>
    `let T = Int(x | ${Array(n).fill('x > 0').join(' and ')}) in 1`,

  // Wide rather than deep.
  'wide object': n => `{${Array(n).fill(0).map((_, i) => `k${i}: 1`).join(', ')}}`,
  'wide list': n => `[${Array(n).fill('1').join(', ')}]`,
  'long string literal': n => `'${'a'.repeat(n)}'`,
  'many comments': n => `${Array(n).fill('# c').join('\n')}\n1`,
};

/**
 * Whether a thrown value is the compiler losing control rather than refusing.
 *
 * A `RangeError` is the native stack overflowing — the thing the depth guard
 * exists to pre-empt. Anything that mentions the call stack is the same event
 * reported differently by a different engine.
 */
function isUncontrolled(error: unknown): boolean {
  if (error instanceof RangeError) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /call stack|too much recursion|stack overflow/i.test(message);
}

/** Every stage a source passes through, in order. */
const STAGES: Array<[string, (source: string) => unknown]> = [
  ['parse', source => parse(source)],
  ['typecheck', source => typecheckWithAnnotations(parse(source))],
  ['transform', source => transform(parse(source))],
  ['javascript', source => compileToJavaScript(parse(source))],
  ['ruby', source => compileToRuby(parse(source))],
  ['python', source => compileToPython(parse(source))],
  ['sql', source => compileToSQL(parse(source))],
];

describe('A hostile shape is refused, not survived', () => {
  for (const [name, generate] of Object.entries(SHAPES)) {
    const source = generate(DEPTH);

    for (const [stage, run] of STAGES) {
      it(`${name} — ${stage}`, () => {
        const started = Date.now();
        let thrown: unknown;
        try {
          run(source);
        } catch (error) {
          thrown = error;
        }
        const elapsed = Date.now() - started;

        assert.ok(
          !thrown || !isUncontrolled(thrown),
          `${name} overflowed the native stack in ${stage} instead of being refused. `
          + 'A short input that crashes the compiler is a compile-host denial of service, '
          + 'which the security page says cannot happen. If this is a new recursive walk, '
          + `make it iterative or depth-bounded.\n\n  ${(thrown as Error)?.message}`
        );
        assert.ok(
          elapsed < BUDGET_MS,
          `${name} took ${elapsed}ms in ${stage}, over the ${BUDGET_MS}ms budget. The 1.1.1 `
          + 'bug was superlinear cost *within* an allowed depth, which no depth guard '
          + 'catches — so slow is a finding here, not a nuisance.'
        );
      });
    }
  }
});

/**
 * Non-termination in the *emitted* code, which the depth guard says nothing
 * about: the program is small and well-formed, and it is the evaluation that
 * would not stop.
 */
describe('Self-application is refused on every target', () => {
  const Y = '(let f = fn( x ~> x(x) ) in f(f))';

  for (const [target, compile] of [
    ['javascript', compileToJavaScript],
    ['ruby', compileToRuby],
    ['python', compileToPython],
    ['sql', compileToSQL],
  ] as const) {
    it(`${target} refuses the Y-combinator shape`, () => {
      assert.throws(
        () => compile(parse(Y)),
        (error: unknown) => !isUncontrolled(error),
        `${target} must refuse applying a value not known to be a function — the `
        + 'non-termination reported by Atsushi Sada and fixed in 1.1.0. Note the refusal '
        + 'comes from the emitter ("Unknown function x(Any)"), not from the transform, so '
        + 'it has to hold per target rather than once.'
      );
    });
  }
});
