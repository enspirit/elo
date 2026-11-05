# A day is shorter when the clocks change, on JavaScript only

Found while building the formula service (0234), whose boot runs every case of
every bundle: `payment-due-date` fails in a timezone that has a DST transition
between the two dates, and only on JavaScript.

## The repro

```bash
TZ=UTC                 ./bin/elo -e "inDays(startOfDay(D2026-03-11) - startOfDay(D2026-01-10))"
# 60
TZ=America/Los_Angeles ./bin/elo -e "inDays(startOfDay(D2026-03-11) - startOfDay(D2026-01-10))"
# 59.958333333333336
```

Ruby and Python answer `60` in both timezones — `test/acceptance/test-formulas.sh`
under `TZ=America/Los_Angeles` fails `payment-due-date [js]` and nothing else.
So the two emissions have diverged, which is the usual shape of this class of
bug: 2026-03-08 is when the clocks go forward there, so the interval is 59 days
and 23 hours, and dividing by a nominal 24-hour day gives 59.958.

Two dates differ by a whole number of days. That is what a `Date` is, and it is
what the other two targets answer.

## Where to look

`inDays` on a duration, and the subtraction that produced it: the JS target
measures elapsed milliseconds and divides by 86 400 000, where a calendar day
is meant. Luxon has the right tool — `end.diff(start, 'days')`, or
`Interval.length('days')` — and the choice has to be made where the operands
are `Date` rather than `Datetime`, which the checker knows and the dynamic
dispatcher does not.

Note the parallel with `P1M` on Python (0231): a month is not 30 days and a day
is not 24 hours, and every target has to agree on which.

## The corpus is affected too

`test/fixtures/reference/dynamic-ambiguous-dispatch.elo` and
`stdlib/datetime/temporal-startof-endof.elo` fail on JS under
`TZ=Europe/Brussels` and pass under `TZ=UTC` — `startOf('day')` on a value
parsed from a `Z` instant lands on local midnight. CI runs in UTC, so the
corpus has a timezone assumption in it that nobody declared. Worth deciding:
either the suite pins `TZ` (and says why), or those assertions are rewritten to
be timezone-free. The second is better — a fixture that only holds in one
timezone promises less than it looks like it does.

## Done when

- a fixture asserts `inDays` over a DST boundary, red on JS and green on Ruby
  and Python before the fix
- the three targets agree, in a timezone with a transition and in one without
- `TZ=America/Los_Angeles npm test` passes, and so does `TZ=UTC npm test`
