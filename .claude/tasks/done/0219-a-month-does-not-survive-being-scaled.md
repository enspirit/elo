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

## Implemented

Fixed for `*` and `-`. Division is pulled out as todo/0220, because measuring
it showed the task's premise was incomplete: `inDays(P1Y / 2)` is 182.5 on
JavaScript, Ruby and Python and **180** on PostgreSQL, which divides the
calendar components (`interval '1 year' / 2` is `6 mons`). So there are three
coherent rules, not a choice between two, and the nominal length of a month is
a per-target accident underneath all of them — Ruby's month is 30.436875 days
where everyone else's is 30. That is a decision, not a patch.

The rule as shipped: an integer scales each component, so `P1M * 2` is two
calendar months; subtraction keeps both operands' components; multiplying by a
fraction or dividing collapses to the nominal length, where a month is 30 days.
The dynamic path checks for a whole number at runtime, so `kMul` agrees with
the typed emission.

- `src/bindings/javascript.ts`: `mul(Int, Duration)` and `mul(Duration, Int)`
  emit `.mapUnits(u => u * n)` instead of rebuilding from `toMillis()`, and
  `sub(Duration, Duration)` is registered at all — it was not, which is why
  `P1M - P10D` collapsed where `P1M + P1D` did not.
- `src/runtime.ts`: `kAdd`, `kSub` and `kMul` use Luxon's component arithmetic;
  `kMul` falls back to the nominal length for a non-integer factor. Python's
  `EloDuration.scale` and `negate` carry the year and month components.

Ruby and PostgreSQL were already right and are untouched.

### Red first

`test/fixtures/stdlib/date/temporal-month-operators.elo`, 20 assertions:

| | JS | Ruby | Python | SQL |
| --- | --- | --- | --- | --- |
| before | 16 red | 0 | 11 red | 0 |
| after | 0 | 0 | 0 | 0 |

`reference/dynamic-temporal-dispatch.elo` gained 5 dynamic assertions and 2
typed twins: 7 red on JavaScript, 3 on Python, 0 on Ruby and SQL.

The blast radius of regenerating is the three helper bodies (`kAdd`, `kSub`,
`kMul` are inlined per program, so every fixture that reaches the dynamic path
shows the new text) and the typed duration `mul`/`sub` emission. Nothing else
moved. Two unit tests in `temporal.unit.test.ts` pinned the old `mul` emission
and now pin the new one.

Note for the next person: `regenerate-fixtures.sh` only writes targets that
already have an `.expected.*` file, so a brand-new fixture needs
`-t js,ruby,sql,python` or it is silently absent from the suite. It was, until
the per-target counts failed to go up.

### Not done

`-P1M` is still a parse-and-refuse: `neg(Duration)` has no signature, so the
task's suggested `D2026-03-01 + (-P1M)` is not Elo today. `-1 * P1M` is the
form that works and is asserted. Unary minus on a duration is an addition to
the language rather than part of this fix.
