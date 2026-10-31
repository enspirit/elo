## Problem to solve

There is no way to compose a Datetime from a date and a time.

```elo
Datetime(D2026-09-16, '10:30:00')   # Unknown function Datetime(Date, String)
```

A date column and a time column are two columns in most schemas, and joining
them goes through string surgery today.

## Context

Reported by Bricks (point 6), in production. Verified against main on
2026-10-31: only the single-argument `Datetime(string)` exists.

## Proposal

Add `Datetime(date, time)`. Additive, no existing behaviour changes.

## To decide

- What is the second argument? A `String` like `'10:30:00'` is what they have
  in hand. Elo has no Time type, and inventing one for this is more than the
  problem asks.
- Timezone: the Date carries one, the time string does not. Compose in the
  date's zone, presumably — needs stating, since getting this wrong silently
  shifts the instant (see 0153, where the same question bites).

## Work

Four targets, fixtures in each, plus README and the stdlib page.
