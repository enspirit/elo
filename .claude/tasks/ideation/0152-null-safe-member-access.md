## Problem to solve

Member access is inconsistent: a missing key is safe, a null receiver is not.

```elo
{}.budget        # null  — safe
_.a.b            # TypeError when _.a is null
first([]).id     # TypeError
```

Because the TypeError is raised before anything else runs, the alternative
operator never gets a turn: `first([]).id | 'default'` throws too. So there is
no way to express "read this, and accept that it may not be there" without
wrapping every read in `if count(x) > 0 then … else …`.

## Context

Reported by Bricks from production (`.claude/tasks/analyzed/bricks-requests-original.md`,
point 1), who call it their most expensive: 90 failed runs in 30 days across
4 of their 35 organisations. Verified against main on 2026-10-31.

They suggest a `first_or(list, default)`. That is additive and safe, but it
leaves the inconsistency in place and only covers `first`.

## Proposal

Make member access on null yield null, so that null propagates through a chain
instead of stopping it. Then:

```elo
first([]).id            # null
first([]).id | 'none'   # 'none'
```

Nothing new to learn, no new function, and `|` becomes sufficient. SQL
propagates null the same way, and `{}.budget` already does — this makes the
rule uniform rather than introducing one.

## To decide

- Does null propagate through **calls** too, or only member access?
  `upper(null)` currently fails; should it?
- Does it hide genuine typos? `_.custmer.name` becomes null instead of
  throwing. Against: the key-not-found case already returns null today, so
  that exposure exists regardless.
- Four targets: JavaScript has `?.`, Ruby has `&.`, Python needs a helper, SQL
  propagates natively. Emission cost is low everywhere.
