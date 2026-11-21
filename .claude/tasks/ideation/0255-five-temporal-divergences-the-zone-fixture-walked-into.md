# Five temporal divergences the zone fixture walked into

> **Three of the five are now decided, in
> `todo/0259-the-temporal-model.md`.** §3 (Ruby's `NOW` carries the host
> offset) and §5 (`TODAY` is not today's literal on JS) are both closed by
> `D1` + step 1 — one declared zone for `NOW`/`TODAY` on four targets. §4 (an
> offset-bearing literal means two instants) is closed by `D4`: the lexer
> refuses a zone designator, which is the "third answer" this file argued for.
> §1 still belongs to `ideation/0153`, and §2 is still an open fix.

> Numbered 0250 when written, which collided with `done/0250-a-table-for-the-
> bounded-primitives.md`. The commit that closed 0240 refers to it as 0250.

> Found while writing `stdlib/datetime/temporal-zone-independence.elo` for 0240.
> Each was measured on main, each is zone-*independent* (red under `TZ=UTC` too),
> and each is therefore a different bug from the one 0240 fixed. Two of the four
> were asserted and then taken back out of that fixture so the corpus could stay
> green; the repro is here instead.

## 1 — SQL loses the datetime through `String()`

```
$ eloc -t js     -e "String(D2026-09-16T10:30:00Z)"   # "D2026-09-16T10:30:00"
$ eloc -t python -e "String(D2026-09-16T10:30:00Z)"   # 'D2026-09-16T10:30:00'
$ psql -c "SELECT elo_string(to_jsonb(TIMESTAMP '2026-09-16 10:30:00'))"
 '2026-09-16T10:30:00'
```

Three targets render the Elo literal, `D` prefix included. SQL renders a
*quoted string*, because `to_jsonb(timestamp)` produces a JSON string and
`elo_string` then can no longer tell it from one. So the `D` is gone and quotes
appear that the other three do not have.

Note this interacts with 0153, which proposes changing what `String()` of a
datetime renders on *every* target. Fix the divergence or settle 0153 first,
but do not fix the divergence to the wrong answer twice.

## 2 — the dynamic `Date - Date` emits invalid SQL

```
$ eloc -t sql -e "inDays(min([D2026-03-11]) - min([D2026-01-10]))"
(EXTRACT(EPOCH FROM (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2026-03-11']) AS v)
  - (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2026-01-10']) AS v)) / 86400.0)
```

```
ERROR: function pg_catalog.extract(unknown, integer) does not exist
```

In PostgreSQL `date - date` is an **integer** day count, not an interval. The
typed path knows that and multiplies: `(DATE 'a' - DATE 'b') * INTERVAL '1 day'`.
The `sub:any,any` path does not, so the typed and dynamic emissions disagree —
the class `dispatch-coverage` and the force-dynamic axis exist for, and the
same shape as the entries in `0248`. A compile that cannot run is the honest
half of it; the fix is for the dynamic `sub` to produce an interval the way the
typed one does.

## 3 — Ruby's `NOW` carries the host offset, its `TODAY` does not

```elo
assert(startOfDay(NOW) == TODAY)
```

Green on JavaScript, Python and SQL in every timezone. Red on **Ruby** under
`TZ=America/Los_Angeles`, green under `TZ=UTC`:

```ruby
DateTime.now.beginning_of_day == Date.today   # false at offset != 0
```

`DateTime.now` keeps the local offset, so its `beginning_of_day` is local
midnight; `Date.today` is offset-free, so it reads as UTC midnight. They are
different instants. Every *other* Ruby temporal value is offset-free —
`Date.parse`, `DateTime.parse("…Z")` — so `now` is the one that does not follow
the target's own rule. 0240 pinned the same seam on JavaScript by giving `now`
the local wall clock with no zone (`setZone("utc", { keepLocalTime: true })`);
the Ruby equivalent is `DateTime.now.change(offset: 0)`, which wants checking
rather than assuming.

Worth a thought about Python and SQL at the same time: Python's
`datetime.now()` is naive local, which is already the rule; SQL's
`CURRENT_TIMESTAMP` is a `timestamptz` and agrees with `CURRENT_DATE` only
because the session zone applies to both.

## 4 — an offset-bearing literal means two different instants

```
$ eloc/elo -e "hour(D2026-01-01T00:30:00+02:00)"
22          # JavaScript
0           # Ruby, Python, SQL
```

The parser accepts `+HH:MM` (`readDateOrDateTime`, `src/parser.ts`). JavaScript
converts the instant into UTC and reads 22; the other three ignore the offset
entirely and read the wall clock as written. Three targets to one, but the
majority is not obviously right here — *silently discarding an offset the
author wrote* is the worse of the two behaviours, and Elo's order puts portable
above powerful, which argues for a third answer: refuse the offset in the
lexer, since the language has no way to mean it consistently.

That makes this one a **decision**, not a fix, which is why it is in ideation
rather than todo. The other three are fixes.

## 5 — `TODAY` is not the literal for today, on JavaScript

```elo
TODAY == D2026-11-08      # on 2026-11-08
```

True on Ruby, Python and SQL in every timezone: all three give `TODAY` the
local *calendar date* with no zone, which is exactly what the literal is.

False on JavaScript at any offset but 0, since 0240: the literal is now UTC
midnight and `TODAY` is `DateTime.now().startOf('day')`, local midnight. 0240
left it that way **on purpose**, and the reason is the whole of the problem:

```typescript
const inThisWeek = compile('_ in SOW ... EOW', { runtime: { DateTime, Duration } });
inThisWeek(DateTime.now());   // README, "Using the compiler as a library"
```

A host is documented to hand its own luxon `DateTime` in as `_`, and that value
is a zoned instant. `NOW`/`TODAY` have to stay comparable with it, so they keep
the host's zone; a literal must not, or a date is a different day per host.
Pinning them too (`setZone("utc", { keepLocalTime: true })`, which is what
makes the other three targets' answer) turns `fn(yesterday)` into `true` in
`test/unit/compile.unit.test.ts` — measured, not predicted.

So this is not a bug with a local fix. It is the question *what does the host
hand in*, and it should be answered on the host API: either the contract
becomes "zone-free DateTimes only", and `NOW`/`TODAY` get pinned with
everything else, or Elo keeps accepting zoned instants and `TODAY` can never be
the literal. Both are defensible; the current state is the second, undeclared.
Note that `Date(_)` and `Datetime(_)` already normalise a host DateTime to UTC,
so the first answer is half-built.

## Tests

1 and 2 belong in a fixture over an untyped value plus the typed twin, in the
shape `stdlib/data/` uses. 3 is the one-line assertion above, which must be red
on Ruby before the fix and green on the other three. 4 and 5 need the answer
first; 5's belongs in `test/unit/compile.unit.test.ts` as much as in a fixture,
because the host API is half of it.
