# What developers get wrong about time, and Elo's answer to each

> **Decided. This is the evidence; the decisions are in
> `todo/0259-the-temporal-model.md`.** Read that first — it is a tenth of the
> length. This file is kept for the catalogue of fourteen mistakes, the
> measurements behind each, and the scoreboard of which ones the wall-clock
> model already avoids.
>
> The five "Decisions needed from you" at the bottom are all answered in
> `0259`: the trilemma as `D3`, option (A) as `D1`, the host contract in
> *The work, in order*, offset-bearing literals as `D4`, and "Elo has no
> instants" is adopted as the sentence that goes on the website.

> Asked for before choosing between `--timezone` and `$.timezone`, and it
> turns out to settle the choice.
>
> Everything below is measured on `main` at 2026-11-08, not recited. The
> measurements are reproducible with `./bin/eloc --lines` and the four runners;
> the commands are in the task's git history.

## The finding, first

**Elo has two clocks and they do not agree.**

* The **literal** clock. Since `0240`, a Date or Datetime literal is a
  zone-free wall clock: `D2026-11-08T11:49:00` means 11:49, DST does not exist,
  and all four targets agree whatever the host's timezone is. Measured:
  `inHours(D2026-03-09 - D2026-03-07)` is `48` on all four targets under both
  `TZ=UTC` and `TZ=America/Los_Angeles`, where 2026-03-08 is a spring-forward
  day there.
* The **`NOW`** clock. `NOW` and `TODAY` read the **host's ambient zone**, on
  all four targets, because that is what `DateTime.now()`, `DateTime.now`,
  `datetime.now()` and `CURRENT_TIMESTAMP` do.

Mixing the two is what an author does all day, and it is wrong:

| at the same instant | JS | Ruby | Python | SQL |
| --- | --- | --- | --- | --- |
| `hour(NOW)` @ Brussels | **10** | 11 | 11 | 11 |
| `hour(NOW)` @ Los_Angeles | **10** | 2 | 2 | 2 |
| `hour(D2026-11-08T11:49:00)` | 11 | 11 | 11 | 11 |
| `inHours(NOW - startOfDay(NOW))` @ Brussels | 11.84 | 11.84 | 11.84 | 11.84 |
| `inHours(NOW - D2026-11-08T00:00:00)` @ Brussels | **10.84** | **10.84** | 11.84 | 11.84 |
| same, @ Los_Angeles | **10.84** | **10.84** | 2.84 | 2.84 |

Two separate defects in that table:

1. **`hour(NOW)` is the UTC hour on JavaScript and the local hour on the other
   three.** `hour` emits `.toUTC().hour`, which is right for a UTC-pinned
   literal and wrong for a host-zoned `NOW`. So *within one target*, `hour`
   reads two different clocks depending on where its argument came from.
2. **`NOW - <literal>` is off by the host's offset on JavaScript and Ruby** —
   one hour in Brussels, eight in Los Angeles — even though
   `startOfDay(NOW)` *is* today's midnight and the literal *is* today's
   midnight. This is exactly the MUST: `NOW` and `D2026-11-08T11:49:00` do not
   share a timezone at runtime. Python and SQL already satisfy it, by being
   naive everywhere.

CI runs in UTC, where every row above agrees. That is why none of this is red.

## There are exactly two ways to have one clock

**(A) Pull `NOW` into the literal clock.** `NOW` becomes a zone-free wall
clock. The zone used to read the host's clock has to come from somewhere, and
the only honest somewhere is a **declared** value defaulting to `UTC` — there
is nothing else to ask.

**(B) Push the literals into the `NOW` clock.** A literal acquires a zone, so
`D2026-11-08T00:00:00` means midnight *somewhere*.

(B) is what "move the hardcoded `'utc'` into `$`" means, and it costs:

* DST comes back. `inDays(startOfDay(D2026-03-11) - startOfDay(D2026-01-10))`
  is 59.958… again in any zone with a transition between the two dates, so
  `0240` is undone unless date arithmetic becomes calendar-aware on four
  targets — which is `ideation/0220`'s open question, unanswered.
* Ambiguous and non-existent local times arrive (#9 below). `D2026-11-01T01:30:00`
  happens twice in Los Angeles and `D2026-03-08T02:30:00` never happens. Elo
  has no such literal today.
* A literal means a different instant per context, so two programs sharing a
  constant disagree.

(A) costs **one thing**: `hour(NOW)` answers the declared zone's hour rather
than the host's. Which is the point, not a regression.

So (A) satisfies the MUST, keeps every property `0240` established, and adds no
new failure mode. **This is the recommendation**, and it is a correction of the
feasibility answer in `0261`: that answer said "not the literals", which stands
— but it concluded the MUST could not be met cheaply, and it can.

## The model, stated in one paragraph

> **Elo has no instants. A Datetime is a wall clock.** Arithmetic on wall
> clocks is calendar arithmetic with no DST, so a day is always a day and two
> dates always differ by a whole number of days. A timezone enters in exactly
> **two** places, both of them boundaries: reading the host's clock (`NOW`,
> `TODAY`), and converting an instant that arrives from outside (`Datetime(_.t)`
> on an offset-bearing string or a host timestamp). That zone is **declared**,
> defaults to `UTC`, and is the same on all four targets.

Two boundaries, one declared zone, no zones inside. That is the whole of it,
and it is teachable to a non-expert in three sentences — which is the test the
design has to pass, per the project's stated order: simple, well-designed,
portable, safe.

### What "no DST" precisely means — and what it costs

"DST-free" was loose shorthand and needs pinning down, because the useful
statement is narrower than it sounds:

> **Elo keeps the calendar's irregularities and drops the timezone's.**

The calendar is modelled faithfully. Measured, identical on all four targets
under both `TZ=UTC` and `TZ=America/Los_Angeles`:

```
D2026-01-31 + P1M == D2026-02-28     # a calendar month, clamped to the last valid day
D2024-02-28 + P1D == D2024-02-29     # a leap day exists
D2026-02-28 + P1D == D2026-03-01     # and only in a leap year
```

So months are 28–31 days, years are 365 or 366, and `+P1M` does the clamping an
author would want. What is *not* modelled is the offset transition:

```
inHours(P1D) == inHours(PT24H)                                    # 24, always
D2026-03-07T12:00:00 + P1D == D2026-03-07T12:00:00 + PT24H        # the same answer
```

Every day is exactly 24 hours, every hour 60 minutes, and no wall clock ever
repeats or skips. That is what removes mistakes #1, #2, #8, #9 and #12 from the
catalogue below: they are all consequences of a clock that jumps, and Elo's
does not.

**The cost, stated rather than discovered:** Elo cannot express *elapsed real
time* across a transition in a named zone. A shift from `D2026-03-08T01:00:00`
to `D2026-03-08T04:00:00` lasted **two** real hours in Los Angeles, where the
clocks went forward at 02:00; Elo answers three. An author who needs the true
elapsed time across a transition has to do that arithmetic outside Elo, on
instants, in a library that knows the zone's rules.

That is a real expressiveness loss and it is the right trade under the stated
design order — but it belongs in the documentation beside the model, because an
expert will reach for `PT24H` expecting it to differ from `P1D` and needs to be
told, once, that in Elo it does not and why.

Leap seconds are not modelled either, in common with almost everything; no
target's runtime exposes them.

#### Note for 0220

`inDays(P1M)` is 30 and `inDays(P1Y)` is 365 on JavaScript — the *nominal*
length of a calendar unit, which is a different question from the arithmetic
above and is where the four targets still disagree (30.436875 and 365.2425 on
Ruby, 365.25 on SQL). `ideation/0220` owns that; it is listed as #3 below.
Nothing in this task's model changes it, and nothing in it depends on the
answer.

## The hole in the model, found by independent review

An independent review of the date/time literature — no sight of this
repository, no knowledge of the model — was asked what developers get wrong,
and then asked to attack the model above. It produced thirty mistakes in six
families and confirmed all fourteen below. It also found one thing wrong, and
it is the thing to read before deciding anything:

> The design is not "wall-clock only". It is **"wall-clock only, plus an
> unstated promise that the declared zone has a fixed offset."**

That is correct and it is decisive. If every day is 24 hours, `P1D == PT24H`,
and no wall clock repeats or skips, then the clocks described are those of a
**fixed-offset** zone, not of an IANA zone. Under the `UTC` default the promise
holds and the model is sound. Permit `Europe/Brussels` as the declared zone and
it is false, because `NOW` read as a Brussels wall clock **does** repeat an
hour on 2026-10-25 and **does** skip one on 2026-03-29. The invariant would
then be violated at the one boundary the language owns.

Two consequences I had claimed and must withdraw:

* **#12 is not eliminated, it is made undetectable.** Wall clocks are totally
  ordered, so a comparison always succeeds and always returns an answer. Across
  a fold in a non-UTC declared zone that answer is wrong, and **no value in the
  language can report it** — where today the bug at least announces itself.
  Moot under `UTC`; a confident wrong answer otherwise.
* **#9 is not eliminated, it is exported.** Relocating gap/fold to one boundary
  is the right move, but the boundary I named runs instant → wall clock, which
  is the *total, unambiguous* direction. The ambiguous direction is wall clock
  → instant, and it still happens — in the host after Elo returns, or in
  PostgreSQL on a write to `timestamptz`. Elo can produce a Datetime that is
  ambiguous or unrepresentable where it lands.

**#8 survives review without qualification** — "genuinely eliminated, your
strongest result". You cannot store an instant, so you cannot pre-convert a
future local event into one that a tzdb update silently invalidates. And **#1
is half eliminated**: the type confusion goes, the semantic defect is
universalised — every value is now a local time whose zone lives in
out-of-band knowledge, which is the condition that makes #1 a bug in the first
place. Eliminated as a type error, relocated as a documentation obligation.

### So the trilemma, stated

Three things are wanted and **any two are available**:

1. **The MUST** — `NOW` and a literal share a timezone at runtime.
2. **The invariant** — no fold, no skip, so arithmetic and ordering are sound.
3. **Usefulness** — "today" means the author's calendar day.

| | 1 | 2 | 3 |
| --- | --- | --- | --- |
| everything UTC, no declared zone | ✓ | ✓ | ✗ — Brussels loses an hour a day, Los Angeles eight |
| declared IANA zone everywhere | ✓ | ✗ — the fold | ✓ |
| **today's state** (literals UTC, `NOW` host-zoned) | **✗** | ✓ | ✓-ish |

Today's state is the one that fails the MUST, which is why you asked. The
review's recommendation is to restrict the declared zone to **fixed offsets**,
which buys 1 + 2 and makes the model internally honest. I think that is wrong
for Elo: a fixed offset is wrong half the year in any DST zone, so it does not
buy 3, which is the whole reason a Brussels author wants the feature.

**My reading: take 1 + 3 and pay for 2, narrowly and in writing.** The payment
is confined to one function. Literal arithmetic keeps the invariant absolutely
— it has no clock to sample — so only readings of `NOW` in a non-UTC declared
zone are exposed, and only across the one hour a year the zone folds. And note
that Elo **already** cannot express elapsed real time (see the cost section
above), so this adds no new *kind* of limitation; it adds a wrong answer where
there was an inexpressible one, which is worse and must be said out loud rather
than discovered.

That is a decision for you, and it is the sharpest form of the question: **is a
confident wrong answer for one hour a year, in the declared zone only, an
acceptable price for "today" meaning the author's day?** If not, the honest
alternative is UTC-only with no declared zone at all — which satisfies the MUST
and the invariant, and tells a Brussels author to do their own day arithmetic.

### What the review says a design cannot fix

Worth recording because it bounds the ambition. Eliminable by construction:
one type per concept, no ambient zone, strict parsing, a canonical wire form,
no component mutators, cross-kind comparison as a type error. **Forced but
never decided** — the API can make you choose and must not choose for you:
gap/fold disambiguation (`compatible | earlier | later | reject`) and month-end
overflow (`constrain | reject`). Elo chooses `constrain` for the second and has
nowhere to put the first. Irreducibly the programmer's: *which concept the
datum is*. Irreducibly the operator's: clock drift alerting, and tzdata
freshness.

## The catalogue

For each: what people get wrong, what Elo answers **today**, and what the model
above changes. The verdicts are the point — several are already answered, and
knowing which is how the work stays small.

### 1. A local time without its zone — "which 11:49?"

Two servers read `2026-11-08 11:49` as two instants.

**Elo today: avoided by construction.** A Datetime is a wall clock and nothing
else; there is no instant for two servers to disagree about. The ambiguity is
*moved* to the boundary, where it is explicit, rather than hidden in the value.

### 2. A day is 24 hours

It is 23 or 25 on a transition day, so "due in 30 days" lands an hour early or
late, and a daily job runs twice or not at all.

**Elo today: avoided, and `P1D` is indistinguishable from `PT24H`.** Measured:
`hour(D2026-03-07T12:00:00 + P1D)` and `+ PT24H` both answer 12 on all four
targets under Los Angeles. In a zone-free world that is *correct* — both mean
"the same wall clock tomorrow".

**What the model changes:** nothing. See *What "no DST" precisely means* above
for the definition and for the one thing it costs — an expert will expect
`P1D ≠ PT24H` and has to be told once that here it is not.

### 3. A month is 30 days, a year is 365

**Elo today: half-answered, and the half that is wrong is recorded.**
`done/0219` made `*` and `-` keep a duration's calendar components, so
`date + P1M` lands on the same day-of-month. But `inDays(P1M)` is 30 on JS,
30.436875 on Ruby, 30 on Python and 30 on SQL, and `inDays(P1Y)` is 365 / 365.2425
/ 365 / 365.25 — **four targets, three answers**, `ideation/0220`.

**Not this task's to fix**, but it is the same family and should be answered in
the same breath, because "a nominal month" is a constant an author needs told.

**The sharp form of this mistake is not the nominal length, it is
non-invertibility**, and Elo has it. Measured:

```
D2026-01-31 + P1M       == D2026-02-28     # clamped, as intended
D2026-01-31 + P1M - P1M == D2026-01-28     # and the day is gone
```

Month arithmetic has no inverse and is not associative. Elo's clamping is the
right choice — three of the four targets clamp natively and it is what an
author wants — but `+ P1M - P1M` losing three days is a surprise worth one line
in the docs rather than a discovery. A library can only *force the choice*
(`constrain | reject`), never make it; Elo has chosen `constrain` and should
say so.

### 4. Date arithmetic in UTC when the user means local days

"Invoices due in 30 days" — in whose calendar?

**Elo today: the author's, implicitly, and it is the right default.** Wall-clock
arithmetic *is* calendar arithmetic. The only thing missing is that the
author cannot say which calendar `NOW` is read in, which is (A).

### 5. The server's timezone, implicitly

Works in dev, breaks in prod; green in CI (UTC), wrong for users.

**Elo today: this is the live bug.** `NOW` and `TODAY` inherit the host's zone
on all four targets, so the same program means different things on two servers
and the acceptance suite only passes under `TZ=UTC` (`ideation/0180`).

**(A) is the fix, and it is the whole reason to do (A).** A declared zone is
portable where an ambient one cannot be.

### 6. Truncating to a day boundary in the wrong zone

"Today's orders" off by hours — the classic `date_trunc` bug.

**Elo today: avoided for literals, broken for `NOW`.** `startOfDay(D…)` is
exact and identical on four targets. `startOfDay(NOW)` is the host's day.
Under (A) both are the declared zone's day.

*The review notes #4 and #6 are one mistake at two altitudes — arithmetic and
truncation in a calendar that is not the user's. Kept separate here only
because the fix lands in different code; they are one entry for counting.*

### 7. Comparing an instant to a wall clock

`NOW > D2026-11-08T09:00:00` — is 09:00 UTC or local? **This is the MUST**, and
it is the second row of the table above: wrong by the host's offset on
JavaScript and Ruby.

**Under (A): avoided by construction**, because there are no instants to
compare against. Both sides are wall clocks in the declared zone.

### 8. Storing a future appointment as an instant

Zone rules change — and they do, several times a year somewhere — so a future
local appointment stored as an instant silently moves.

**Elo today: avoided by construction**, and this is the sharpest argument for
the wall-clock model. A Datetime *is* the appointment, not an instant that
happens to coincide with it today. Worth saying out loud in the docs, because
it is the one place the wall-clock model is obviously right and the
instant model is obviously wrong.

### 9. Ambiguous and non-existent local times

01:30 happens twice on a fall-back day; 02:30 does not exist on a
spring-forward day. Naive code picks one silently or produces garbage.

**Elo today: cannot occur.** A wall clock has no offset to be ambiguous about.

**This is what (B) would introduce and (A) does not**, and it is the reason (A)
is not merely cheaper but better. Converting an instant *to* a wall clock —
which is all (A)'s two boundaries ever do — is always unambiguous. It is the
reverse direction that is ambiguous, and (A) never takes it.

### 10. The week starts on Sunday. Or Monday.

**Elo today: answered, and asserted.** `startOfWeek(D2024-06-12)` is
`D2024-06-10`, a Monday, on all four targets
(`stdlib/datetime/temporal-startof-endof.elo`). ISO, no locale question.

Worth checking that the docs *say* Monday, since an author from a Sunday-first
locale will assume otherwise and the fixture is not documentation.

**I under-scoped this one.** The review points out that the week-start is the
low-severity sibling of a high-severity mistake I had missed entirely: the
**week-year format bug**, `YYYY` versus `yyyy` (`%G` versus `%Y`). `2014-12-29`
formats as `2015-12-29` under the wrong one; Twitter lost roughly five hours to
it on 2014-12-28/29 and Apple hit it in 2013. It is invisible fifty-one weeks a
year and detonates in the fifty-second.

Elo has no format patterns today, so this is **prospective**: the day a
`format(t, pattern)` lands, this is the first thing to guard, and the cheapest
guard is to not expose a `YYYY`-style token at all.

### 11. An offset is not a timezone

`+02:00` is not `Europe/Brussels`: the offset changes through the year, so no
future arithmetic can be done with one.

**Elo today: divergent, and recorded.** `hour(D2026-01-01T00:30:00+02:00)` is
**22** on JavaScript and **0** on Ruby, Python and SQL — the other three ignore
the offset entirely (`ideation/0255` finding 4). Three-to-one, and the majority
is not obviously right: silently discarding an offset the author wrote is the
worse of the two behaviours.

**Under the model there is a third answer, and it is the right one:** an
offset-bearing literal is an *instant*, Elo has no instants, so it is converted
to a wall clock in the declared zone at the boundary — the same rule as
`Datetime(_.t)`. One rule covers both. Alternatively the lexer refuses an
offset, since the language has nothing to mean by it; that is more in keeping
with "restrict rather than violate portability" and is the cheaper first move.

### 12. Ordering events across a fall-back

Local timestamps go backwards for an hour, so sorting by them is wrong.

**Elo today: cannot occur** — no DST, so wall-clock order is total. A host that
needs true instant ordering is sorting on data, not on Elo's clock.

### 13. Two clocks: the app's and the database's

`NOW` compiled to SQL reads the database clock; compiled to Ruby, the
application's. They differ by network and skew, and under (A) they would also
have to agree on the declared zone.

**Elo today: unaddressed, and it cannot be fully addressed** — a compiler
cannot remove clock skew. Under (A) the *zone* agrees, which removes the
hours-sized error and leaves the milliseconds-sized one. Worth documenting
rather than solving; and it is the strongest argument for `$.now` later, since
a host-supplied `now` makes the two targets read **one** clock.

### 14. The host hands in an instant

`inThisWeek(DateTime.now())` is in the README. A host-supplied luxon
`DateTime` is a zoned instant, and Elo's values are wall clocks.

**Elo today: this is the cost of the model, and the honest statement of it.**
`0240` kept `NOW`/`TODAY` host-zoned precisely so this example keeps working;
under (A) the host contract becomes "hand Elo a wall clock, or coerce at the
boundary with `Datetime(_)`". Note that `--input-type` does **not** rescue it:
CLAUDE.md is explicit that a declared type is a promise and `_.i` reads the raw
value uncoerced, so there is no automatic coercion to hide behind.

This is the one place (A) is not free, and the decision is: **state the host
contract**. Elo takes wall clocks. The README example changes to pass
`DateTime.now().setZone('utc', { keepLocalTime: true })`, or `_` is coerced in
the expression.

## What was missing from my fourteen

The review confirmed all fourteen and then listed what it had that I did not.
In its priority order for a four-target compiler, with my judgement of each:

1. **Cross-runtime divergence of the same operation, as a hazard in its own
   right.** Absent from my list and, in its words, my most expensive failure
   mode. It is also demonstrably right: every temporal bug fixed in this
   repository today was of exactly that shape, and two more were found by
   following this item — see `ideation/0258`, where sub-second precision
   diverges four ways and `NOW` is the transaction's clock on SQL and the
   call's clock elsewhere, both measured.
2. **tzdata is a versioned dependency, not a static asset.** Four runtimes,
   four copies, four release cadences: PostgreSQL ships its own, Python needs
   the `tzdata` package on Windows, Node needs full-icu, and **Alpine ships
   none and musl falls back to UTC with no error**. Two services in one
   deployment can hold different beliefs about the same zone. Nothing in Elo
   touches this today, and nothing would — until a declared IANA zone arrives,
   at which point it becomes a deployment requirement Elo has to state.
3. **Lenient parsing.** All four targets parse differently and PostgreSQL's
   `DateStyle` GUC flips `DMY` against `MDY`. Elo is already right here by
   accident: literals are emitted as explicit constructors, not host parses.
   Worth asserting on purpose — a fixture that would fail if any emitter ever
   reached for `Time.parse` or `new Date(string)`.
4. **A serialisation contract Elo owns.** JSON has no date type, and the four
   targets disagree: `JSON.stringify(Date)` always `Z`, `TimeWithZone#to_json`
   an offset, Python's `json.dumps` **refuses**, `to_jsonb(timestamptz)`
   ISO+offset. This is `ideation/0153`'s neighbourhood (`String()` doing two
   jobs) and is the stronger reason to settle it.
5. **Precision and range as language-level decisions.** Now measured and filed
   as `ideation/0258` §2: JS milliseconds, Python and PostgreSQL microseconds,
   Ruby nanoseconds, four overflow behaviours for the range, one of which is
   "no error".
6. **Test across zones and seasons with an injectable clock.** The review calls
   this the only way four-target divergence gets caught, and names the fixture
   zones worth having: `Australia/Lord_Howe` (**30-minute** DST),
   `Pacific/Chatham` (+12:45), `Antarctica/Troll` (**2-hour** DST),
   `Pacific/Apia` (skipped a whole day), `Asia/Kathmandu` (+5:45), plus both
   transition nights. `0240` added `TZ=America/Los_Angeles` to my own routine
   and that was enough to find a bug; this list is the generalisation, and it
   belongs in CI rather than in a habit.
7. **`timestamp` versus `timestamptz` on the PostgreSQL target is semantics,
   not an implementation detail.** Elo emits `timestamp` (zone-free), which is
   exactly right for the model — and `P1D == PT24H` holds for `timestamp` and
   **does not** for `timestamptz`, where PostgreSQL treats a day as a calendar
   day. So the current choice is load-bearing and should be written down as a
   decision instead of surviving as a default.
8. **`year + 1` on a 29 February, and invalid components.** Elo models leap
   days, so it needs a stated rule for `1900-02-29`, for year 0, and for
   `24:00:00` — which PostgreSQL accepts and Python rejects.
9. **Monotonic time.** Structurally inexpressible in a wall-clock-only
   language, which is the honest answer rather than a gap to close.
10. **Recurrence.** Local time plus a rule is the *correct* representation,
    which the review says most systems get wrong and Elo gets right — but
    firing a schedule needs an instant, which the model has exported. Elo can
    express the rule and not the trigger. Worth one sentence in the docs.
11. **Declared out of scope** rather than silently omitted: non-Gregorian
    calendars, CSV and spreadsheet date pipelines, last-write-wins clock skew,
    leap seconds.

Two of its families bear on Elo not at all and are worth naming so nobody
looks for them: abbreviations like `CST` treated as identifiers (Elo parses no
zone names), and zone inferred from locale or IP (Elo infers nothing).

## Scoreboard

| # | mistake | avoided by construction | needs (A) | open elsewhere |
| --- | --- | --- | --- | --- |
| 1 | local time with no zone | ✓ | | |
| 2 | a day is 24h | ✓ | | docs |
| 3 | a month is 30 days | | | **0220** |
| 4 | arithmetic in the wrong calendar | ✓ | ✓ | |
| 5 | the server's timezone | | **✓** | 0180 |
| 6 | truncating in the wrong zone | partly | **✓** | |
| 7 | instant vs wall clock — **the MUST** | | **✓** | |
| 8 | a future appointment as an instant | ✓ | | docs |
| 9 | ambiguous / non-existent local times | ✓ | | (B) would break this |
| 10 | which day the week starts | ✓ | | docs |
| 11 | an offset is not a zone | | ✓ | **0255 §4** |
| 12 | ordering across a fall-back | ✓ | | |
| 13 | app clock vs database clock | | partly | `$.now`, later |
| 14 | the host hands in an instant | | cost | host contract |

Nine of fourteen are already avoided by the wall-clock model — which is mostly
`0240`'s doing and was not designed for, so it is worth noticing. Four need the
declared zone. One (#3) belongs to `0220`.

## What this means for `--timezone` vs `$.timezone`

The declared zone is used in **two places, both boundaries**, and nowhere else.
That is a small enough surface that *either* mechanism works, which is the
useful conclusion:

* `eloc --timezone Europe/Brussels` — a compile-time constant. Covers the 80%
  by your own estimate, no language change, no second parameter, no harness
  work, and the emitted code keeps no runtime dependency on a context.
* `$.timezone` — needed only for one artifact serving many zones.

**They are not alternatives; they are the same value with two lifetimes.**
`--timezone` sets the default that the context read falls back to. So:

1. Do this task's decision first — adopt (A), or reject it.
2. Then `--timezone`, which delivers #5, #6, #7 and half of #11 against a
   constant, and is where the acceptance assertions get written. This is the
   step that makes `TZ=UTC` stop being load-bearing (`0180`).
3. Then `$` (`0261`) when, and only when, a real deployment needs two zones at
   once — with `--timezone` as its default.

That ordering means no work is wasted whichever way question 1 of `0261` is
eventually answered, and the simple answer to the thing developers actually get
wrong arrives at step 2 rather than after a language extension.

## Decisions needed from you

0. **The trilemma, which the review surfaced and which outranks the rest.**
   The MUST, the no-fold invariant, and "today means the author's day" — any
   two. My reading is take the MUST and usefulness, and pay for the invariant
   narrowly: the exposure is `NOW` in a non-UTC declared zone across the one
   hour a year the zone folds, where Elo would give a confident wrong answer
   that no value in the language can report. The alternatives are a
   fixed-offset-only declared zone (internally honest, useless half the year
   in any DST zone) or UTC-only with no declared zone (sound, and tells a
   Brussels author to do their own day arithmetic). **This is the decision.**

1. **Adopt (A)?** `NOW`/`TODAY` become zone-free wall clocks read in a declared
   zone, default `UTC`. This is the MUST, and it is downstream of 0.
2. **The host contract (#14).** Elo takes wall clocks; a host-supplied zoned
   instant must be coerced. Accepting this changes a README example. The
   alternative is to keep `NOW` host-zoned and give up on the MUST.
3. **Offset-bearing literals (#11).** Convert at the boundary using the
   declared zone, or refuse them in the lexer? Refusing is cheaper and more in
   keeping with the design order; converting is more powerful and needs the
   boundary rule written down once.
4. **Is "Elo has no instants" the sentence we want in the docs?** It is the
   whole model in four words, and it is a strong claim to put on the website.

5. **The two bugs found on the way** are filed separately as `ideation/0258`
   and need none of these answers: Ruby's duration accessors truncate the
   fractional second, and `NOW` is the transaction's clock on SQL. Both
   measured, both red-firstable today.
