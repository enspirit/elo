import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parse } from '../../src/parser';
import { transform } from '../../src/transform';
import { typecheckWithType } from '../../src/typecheck';

/**
 * The parser must finish, on any input.
 *
 * `in` is overloaded: it ends a `let`, `guard` or `check` binding, and it is
 * the range membership operator (`x in 1..10`). The two were told apart by
 * speculatively parsing a range and backtracking on failure — and that
 * speculation parsed the whole remaining expression. On nested bindings each
 * level therefore parsed its body twice, once to fail and once for real, so
 * cost doubled per level:
 *
 *     let a = 1 in …  ×18   234 chars      273 ms
 *     let a = 1 in …  ×22   286 chars    3 753 ms
 *     let a = 1 in …  ×30   390 chars    never finished
 *
 * A short input that hangs the compiler is a compile-host denial of service,
 * which the security model treats as always-fix (§2.1: parsing always
 * terminates). The depth guard did not help: the cost is exponential *within*
 * an allowed depth.
 */
describe('Parser - termination on nested bindings', () => {
  /** Generous enough not to be flaky, tight enough to catch a regression. */
  const BUDGET_MS = 2000;

  function timeParse(source: string): number {
    const started = Date.now();
    try {
      parse(source);
    } catch {
      // A depth-guard rejection is a fine outcome; the point is that it is
      // reached quickly rather than after exponential work.
    }
    return Date.now() - started;
  }

  const shapes: Array<[string, string, string]> = [
    ['let', 'let a = 1 in ', 'a'],
    ['guard', 'guard true in ', '1'],
    ['check', 'check true in ', '1'],
  ];

  for (const [name, prefix, body] of shapes) {
    it(`parses 40 nested ${name} bindings promptly`, () => {
      const elapsed = timeParse(prefix.repeat(40) + body);
      assert.ok(elapsed < BUDGET_MS, `took ${elapsed}ms, budget ${BUDGET_MS}ms`);
    });

    it(`parses 80 nested ${name} bindings promptly`, () => {
      // Twice the nesting must not be exponentially more work. Before the fix
      // this never completed.
      const elapsed = timeParse(prefix.repeat(80) + body);
      assert.ok(elapsed < BUDGET_MS, `took ${elapsed}ms, budget ${BUDGET_MS}ms`);
    });
  }

  it('parses alternating let and guard nesting promptly', () => {
    const elapsed = timeParse('let a = 1 in guard true in '.repeat(30) + 'a');
    assert.ok(elapsed < BUDGET_MS, `took ${elapsed}ms, budget ${BUDGET_MS}ms`);
  });

  it('parses a long chain of pipe guards promptly', () => {
    // `guard(x | …)` is told from `guard … in …` by three tokens of lookahead
    // rather than by parsing the pipe form and backtracking. A look costs the
    // same whatever follows it, so a chain of them is linear.
    const elapsed = timeParse('5' + ' |> guard(x | x > 0)'.repeat(200));
    assert.ok(elapsed < BUDGET_MS, `took ${elapsed}ms, budget ${BUDGET_MS}ms`);
  });

  it('stays prompt when a real range is present', () => {
    // The speculation is still attempted where a range could genuinely follow,
    // so this is the case that must not have been made slow by the fix.
    const elapsed = timeParse('let a = 1 in '.repeat(40) + '5 in 1..10');
    assert.ok(elapsed < BUDGET_MS, `took ${elapsed}ms, budget ${BUDGET_MS}ms`);
  });
});

/**
 * The compiler must reject a hostile-depth member chain with its depth guard,
 * not crash the host with a stack overflow.
 *
 * `_.a.a.a…` parses iteratively (the parser is flat here), so a chain of any
 * length produces an AST the depth guard should refuse at 100. But `pathOf`,
 * which the transform and the checker call on a member expression to build its
 * dotted path, recursed on `.object` with no bound — and it runs on the
 * outermost node, over the *whole* chain, before the per-node depth guard can
 * fire. A ~20k-deep chain therefore overflowed the native stack with a
 * `RangeError` instead of the controlled "depth exceeded" rejection. A short
 * input that crashes the compiler is a compile-host denial of service, which
 * the security model treats as always-fix.
 */
describe('Compiler - termination on deep member chains', () => {
  const deepChain = '_' + '.a'.repeat(50000);

  function rejection(run: () => void): Error {
    try {
      run();
    } catch (e) {
      return e as Error;
    }
    throw new assert.AssertionError({ message: 'expected a rejection, got none' });
  }

  it('transform refuses a deep member chain via the depth guard, not a stack overflow', () => {
    const err = rejection(() => transform(parse(deepChain), new Map(), new Set(), {}));
    assert.ok(!(err instanceof RangeError), `stack overflow instead of a controlled rejection: ${err.message}`);
    assert.match(err.message, /depth exceeded/i);
  });

  it('the checker refuses a deep member chain via the depth guard, not a stack overflow', () => {
    const { diagnostics } = typecheckWithType(parse(deepChain), {});
    // The checker reports rather than throws; it must report the depth guard
    // and must not have crashed on the way.
    assert.ok(
      diagnostics.some(d => /depth exceeded/i.test(d.message)),
      `expected a depth-guard diagnostic, got: ${diagnostics.map(d => d.message).join('; ')}`
    );
  });

  // Null-narrowing walks the whole `&&` condition of an `if`/guard to collect
  // the paths it proves non-null, and that walk (collectNonNullPaths) recursed
  // on `&&` with no bound. A long `isNotNull(a) and isNotNull(a) and …` chain
  // therefore overflowed the stack before the depth guard could reject it.
  const deepAnd = 'if ' + 'isNotNull(_.a) and '.repeat(40000) + 'isNotNull(_.b) then 1 else 2';

  it('transform refuses a deep && condition via the depth guard, not a stack overflow', () => {
    const err = rejection(() => transform(parse(deepAnd), new Map(), new Set(), {}));
    assert.ok(!(err instanceof RangeError), `stack overflow instead of a controlled rejection: ${err.message}`);
    assert.match(err.message, /depth exceeded/i);
  });

  it('the checker refuses a deep && condition via the depth guard, not a stack overflow', () => {
    const { diagnostics } = typecheckWithType(parse(deepAnd), {});
    assert.ok(
      diagnostics.some(d => /depth exceeded/i.test(d.message)),
      `expected a depth-guard diagnostic, got: ${diagnostics.map(d => d.message).join('; ')}`
    );
  });
});

describe('Parser - range membership is unchanged', () => {
  /**
   * The fix skips the range speculation only where it could never have
   * succeeded. These pin the behaviour it must not have changed — verified
   * against the pre-fix parser over 1372 expressions, of which 1368 were
   * byte-identical and the other 4 were rejected by both.
   */
  function parses(source: string): boolean {
    try {
      parse(source);
      return true;
    } catch {
      return false;
    }
  }

  it('still parses a plain range membership', () => {
    assert.ok(parses('5 in 1..10'));
    assert.ok(parses('5 in 1...10'));
    assert.ok(parses('5 not in 1..10'));
  });

  it('still parses a range as a let-binding value', () => {
    // The `in` here is range membership, not the end of the binding — which
    // is exactly why the speculation exists and cannot simply be removed.
    assert.ok(parses('let x = 5 in 1..10 in x'));
    assert.deepStrictEqual(parse('let x = 5 in 1..10 in x'), parse('let x = (5 in 1..10) in x'));
  });

  it('still parses a range starting with a parenthesised let', () => {
    assert.ok(parses('5 in (let a = 1 in a) .. 10'));
  });

  it('still parses a range starting with an if', () => {
    // `if` is not skipped: its else-branch does not swallow the `..`, so it
    // can legitimately start a range.
    assert.ok(parses('5 in if true then 1 else 2 .. 10'));
  });

  it('still rejects a range starting with a bare let or guard', () => {
    // Rejected before the fix too — the binding body swallows the `..`, so
    // the range can never be completed.
    assert.ok(!parses('5 in let a = 1 in a .. 10'));
    assert.ok(!parses('5 in guard true in 1 .. 10'));
  });

  it('still parses ranges over non-literal bounds', () => {
    assert.ok(parses('x in a..b'));
    assert.ok(parses('5 in f(1)..g(2)'));
    assert.ok(parses('TODAY in SOW...EOW'));
  });
});
