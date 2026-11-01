# The acceptance suite only passes when the machine's timezone is UTC

> Found while running the suite for 0176, on a machine in CET.

## Symptom

On a clean checkout, with no changes:

```
$ ./test/acceptance/test-js.sh test/fixtures/stdlib/datetime
  ✗ temporal-startof-endof.expected.js
  Error: Assertion failed
      DateTime.fromISO("2024-06-15T10:30:00Z").startOf('day').toMillis()
        === DateTime.fromISO("2024-06-15T00:00:00Z").toMillis()

$ TZ=UTC ./test/acceptance/test-js.sh test/fixtures/stdlib/datetime
  ✓ temporal-startof-endof.expected.js
```

Luxon's `fromISO` converts to the ambient zone, so in CET the datetime is
12:30+02:00 and `startOf('day')` is `2024-06-15T00:00+02:00` — the previous day
at 22:00Z. The fixture asserts the UTC instant, so it only holds at offset 0.

None of the four runners set `TZ`, so the suite is green on a UTC machine and
red in any other zone. That makes "all tests MUST PASS at all times" untrue
depending on who runs them.

## The real question first

Deciding this is a language question, not a harness question, and it should be
settled before touching either:

- **Is a period boundary an instant in the machine's local zone, or in UTC?**
  `startOfDay(t)` has to mean one of the two, and the four targets do not agree
  today: Luxon uses the ambient zone, PostgreSQL's `date_trunc` uses the input's
  type, Ruby's ActiveSupport uses `Time.zone`.
- A program compiled to Ruby on one server and to SQL on another must agree, so
  whichever answer is chosen has to be forced in the emission rather than
  inherited from the host.

## Then

If the answer is UTC, the emissions should pin the zone (`setZone('utc')` and
its equivalents) and the fixtures stay as they are. If the answer is local, the
fixtures are asserting the wrong thing and need rewriting in terms the zone
cannot move.

Exporting `TZ=UTC` in the four runners makes the symptom go away without
answering anything, and would hide the cross-target divergence. Only do that as
a deliberate second step, with a comment pointing at the decision.
