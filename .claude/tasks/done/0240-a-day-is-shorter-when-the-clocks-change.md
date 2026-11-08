# A day is shorter when the clocks change, on JavaScript only

Found while building the formula service (0234), whose boot runs every case of
every bundle: `payment-due-date` fails in a timezone that has a DST transition
between the two dates, and only on JavaScript.

> The formula service and its catalogue have since moved out of this
> repository, so the suite named below lives there now. The bug is Elo's and
> stays here; the repro above needs nothing but `./bin/elo`.

## The repro

```bash
TZ=UTC                 ./bin/elo -e "inDays(startOfDay(D2026-03-11) - startOfDay(D2026-01-10))"
# 60
TZ=America/Los_Angeles ./bin/elo -e "inDays(startOfDay(D2026-03-11) - startOfDay(D2026-01-10))"
# 59.958333333333336
```

Ruby and Python answer `60` in both timezones — the catalogue's own
cross-target suite, under `TZ=America/Los_Angeles`, fails
`payment-due-date [js]` and nothing else.
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

---

## What was done

**Diagnosis.** Not `inDays` and not the subtraction. Luxon's `fromISO` without a
zone converts the parsed instant into the host's ambient zone, and JavaScript is
the only one of the four targets that has one: Ruby's `Date.parse`/`DateTime.parse`
keep the literal's offset (UTC when it spells none), Python builds naive
datetimes, PostgreSQL's `TIMESTAMP` carries no zone. So every Elo date on JS was
a *local* wall clock, and the whole corpus already asserts the zone-free reading
(`startOfDay(D2024-06-15T10:30:00Z) == D2024-06-15T00:00:00Z`). The emission was
the deviant, in one place, with many symptoms:

```
TZ=America/Los_Angeles
  inDays(startOfDay(D2026-03-11) - startOfDay(D2026-01-10))   59.958…   want 60
  day(D2026-01-01T00:30:00Z)                                  31        want 1
  month(D2026-01-01T00:30:00Z)                                12        want 1
  year(D2026-01-01T00:30:00Z)                                 2025      want 2026
```

**Red first.** `test/fixtures/stdlib/datetime/temporal-zone-independence.elo`,
18 assertions. Before the fix: **13 red on JavaScript** under both
`TZ=America/Los_Angeles` and `TZ=Europe/Brussels`, **0 red on Ruby, Python and
SQL** in any zone, 0 red on JS under `TZ=UTC`. That asymmetry *is* the finding.
The two fixtures the task named (`temporal-startof-endof`,
`dynamic-ambiguous-dispatch`) were red on JS in every non-UTC zone too, which
is the corpus-wide half of it.

**Fix.** Every DateTime the JavaScript target builds from text is pinned to UTC —
`dateLiteral`, `datetimeLiteral`, `bot`, `eot`, and the four coercion helpers
`kDate`, `kDatetime`, `pDate`, `pDatetime` (a host-supplied DateTime gets
`.setZone("utc")`). All of them: leaving one out is how the ambient zone comes
back. The corpus is now green on all four targets under `TZ=UTC`,
`America/Los_Angeles` and `Europe/Brussels`, on all five axes (unit,
integration, acceptance, `--optimize`, `--force-dynamic`).

**`NOW` and `TODAY` deliberately keep the host's zone.** They are the one
temporal value whose answer *is* the host's clock, and README documents a host
handing its own `DateTime.now()` in as `_`; pinning them was tried and turns
`fn(yesterday)` into `true` in `test/unit/compile.unit.test.ts` — measured, not
predicted. The seam that leaves (`TODAY == D<today>` is true on the other three
targets and false here) is finding 5 of `ideation/0250`, because it is a
question about the host API, not about this emitter.

**Not done here, recorded instead.** The fixture walked into four more
divergences while being written, every one of them zone-*independent* and so a
different bug: `ideation/0250`. Two of them were asserted, seen red, and taken
back out so the corpus could stay green.

**Blast radius.** 24 `.expected.js` files; the word-level diff is exactly
`, { zone: "utc" }` and `.setZone("utc")` and nothing else. Three
`UNREACHED` entries came off the `dispatch-coverage` lists (`day:datetime`,
`month:datetime`, `year:datetime`) — the new fixture reaches them. The grammar
gate's `ALLOWED_PROPERTIES` is **not** widened: `setZone` occurs only inside
prelude helpers, which the gate exempts and `helper-region` enumerates.

**Documented**, because the rule was nowhere written: one line in README's
literal list, one paragraph in the website reference's *Dates & Times*.
