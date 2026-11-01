# Parser blows up exponentially on nested `let … in`

**FIXED** — commit `e71723b`, as the first commit of the `type-checker` branch so
it sits directly on `main` and can ship on its own.

**Found while building the type checker (branch `type-checker`). Pre-existing on
`main` — reproduced on `main` with the type-checker work stashed.**

## Severity

Per the security model (`analyzed/security-model-refinement.md` §2.1 property 1
and §4): *"Compile-time termination / crash: any input (source or AST) that
makes `parse`/`compile`/`compileTo*` hang … Severity: High. Always in scope."*

This is that bug. A **short** input hangs the compile host.

## Reproduction

```js
const { parse } = require('./dist/src/parser');
parse('let a = 1 in '.repeat(n) + 'a');
```

Measured on `main`:

| n | source length | parse time |
|---|---|---|
| 8 | 108 chars | 3 ms |
| 12 | 156 chars | 16 ms |
| 14 | 182 chars | 41 ms |
| 16 | 208 chars | 76 ms |
| 18 | 234 chars | 273 ms |
| 22 | 286 chars | 3 753 ms |
| 30 | 390 chars | does not finish |

Roughly ×4 per two levels — O(2^n). The existing `maxDepth` guard does not help:
it bounds *depth*, and the cost here is exponential *within* an allowed depth
(the default limit is 100).

## Root cause

`in` is overloaded: it terminates a `let` (`let x = 1 in body`) and it is the
range-membership operator (`5 in 1..10`). The ambiguity is resolved by
unbounded speculative parsing.

- `letExpr()` (`src/parser.ts:1112`) parses each binding value with
  `this.pipe()`.
- `pipe()` descends to `comparison()` (`src/parser.ts:860`), which on seeing
  `IN` calls `tryParseRangeMembership()` (`src/parser.ts:1031`).
- That saves state, eats `IN`, and calls `this.addition()` — which parses the
  **entire remaining body**, including a nested `let`, recursively.
- Finding no `..` / `...` it restores state and returns `null`, throwing all
  that work away. The body is then parsed again for real.

So every nesting level parses its suffix twice: once speculatively, once for
real. 2^n.

## Fix chosen

Option 2, in spirit: do not start a speculation that cannot succeed. A range
start can never be an unparenthesised `let`, `guard` or `check` — the body of
each runs to the end and swallows the `..` — so seeing one of those tokens
straight after `in` means the `in` belongs to the binding. Skipping there is
exactly the expensive case, and nesting becomes linear: 40 levels parse in 3 ms
and 80 levels, which never finished, are instant.

Option 1 was rejected: `let x = 5 in 1..10 in x` parses today, so an `in` in a
binding value really can be range membership, and a context flag would have
changed what parses. For a fix meant to ship on its own that is not acceptable.

Semantics were verified unchanged by running the old and new parsers over 1372
expressions — every fixture line, every website example, and generated programs
stressing the ambiguity. 1368 byte-identical; the other 4 are rejected by both,
differing only in the error message, and the new one points at the `in` rather
than at the end of input.

`guard`/`check` nesting had the same blowup (1128 ms at 20 levels) and is fixed
by the same change, as suspected below.

## Release

The fix touches `src/parser.ts` only and is independent of everything else on
the branch. The same bug is present on `release-1.0.2` (1020 ms at 20 levels)
and the commit cherry-picks onto it cleanly, so 1.1.1 and a 1.0.3 backport are
both available. Releasing is not done here.

## Fix options (considered)

1. **Remove the ambiguity with context, no backtracking.** Track "we are
   parsing a let-binding value" (a counter, like `descend`'s depth) and have
   `comparison()` skip the range attempt when set, since `in` there always
   terminates the binding. Cheapest and makes the grammar honest, but needs
   care: `let x = 5 in 1..10 in x` would change meaning — check whether that is
   even legal today.
2. **Bound the lookahead.** A range can only follow `in` as
   `<addition> .. <addition>`; scan the token stream for `..`/`...` before the
   next `in`/`)`/`,` and only then attempt the parse. Keeps the grammar as is,
   turns the speculation into an O(1)-ish check.
3. **Memoize** `addition()` by lexer position (packrat). Fixes the whole class
   of backtracking blowups, not just this one, but adds machinery.

Option 2 is the smallest change that removes the exponential; option 1 is the
one that makes the grammar unambiguous. Worth checking with the `grammarian`
skill whether the `let … in` / `x in range` overload should survive at all.

## Tests to add

- A unit test that `parse('let a = 1 in '.repeat(40) + 'a')` completes well
  inside a time bound — the kind of assertion that would have caught this.
- Check the other speculative sites for the same shape:
  `tryParsePipeGuard`/`tryParsePipeGuardBody` (`src/parser.ts:1479`, `:1490`,
  `:1822`) and `parseConstraint` (`:1342`) all save/restore state; only the
  last is bounded lookahead. `guard`/`check` nesting may blow up the same way —
  measure before assuming it does not.

## Note

The type checker's own robustness test had to avoid 40 nested `let`s because of
this, which is how it surfaced. That case is restored.
