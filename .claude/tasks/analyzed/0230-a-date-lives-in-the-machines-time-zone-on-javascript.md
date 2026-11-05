# A date lives in the machine's time zone on JavaScript

> Found while building the formula catalogue of 226, by a payment-terms formula
> that counts the days between an invoice date and a due date. Not fixed there:
> the fix is a decision about what zone the JavaScript target runs in, which is
> bigger than the bug and wants your call.

## Symptom

```elo
inDays(D2026-03-30 - D2026-02-03)
```

| Target | Answer |
| --- | --- |
| Ruby | `55` |
| Python | `55` |
| PostgreSQL | `55` |
| **JavaScript** | **`55`** in UTC, **`54.958333333333336`** in `Europe/Brussels` |

55 days minus one hour. The two dates straddle the European DST change of
29 March 2026, and a `Date` on the JavaScript target is a luxon `DateTime` in
the **machine's local zone**, so the day between them is 23 hours long.
A date has no time of day and no zone, so the number of days between two of
them cannot depend on where the server is.

It is not a corner case: the same expression on a machine in `America/New_York`
is wrong for any span crossing 8 March, and **any** date span crossing a DST
boundary in the host's zone is wrong by an hour, in either direction.

## It is already in the suite

`npm run test:acceptance` fails two JavaScript fixtures on a developer machine
set to `Europe/Brussels`, and passes under `TZ=UTC`:

```
✗ reference/dynamic-ambiguous-dispatch.expected.js
✗ stdlib/datetime/temporal-startof-endof.expected.js
    DateTime.fromISO("2024-06-15T10:30:00Z").startOf('day')
      === DateTime.fromISO("2024-06-15T00:00:00Z")
```

`startOf('day')` is the start of the day *in the local zone*, so it is
`2024-06-14T22:00:00Z` in summer in Brussels. Same cause, different function.
CI runs in UTC, which is why neither has been seen.

## What to decide

The fix is one line in principle — parse temporal literals with
`{ zone: 'utc' }` — and a semantic choice in practice. Three questions, and
they are not independent:

1. **Is a `Date` zone-less?** If yes, a `Date` literal and the `Date()` selector
   build a UTC `DateTime`, `startOfDay`/`endOfMonth` on a Date work in UTC, and
   two dates subtract to whole days everywhere. This is what Ruby (`Date`),
   Python (`date`) and PostgreSQL (`DATE`) already do — JavaScript is the one
   target without a date type, and luxon's default zone is what it borrowed
   instead.
2. **What then is `TODAY`?** Today in the machine's zone (`DateTime.now()`
   truncated) is a *different day* from today in UTC for part of every day. If
   dates are UTC, `TODAY` has to pick one, and "the day it is where the user is"
   is usually what a formula means.
3. **And `NOW`, and a `Datetime` with no offset?** `D2026-03-30T10:00:00` has no
   zone written on it. Reading it as UTC makes `startOfDay` and `endOfDay`
   portable; reading it as local keeps `NOW` comparable with it. The other
   three targets read it as a zone-less timestamp, which is the UTC reading in
   all but name.

My reading: dates and offset-less datetimes are UTC on every target, `NOW` and
`TODAY` stay the host's (`TODAY` being the UTC-truncated *local* day), and the
prelude never touches `Settings.defaultZone` — a library must not change the
host's global zone. But that last point about `TODAY` is exactly where a
no-code tool's users have opinions, so it is yours to make.

## Tests to write first

All four targets, run under at least two zones (`TZ=UTC` and
`TZ=Europe/Brussels` — the suite should probably run both):

- `inDays(D2026-03-30 - D2026-02-03) == 55`, and the same span in October
- `startOfDay(D2026-06-15T10:30:00Z) == D2026-06-15`, which is the fixture
  already failing
- `year/month/day` of a Date literal around midnight
- `D2026-03-29 + P1D == D2026-03-30`, the day the hour disappears
- `TODAY`, whatever is decided, asserted as a property rather than a value
  (`startOfDay(TODAY) == TODAY`)

## Blast radius

Every temporal fixture's JavaScript expectation, and `contrib/sandboxes` if any
of them pin a zone. Worth doing in one go rather than per-function.
