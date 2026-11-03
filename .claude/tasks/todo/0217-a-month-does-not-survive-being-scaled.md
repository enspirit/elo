# A month does not survive being scaled, or subtracted from another duration

> Found while fixing 0216 (adding a month was thirty days on Python). That task
> made `date + P1M` a calendar month on all four targets. The month component
> is still lost on some targets as soon as the duration goes through an
> operator *other* than adding it to a date.

## Symptom

Three expressions, each asserted against the answer calendar arithmetic gives:

```elo
assert(D2026-03-01 + P1M * 2 == D2026-05-01)
assert(D2026-03-01 + -1 * P1M == D2026-02-01)
assert(D2026-01-31 + (P1M - P10D) == D2026-02-18)
```

| | JS | Ruby | SQL | Python |
| --- | --- | --- | --- | --- |
| `+ P1M * 2` | ✗ `04-30` | ✓ | ✓ | ✗ `04-30` |
| `+ -1 * P1M` | ✗ `01-30` | ✓ | ✓ | ✗ `01-30` |
| `+ (P1M - P10D)` | ✗ `02-20` | ✓ | ✓ | ✓ |

So on scaling, two targets out of four turn the month into thirty days; on
duration subtraction, JavaScript alone does.

## Where it comes from

Both are the same shape — an operator that rebuilds the duration from a
millisecond total, which has no month in it any more.

* `src/bindings/javascript.ts`: `mul` and `div` on a duration emit
  `Duration.fromMillis(x.toMillis() * n)`. Luxon's `toMillis` counts a month
  as thirty days.
* There is no `sub(Duration, Duration)` registered on JavaScript at all —
  `add` is, `sub` is not — so it falls through to the dynamic `kSub`, which is
  also `Duration.fromMillis(...)`. This is why `P1M - P10D` collapses there but
  `P1M + P1D` does not.
* `src/runtime.ts`, Python's `EloDuration.scale` / `divide` / `negate`: they
  return `EloDuration(self.to_ms() * n)`, dropping the year and month
  components that 0216 introduced. That was deliberate — it kept Python's
  answer identical to JavaScript's rather than inventing a third one — and it
  is the half of 0216 that is still wrong.

## What it should be

A month scaled by an integer is that many calendar months, and a duration
minus a duration keeps both their components. That is what Ruby and SQL
already do, and it is the only answer consistent with `date + P1M` being a
calendar month.

Division is a separate question and does **not** have an agreed answer today:
`P1M / 2` is 15 days on SQL and JavaScript, and 15.21 days on Ruby
(a month being 30.436875 days there). Half a calendar month does not mean
anything, so collapsing to milliseconds on division is defensible — but pick
it deliberately and pin it, rather than leaving three behaviours.

## Tests

The three assertions above, in `test/fixtures/`, seen red on JavaScript and
Python first. Then the ones 0216 could not add because JavaScript was the
blocker:

- `assert(D2026-03-01 + (P2M - P1M) == D2026-04-01)` — already green on Ruby,
  SQL and Python ; JavaScript is the only blocker
- `assert(D2026-03-01 + (-P1M) == D2026-02-01)`
- `assert(D2026-03-01 + P1M1D * 2 == D2026-05-03)`

All three are green on Ruby and SQL today, which is what they are pinned to.

and the dynamic twins, since `kMul` and `kSub` are the path a lambda takes.
