## Problem to solve

`substring(s, position, length)` reads as `(start, end)` to most people.

```elo
substring('abcdef', 1, 3)   # 'bcd' — position 1, length 3
                            # read as (start, end) you expect 'bc'
```

Both readings return a valid string, so neither Elo nor the author can
notice. There is no failure to repair.

## Context

Reported by Bricks (point 4) as one of exactly two places where they produced
a wrong result without knowing — their words: "C'est le seul endroit où on a
produit un résultat faux sans le savoir". Verified against main on 2026-10-31.

The semantics cannot change: every existing caller would break silently, which
is the same defect pointed the other way.

## Proposal, in order of preference

1. **Fix the discoverability.** The stdlib page shows `substring(s, start, n)`
   with no parameter names in sight. Spelling the signature
   `(s: String, position: Int, length: Int)` on the page, with an example that
   makes the second number obviously a length, is the whole fix and costs
   nothing.
2. **Add `slice(s, start, end)`** beside it, which is what callers reach for,
   and document the two as a pair so the difference is visible at the point of
   choosing.
3. Deprecate and rename — too expensive against code already in production.

1 and 2 are not exclusive and 1 should happen regardless.
