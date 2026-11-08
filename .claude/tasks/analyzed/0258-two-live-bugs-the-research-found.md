# Two live bugs the time research found, and one decision it forced

> **Decided.** §1 and §2 are `D5` in `todo/0259-the-temporal-model.md`
> (millisecond precision, declared; finer refused in the lexer; Ruby's `inX`
> accessors stop truncating) and land as its step 5. §3 is `D6`: `NOW` on SQL
> stays the transaction's clock and gets documented as such. This file is kept
> for the measurements.

> Found while answering `0256` — an independent review of what developers get
> wrong about dates and times named sub-second precision and transaction-frozen
> clocks as cross-runtime hazards, and both turned out to be live in Elo. All
> three measured on `main` at 2026-11-08. Neither is a `0256` or `0261`
> dependency; they are ordinary bug fixes that can be taken at any time.

## 1 — Ruby's `inX` family throws away the fractional second

Every Ruby duration accessor calls `.to_i` on the duration first, which
truncates `ActiveSupport::Duration` to whole seconds, and *then* divides
(`src/bindings/ruby.ts:405-420`):

```ts
rubyLib.register('inSeconds', [Types.duration], (args, ctx) =>
  `${ctx.emit(args[0])}.to_i.to_f`);
rubyLib.register('inMinutes', [Types.duration], (args, ctx) =>
  `(${ctx.emit(args[0])}.to_i / 60.0)`);
```

Measured, same expression, four targets:

| | JS | Ruby | Python | SQL |
| --- | --- | --- | --- | --- |
| `inSeconds(PT0.001S)` | 0.001 | **0.0** | 0.001 | 0.000001-exact |
| `inSeconds(PT0.5S)` | 0.5 | **0.0** | 0.5 | 0.500000 |
| `inSeconds(PT1.5S)` | 1.5 | **1.0** | 1.5 | 1.500000 |
| `inMinutes(PT30.5S)` | 0.508333… | **0.5** | 0.508333… | 0.508333 |
| `inMinutes(PT90S)` | 1.5 | 1.5 | 1.5 | 1.5 |

So three targets agree and Ruby is alone, which is the usual shape. It is a
**whole millisecond** that goes missing, not a microsecond, so this is well
inside the range an author would notice: any duration carrying a fraction of a
second reads short on Ruby and exactly on the other three.

Worse, Ruby is internally inconsistent about it. Sub-second precision survives
*arithmetic* there — `D2026-01-01T00:00:00 + PT0.000001S != D2026-01-01T00:00:00`
is true on Ruby — and is then discarded by the accessor. So the value holds the
precision and only the reading loses it.

**Fix:** the accessors must not truncate. `.to_f` rather than `.to_i.to_f`, and
`/ 60.0` on the float rather than on the truncated integer; check what
`ActiveSupport::Duration#to_f` answers for a duration carrying calendar
components before assuming it.

**Red first:** the five rows above as a fixture, on all four targets.
`inSeconds(PT0.001S) == 0.001` is red on Ruby alone — measured, not predicted.

Note the interaction with `ideation/0220`: that task is about the *nominal
length* of a calendar unit (`inDays(P1M)`), where the divergence is 30 vs
30.436875. This is a different bug in the same functions, and fixing it does
not answer 0220 — but whoever touches these eight registrations should read
both.

## 2 — Sub-second precision is three different things

Underneath bug 1 there is a design question nothing has decided:

| | smallest representable unit |
| --- | --- |
| JavaScript / luxon | **millisecond** |
| Python `datetime` | microsecond |
| PostgreSQL `timestamp` | microsecond |
| Ruby `Time` | rational / nanosecond |

Measured consequence, with Ruby's bug 1 set aside:

```
D2026-01-01T00:00:00 + PT0.000001S == D2026-01-01T00:00:00
```

is **true on JavaScript** — the microsecond is swallowed — and **false on
Ruby, Python and SQL**. One line, two answers, no fixture asserting either.

So Elo has an unstated precision, and it is whatever the host happens to
offer. Under the rule the README states, that makes it **unspecified** rather
than broken — which is its honest status, and also the reason to specify it,
because an author writing `PT0.0005S` has no way to know whether it survives.

**The decision:** declare Elo's precision. Millisecond is the floor imposed by
JavaScript, so either

1. **Millisecond, and refuse finer in the lexer.** `PT0.0005S` is a parse
   error that says so. Portable by construction, and the refusal is readable —
   most in keeping with "restrict Elo's powerfulness rather than violate
   portability".
2. **Millisecond, and truncate finer silently.** Cheapest, and silently wrong
   on three targets — exactly the "quiet wrongness" class this project keeps
   paying for. Not recommended.
3. **Microsecond, emulated on JavaScript.** Needs a duration representation
   that does not go through luxon's millisecond `Duration`, on the one target
   that cannot hold it. Expensive, and buys a precision no Elo expression has
   yet asked for.

(1) is the recommendation. Whichever is chosen, the fixture is what makes it
specified; today there is nothing to be red.

**Range is the same question and should be answered with it.** The expressible
range is the intersection of the four: Python years 1–9999 (raises), luxon
±8.64e15 ms ≈ ±273 790 years (`Invalid DateTime`), PostgreSQL 4713 BC–294276 AD
(errors), Ruby effectively unbounded (succeeds). Four overflow behaviours, one
of which is "no error". Clamping the language to `0001`–`9999` and defining
what happens past it would make `BOT`/`EOT` meaningful rather than incidental.

## 3 — `NOW` is the transaction's clock on SQL and the call's clock elsewhere

`now` compiles to `CURRENT_TIMESTAMP` on the SQL target
(`src/bindings/sql.ts:345`), and PostgreSQL freezes that at **transaction
start**. Measured:

```sql
BEGIN;
  SELECT CURRENT_TIMESTAMP;   -- 2026-11-08 11:35:12.228574+00
  SELECT pg_sleep(1);
  SELECT CURRENT_TIMESTAMP;   -- 2026-11-08 11:35:12.228574+00   ← identical
  SELECT clock_timestamp();   -- 2026-11-08 11:35:13.235166+00   ← advanced
COMMIT;
```

So a host that evaluates two Elo expressions in one transaction gets **the
same `NOW`** on SQL and **two different ones** on JavaScript, Ruby and Python.
A workflow that stamps a record and then measures elapsed time against `NOW`
answers zero on SQL and non-zero everywhere else.

This is not obviously a bug — transaction time is a defensible and often
*preferable* semantic, and it is what a SQL author expects. But it is
undeclared, and it is the kind of divergence this project treats as a finding
rather than a quirk.

**The decision:** `NOW` is either

* **the call's clock** — `clock_timestamp()` on SQL, matching the other three.
  Note the cost: `clock_timestamp()` is `VOLATILE`, so an expression using
  `NOW` can no longer be used in an index or a generated column, and
  PostgreSQL may evaluate it more than once per row.
* **the statement's or transaction's clock** — documented as such, with the
  other three left as they are and the divergence stated rather than removed.
  Cheaper and arguably more useful, but then `NOW` means two things.

Either way it wants a line in the reference page, because an author comparing
two `NOW` readings is relying on an answer nobody has given.

**Related, and worth measuring before deciding:** `ideation/0255` finding 3 is
the other `NOW` divergence (Ruby's `NOW` carries the host offset where its
`TODAY` does not), and `0256` proposes making `NOW` read a declared zone. All
three are about the same function and should be looked at together — but this
one is independent of the zone question and can be fixed without it.

## Why these were not found before

Nothing in `test/fixtures/` writes a duration with a fraction of a second, and
nothing calls `NOW` twice in one expression. The corpus is the specification,
so what it does not write down is not specified — which is the honest version
of "these are new bugs". Both were named by a review of the *literature* on
date/time mistakes rather than by reading Elo, which is worth noting: the
research found two live defects that eight hundred fixtures did not.
