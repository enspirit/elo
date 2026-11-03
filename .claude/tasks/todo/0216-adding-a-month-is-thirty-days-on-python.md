# Adding a month to a date is thirty days on Python

> Found by running one program in three targets and comparing — the same way
> the nine defects of 1.1.0 were found. It was invisible until a program that
> did date arithmetic was actually *executed* outside JavaScript rather than
> merely compiled.

## Symptom

```elo
assert(D2026-03-01 + P1M == D2026-04-01)
assert(D2026-03-01 + P2M == D2026-05-01)
```

| Target | `+ P1M` | `+ P2M` |
| --- | --- | --- |
| JavaScript | `2026-04-01` | `2026-05-01` |
| Ruby | `2026-04-01` | `2026-05-01` |
| **Python** | **`2026-03-31`** | **`2026-04-30`** |
| SQL | refuses lambdas before reaching this | — |

March has 31 days, and 1 March plus thirty days is 31 March. Two months gives
30 April, which is sixty days. Python is adding **thirty days per month**
instead of doing calendar arithmetic.

The neighbouring cases are all right, which narrows it:

| | |
| --- | --- |
| `D2026-03-01 + P1D` | `2026-03-02` on all three |
| `D2026-03-01 + P1Y` | `2027-03-01` on all three |
| `startOfMonth(D2026-03-15)` | `2026-03-01` on all three |

So years are handled as calendar years and days as days; only the month
component of a duration is converted to a fixed length.

## Why it matters

A wrong value, not an error, on one target out of four — the worst shape a
defect can take for a language whose argument is that the same specification
runs anywhere.

It is also hard to notice by inspection: the result is a plausible date, one
day off, and only for dates where the month length is not 30. `D2026-04-01 +
P1M` would be right by accident.

Month arithmetic is the normal case for anything with an effective date, a
billing period or a notice period, so this is not an exotic corner.

## What it should be

A month is a calendar month on every target, as it already is on JavaScript
and Ruby: adding `P1M` lands on the same day-of-month of the next month, and
clamps where that day does not exist (31 January plus one month is the last
day of February, by whatever rule the other targets already apply — worth
pinning that too, since it is the case where the three could silently differ
again).

## Tests

In `test/fixtures/`, seen red on Python first:

- the two assertions above;
- a month addition that must clamp: `D2026-01-31 + P1M`, asserted against
  whatever JavaScript and Ruby already agree on, so the three are pinned
  together rather than to a guess;
- a subtraction, `D2026-04-01 - P1M`, since the same conversion is likely on
  the other side;
- `P1M` added to a `Datetime` as well as a `Date`, if the two take different
  paths.

## A smaller thing found alongside

`startOfMonth` applied to a plain string rather than a `Date` fails
differently on each target:

```elo
startOfMonth(_.d)        # with _.d = "2026-03-15"
```

- JavaScript: `_.d.startOf is not a function`
- Python: `TypeError: replace() takes at most 3 keyword arguments (5 given)`
- Ruby: succeeds, coercing the string

Three behaviours for one call. The Python one is the worst of the three — an
internal `TypeError` from inside the prelude rather than a refusal naming the
argument — but the real question is which of the three is correct. Worth its
own task rather than being folded into this one.
