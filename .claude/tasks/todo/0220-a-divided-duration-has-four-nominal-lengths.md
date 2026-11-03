# A divided duration has four nominal lengths, and three of them disagree

> Measured while fixing 0219, which made `*` and `-` keep a duration's calendar
> components. Division was the open question 0219 raised and deliberately did
> not answer, because there are three defensible rules and picking one is a
> language decision.

## Symptom

`inDays` of a divided duration, measured on all four targets today:

| | JS | Ruby | Python | SQL |
| --- | --- | --- | --- | --- |
| `inDays(P1M / 2)` | 15 | 15.218… | 15 | 15 |
| `inDays(P1Y / 2)` | 182.5 | 182.5 | 182.5 | **180** |

Four targets, three answers for `P1Y / 2`. And the same divergence is there
without dividing at all, which is the part 0219 did not touch either:

| | JS | Ruby | Python | SQL |
| --- | --- | --- | --- | --- |
| `inDays(P1M)` | 30 | 30.436875 | 30 | 30 |
| `inDays(P1Y)` | 365 | 365.2425 | 365 | 365.25 |

So the nominal length of a calendar unit is a per-target accident. Nothing in
the corpus asserts any of it, which is why it has survived.

## Where it comes from

Three different rules, each coherent on its own:

* **JavaScript and Python** collapse the whole duration to a millisecond total
  and divide that, with a month nominally 30 days and a year 365
  (`src/runtime.ts`, `EloDuration.divide` and `kDiv`;
  `src/bindings/javascript.ts`, `div(Duration, Int|Float)`).
* **Ruby** does the same, but ActiveSupport's month is 30.436875 days and its
  year 365.2425 — the mean Gregorian lengths — so every conversion is a little
  longer (`src/bindings/ruby.ts`, `inDays` and friends divide `to_i`).
* **PostgreSQL** divides the components and pushes the remainder down a unit at
  30 days per month, so `interval '1 year' / 2` is `6 mons` (180 nominal days)
  while `interval '1 mon' / 2` is `15 days`. This is the only rule that keeps a
  calendar unit calendar where it can.

## The decision to make

Pick one of the three for `/`, and pick the nominal length table that goes with
it. They are not separable: whatever `inDays(P1M)` is, `inDays(P1M / 2)` has to
be half of it.

1. **Nominal everywhere** — `/` collapses, a month is 30 days, a year 365.
   Simplest to state and already what three targets do. Ruby and SQL change.
2. **PostgreSQL's rule everywhere** — divide the components, carry the
   remainder down at 30 days a month. Keeps `P1Y / 2 == P6M`, which is the
   answer an author would guess. Three targets change, and it needs the
   component-carrying logic written per target.
3. **Refuse it** — `/` on a duration carrying a year or a month is a runtime
   failure, since half a calendar month has no meaning. Most in keeping with
   "restrict Elo's powerfulness rather than violate portability", but it is a
   new runtime failure mode in four targets, and the operand's components are
   not statically known so it cannot be a compile-time refusal.

The same choice decides `*` by a fraction, which 0219 left collapsing to the
nominal length for exactly this reason.

## Tests

`inDays` of each calendar unit and of each divided by 2, on all four targets —
the table above, turned into assertions. Plus the dynamic twins, since `kDiv`
and `kMul` are the path a lambda takes, and `P1M / 2 + P1M / 2 == P1M`, which
holds under rules 1 and 2 and is what pins the halves to the whole.
