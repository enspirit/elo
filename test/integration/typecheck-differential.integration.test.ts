import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../../src/parser';
import { typecheck } from '../../src/typecheck';
import { BUILTIN_TYPE_NAMES } from '../../src/typecheck';
import { BUILTIN_TYPE_SELECTORS } from '../../src/transform';
import { eloTypeDefs, parseSignatureKey } from '../../src/typedefs';
import { compileToJavaScript } from '../../src/compilers/javascript';
import { compileToRuby } from '../../src/compilers/ruby';
import { compileToPython } from '../../src/compilers/python';

/**
 * The property that makes the checker worth trusting:
 *
 *   **If the checker is silent, every compiler accepts the program.**
 *
 * A checker that blesses a program the compiler then refuses is worse than no
 * checker at all — it gives false confidence, and the author discovers the
 * problem one step later with a worse message. So this walks a corpus built
 * mechanically from the signature table, compiles each expression for every
 * target, and fails on any expression the checker passed and a compiler
 * refused.
 *
 * Written after a differential run found 336 such expressions in four
 * categories, all now fixed:
 *
 *  - `merge`/`deepMerge`/`assert` were declared on `Any` in typedefs.ts, which
 *    made every concrete instantiation type-check while Python implements only
 *    the concrete signatures. A signature on `Any` is a promise that *every*
 *    instantiation works, and nothing was checking that.
 *  - `extract` is validated structurally by the transform (the template must
 *    be a string literal and must parse), which the checker did not mirror.
 *  - `*` on a list is rejected outright by the transform, which the checker
 *    did not mirror.
 *  - `Duration` and `Data` were accepted by the checker as schema types and
 *    rejected by the transform.
 *
 * The reverse direction — the checker reporting something all compilers accept
 * — is *not* a failure. It is the entire point: `1 + 'a'` compiles on all four
 * targets and gives "1a" on JavaScript while Ruby and Python raise. Those are
 * counted and reported, not asserted against.
 */

const LITERAL: Record<string, string> = {
  int: '1',
  float: '1.5',
  bool: 'true',
  string: "'a'",
  null: 'null',
  date: 'D2020-01-01',
  datetime: 'D2020-01-01T00:00:00Z',
  duration: 'P1D',
  array: '[1]',
  object: '{a: 1}',
  fn: 'fn(x ~> x)',
  interval: 'Interval({start: NOW, end: NOW})',
  any: '_',
};
const KINDS = Object.keys(LITERAL);

/** Operators whose signatures are type-sensitive (comparisons accept anything). */
const OPERATORS = ['+', '-', '*', '/', '%', '^', '&&', '||'];

function buildCorpus(): string[] {
  const exprs = new Set<string>();

  // Every stdlib name at each arity it declares, over every type combination.
  const arities = new Map<string, { name: string; arity: number }>();
  for (const key of eloTypeDefs.signatureKeys()) {
    const { name, argTypes } = parseSignatureKey(key);
    arities.set(`${name}/${argTypes.length}`, { name, arity: argTypes.length });
  }
  for (const { name, arity } of arities.values()) {
    if (arity === 0) {
      exprs.add(`${name}()`);
    } else if (arity === 1) {
      for (const t of KINDS) exprs.add(`${name}(${LITERAL[t]})`);
    } else if (arity === 2) {
      for (const a of KINDS) for (const b of KINDS) exprs.add(`${name}(${LITERAL[a]}, ${LITERAL[b]})`);
    } else {
      // Sampled: the full product at arity 3+ would dominate the corpus
      // without adding categories.
      for (const a of KINDS) {
        for (const b of ['int', 'string', 'any']) {
          exprs.add(`${name}(${LITERAL[a]}, ${LITERAL[b]}, ${LITERAL[b]})`);
        }
      }
    }
  }

  for (const op of OPERATORS) {
    for (const a of KINDS) for (const b of KINDS) exprs.add(`${LITERAL[a]} ${op} ${LITERAL[b]}`);
  }
  for (const t of KINDS) {
    exprs.add(`-${LITERAL[t]}`);
    exprs.add(`!${LITERAL[t]}`);
  }

  return [...exprs];
}

const targets: Array<[string, (ast: ReturnType<typeof parse>) => string]> = [
  ['javascript', compileToJavaScript],
  ['ruby', compileToRuby],
  ['python', compileToPython],
];

describe('Typecheck - silence means every compiler accepts', () => {
  const corpus = buildCorpus();

  it('builds a corpus worth calling one', () => {
    assert.ok(corpus.length > 5000, `corpus is only ${corpus.length} expressions`);
  });

  it('never passes an expression a compiler refuses', () => {
    const gaps: string[] = [];

    for (const source of corpus) {
      let ast;
      try {
        ast = parse(source);
      } catch {
        continue; // not a parseable program; not the checker's business
      }

      let diagnostics;
      try {
        diagnostics = typecheck(ast);
      } catch (error) {
        gaps.push(`${source}\n    the checker threw: ${(error as Error).message}`);
        continue;
      }
      if (diagnostics.length > 0) continue;

      for (const [target, compile] of targets) {
        try {
          compile(ast);
        } catch (error) {
          gaps.push(`${source}\n    ${target} refused: ${(error as Error).message.slice(0, 90)}`);
        }
      }
    }

    assert.deepStrictEqual(
      gaps.slice(0, 20),
      [],
      `the checker passed ${gaps.length} expression(s) a compiler refuses. Either ` +
      `typedefs.ts declares a signature a target cannot emit, or the checker is ` +
      `missing a structural rule the transform enforces.`
    );
  });

  it('reports plenty that the compilers accept in silence', () => {
    // The other direction, as a measurement rather than a constraint: these
    // are the programs that compile everywhere and then behave differently per
    // target, which is what the checker exists to catch. If this ever dropped
    // to nothing, the checker would have stopped doing its job.
    let reported = 0;
    for (const source of corpus) {
      let ast;
      try {
        ast = parse(source);
      } catch {
        continue;
      }
      if (typecheck(ast).length === 0) continue;
      const allCompile = targets.every(([, compile]) => {
        try {
          compile(ast);
          return true;
        } catch {
          return false;
        }
      });
      if (allCompile) reported++;
    }
    assert.ok(reported > 500, `only ${reported} silently-accepted programs are reported`);
  });
});

describe('Typecheck - type names match the transform', () => {
  it('accepts exactly the type names the transform accepts', () => {
    // A name the checker accepts and the transform rejects means --typecheck
    // passes and compilation fails, which is the failure mode this whole suite
    // exists to prevent. Duration and Data belong to both lists or to neither
    // (see .claude/tasks/todo/0093).
    assert.deepStrictEqual(
      [...BUILTIN_TYPE_NAMES].sort(),
      [...BUILTIN_TYPE_SELECTORS].sort()
    );
  });
});
