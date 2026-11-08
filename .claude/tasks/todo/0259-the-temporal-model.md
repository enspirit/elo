# The temporal model, decided

> **Step 1 is done** (`SPEC`/`IMPL`/`SPEC`/`FIX`/`DOC`, five commits).
> `--timezone` exists on `eloc` and `elo`; `NOW`/`TODAY` read the declared zone
> through one helper per target, with the zone as its *argument* so it travels
> with the program; the zone axis runs the temporal corpus in three zones; the
> `one-clock.elo` fixture is green on four targets in four zones. Measured:
> with the host in UTC, all four targets answer the same minute-of-day for
> every declared zone. Closes `ideation/0180` and `0255` §3 and §5.
>
> Two bugs were found on the way and fixed in their own commits:
> `Date(datetime)` was the identity on Ruby (`todo/0260` §2), and
> `date_trunc` resolved to PostgreSQL's `timestamptz` overload, so a zone-free
> SQL literal acquired the session's zone — found by the zone axis on its first
> run, red only outside UTC, and in the corpus unnoticed since `0240`.
>
> **Next: step 2**, the inbound boundary (`D7`).
>
> One correction to `D2` from doing it: "the zone appears exactly once per
> emitted program" was the wrong invariant. Python's and SQL's helpers live in
> a prelude installed once, separately from any compile, so a zone held inside
> a helper would belong to the *deployment* — and a program compiled for one
> zone could run against a prelude built for another with nothing to detect it.
> The zone is therefore an **argument** to the helper, which is both uniform
> across the four targets and closer to what `$.timezone` needs. The invariant
> that survives, and is machine-checked: **no emitter spells the conversion
> itself; the zone reaches the emission only as an argument to the one clock
> helper.**

> This is the decision record for Elo's handling of dates and times. It
> supersedes the open questions in `analyzed/0256-*` and
> `analyzed/0258-*`, which stay as the evidence behind it.
>
> Everything below was measured on this branch at 2026-11-08, on four targets
> under four host zones: `UTC`, `America/Los_Angeles`, `Pacific/Chatham`
> (+12:45) and `Asia/Kathmandu` (+5:45).

## The finding

**Elo has two clocks and they do not agree.** A literal is a zone-free wall
clock (`0240`). `NOW` and `TODAY` read the host's ambient zone. Mixing them is
what an author does all day:

| assertion | JS | Ruby | Python | SQL |
| --- | --- | --- | --- | --- |
| `let t = NOW in startOfDay(t) == TODAY` | ✓✓✓✓ | ✓**XXX** | ✓✓✓✓ | ✓✓✓✓ |
| `let t = NOW in inHours(t - startOfDay(t)) >= hour(t)` | ✓**XX**✓ | ✓✓✓✓ | ✓✓✓✓ | ✓✓✓✓ |
| `let t = NOW in inHours(t - startOfDay(t)) < hour(t) + 1` | ✓✓✓**X** | ✓✓✓✓ | ✓✓✓✓ | ✓✓✓✓ |
| `let t = NOW in Date(t) == TODAY` | ✓**XXX** | **XXXX** | ✓✓✓✓ | ✓✓✓✓ |

Four cells per target, in the zone order above. Python and SQL are green
because they are naive *everywhere* — internally consistent by accident. JS and
Ruby are the mixed ones. **CI runs in UTC, which is the one column where
almost everything agrees** — that is why none of this is red today.

## The model

> **Elo has no instants. A Date or a Datetime is a wall clock.** Arithmetic on
> wall clocks is calendar arithmetic with no DST, so a day is always a day.
> A timezone is used **only at the edges**, in three places: reading the host's
> clock (`NOW`, `TODAY`), converting a value that arrives from outside
> (`Date(x)`, `Datetime(x)`), and converting one on the way out on purpose
> (`instantOf`). That zone is **declared**, defaults to `UTC`, and is the same
> on all four targets.

One declared zone, used only at the edges, no zones inside. That is the whole
of it.

Note what this is *not*: it is not a refusal to deal with instants. Instants
arrive and leave all day — they are ISO-8601 with an offset, which is what
data looks like. The model's claim is narrower and stronger: Elo holds no
instant as a **value**, so no Elo expression can be wrong about one. See `D7`.

Nine of the fourteen classic date/time mistakes catalogued in
`analyzed/0256-what-developers-get-wrong-about-time.md` are avoided by this
model by construction; four need the declared zone; one belongs to `0220`.

## The decisions

### D1 — Elo has no instants

Adopted, and it is the sentence that goes on the website. `NOW` and `TODAY`
become zone-free wall clocks read in the declared zone. Literals do not move:
pushing a zone *into* a literal would re-open `0240`, bring back DST, and admit
ambiguous and non-existent local times that Elo has no value for today.

**Verified implementable on all four targets** — one expression each, measured
side by side from a host in `America/Los_Angeles` with the declared zone
`Europe/Brussels`, all four answering the same `12:53` wall clock:

| target | expression |
| --- | --- |
| JS | `DateTime.now().setZone(TZ).setZone('utc', { keepLocalTime: true })` |
| Ruby | `Time.now.in_time_zone(ActiveSupport::TimeZone[TZ]).to_datetime.change(offset: 0)` |
| Python | `datetime.now(ZoneInfo(TZ)).replace(tzinfo=None)` |
| SQL | `CURRENT_TIMESTAMP AT TIME ZONE TZ` |

The Ruby form is a pure expression — no `Time.zone=` global assignment, which
the Ruby grammar gate would reject — and it preserves the sub-second.

Pinning `NOW` also repairs `hour` for free: `hour` emits `.toUTC().hour` on JS,
which is right for a UTC-labelled value and wrong for a host-zoned one. Once
`NOW` is UTC-labelled like everything else, the accessor stops reading a
second clock. One fix at the boundary, two bugs closed.

### D2 — The zone is a **runtime** value. `--timezone` sets its default

**`$.timezone` is the destination, not the fallback.** An Elo function becomes
a web service, and a web service is called from many zones; a zone frozen at
compile time makes little sense in the long run. So the end state is
`$.timezone`, read per call, and `eloc --timezone <IANA>` is the *default* that
read falls back to when the host passes no context. Default of the default:
`UTC`.

`--timezone` alone ships first, as a shortcut. What matters is that the
shortcut is not a different design, so there is nothing to refactor when `$`
lands. One invariant buys that:

> **The declared zone appears exactly once per emitted program, in the
> prelude.** Every site that needs it calls a helper; no emission site ever
> inlines the zone.

So `NOW` emits `kNow()`, not `DateTime.now().setZone("Europe/Brussels")…`, and
the prelude's single definition is the only thing that changes when the zone
stops being constant. That invariant is machine-checkable in the shape this
repo already uses for the grammar gate: compile the corpus and the zone string
must occur once per program.

It is also the only form that is **safe**, which is not a coincidence —
CLAUDE.md's rule is that a host-supplied value is never interpolated into
target syntax. One place means one `IANAZone.isValidZone` check, and on SQL it
means `AT TIME ZONE <parameter>`, never `AT TIME ZONE '<interpolated>'`.

**One consequence to see before committing.** When the zone becomes a context
read, every program that touches `NOW`, `TODAY`, `Datetime(x)` or `instantOf`
(D7) *references the context* — so on SQL, `usesContext` is true and `$2` must
be bound for nearly every temporal program. That is the real cost of `$` and
it lands on the host contract, not on Elo. It is the right cost, but it should
be a decision rather than a discovery.

`todo/0261` is therefore **on the path, not parked**: it is the task that
follows the five steps below, and its closed-schema and `$2` decisions stand
as written.

### D3 — The fold is accepted, once, in writing

A declared IANA zone can fold: read as a Brussels wall clock, 02:30 happens
twice on 2026-10-25. The honest statement of the exposure, which is narrower
than it sounds:

* Literal arithmetic keeps the no-DST invariant **absolutely** — a literal
  never samples a clock.
* Within one evaluation, every `NOW` reading is microseconds from every other,
  so a fold cannot separate them.
* The exposure is therefore confined to comparing two clock readings taken a
  real hour apart across the transition — which is **measuring elapsed real
  time, something Elo already declares it cannot do.**

So this adds no new *kind* of limitation; it is the already-accepted one
surfacing at the host boundary. That is the price of "today" meaning the
author's calendar day, and it is worth paying: a fixed-offset-only zone would
be internally tidier and wrong half the year in any DST zone.

**Documented, not discovered.** The reference page says: Elo cannot measure
elapsed real time across a DST transition; `P1D` is always `PT24H`.

### D4 — A literal carries no zone, so you cannot write one

`D2026-01-01T00:30:00+02:00` is refused by the lexer. So is `Z`. One rule, no
exception: a Datetime has no zone, so a zone designator in the source is a lie
about the value.

This also settles a live 3-against-1 divergence
(`ideation/0255` §4, measured): `hour(D2026-01-01T00:30:00+02:00)` is `22` on
JS and `0` on Ruby, Python and SQL — the three silently discard an offset the
author wrote, which is the worse of the two behaviours. Refusing it is the
third answer, and it is the one that fits "restrict Elo's powerfulness rather
than violate portability".

**Migration is mechanical and the diff is reviewable.** `Z` appears ~250 times
across `test/fixtures/`. Dropping it is semantically a no-op — measured: on
Python and SQL the emission is byte-identical, and on JS and Ruby the only
change is the `Z` deleted from inside the emitted date string, because
`{ zone: "utc" }` and offset `0` already agree. So the regenerated diff should
contain nothing but deleted `Z` characters, and any other line in it is a
second bug.

### D5 — Millisecond precision, declared; finer is refused

JavaScript's millisecond floor is the binding constraint. `PT0.0005S` becomes
a parse error that says so, rather than surviving on three targets and
vanishing on one. Measured today:

```
D2026-01-01T00:00:00 + PT0.000001S == D2026-01-01T00:00:00
```

is **true on JS** and **false on Ruby, Python and SQL** — one line, two
answers, nothing asserting either.

Truncating silently instead would be the quiet-wrongness class this project
keeps paying for; emulating microseconds on JS buys a precision no Elo
expression has asked for.

Ruby's duration accessors must stop truncating at the same time
(`analyzed/0258` §1): `inSeconds(PT0.001S)` is `0.0` on Ruby and `0.001` on
the other three, because every accessor calls `.to_i` before dividing.
Measured red on Ruby in all four zones.

### D6 — `NOW` on SQL is the transaction's clock, and says so

`CURRENT_TIMESTAMP` is frozen at transaction start, so a host evaluating two
expressions in one transaction gets one `NOW` on SQL and two elsewhere
(`analyzed/0258` §3). Transaction time is a defensible semantic and
`clock_timestamp()` would cost `VOLATILE` — no index, no generated column.

**Decision: keep it, and write it down.** The divergence is declared rather
than removed. Doing better needs a sampled-once-per-evaluation clock, which
needs `$.now`, which is `0261`'s business.

### D7 — Instants are welcome at the boundary, in both directions

"No instants" is a statement about Elo's **values**, not about its **edges**.
Dates and datetimes arrive in `_` as data and leave as output, that data is
ISO-8601, and ISO-8601 carries offsets. Refusing them at the edge would make
the model unusable; the rule is that they are *converted*, not *kept*.

> **Inbound:** an instant is converted to a wall clock in `$.timezone`.
> **Outbound:** a value is rendered as the wall clock it is — no offset.
> **To leave the model on purpose:** one explicit function, `instantOf(t)`.

**Inbound, the rule is already right on one target and the "majority" was
wrong.** `hour(Datetime(_.t))` for `_.t = "2026-01-01T00:30:00+02:00"`:

| | answer | what it did |
| --- | --- | --- |
| JS | **22** | converted the instant to a UTC wall clock — *exactly the rule, at the default zone* |
| Ruby, Python, SQL | 0 | `DateTime.parse` and friends keep the written clock and discard the offset |

`ideation/0255` §4 called this three-against-one and doubted the majority.
With the rule written down the minority is simply **correct**, and the other
three are the work. That is worth noting as a correction: the divergence was
not a coin toss, it was three targets missing a conversion.

**Outbound is where the model is contradicted today.** Measured, on JS:

| expression | output | the problem |
| --- | --- | --- |
| `D2026-01-01T10:30:00` → `-o json` | `"2026-01-01T10:30:00.000Z"` | a `Z` the value does not have — it claims an instant |
| `D2026-01-01` → `-o json` | `"2026-01-01T00:00:00.000Z"` | **a Date serialised as a datetime** |
| `NOW` → `-o json`, `TZ=America/Los_Angeles` | `"2026-11-08T05:00:50.878-08:00"` | the **host offset leaks into the output** |
| `String(D2026-01-01T10:30:00)` | `"D2026-01-01T10:30:00"` | a third rendering, with the Elo `D` prefix |

So one value has three renderings, two of them assert a zone it does not have,
and one of those varies with the host's `TZ`. This is the two-clocks bug again,
at the other edge. **The decision:**

* A Datetime renders `2026-01-01T10:30:00` — ISO-8601 local form, no `Z`, no
  offset, host-zone-independent, identical on four targets.
* A Date renders `2026-01-01`. A Date is not a datetime.
* `String()` keeps its own job; `ideation/0153` is now narrower, not blocked.

**`instantOf(t)` is the sanctioned exit.** It resolves a wall clock in
`$.timezone` and returns an ISO-8601 **String** with the offset —
`"2026-01-01T10:30:00+01:00"`. It returns a String deliberately: there is no
`Instant` *type*, so the type system stays at two temporal types and the call
reads as what it is, a boundary operation.

This is the **ambiguous direction** (wall clock → instant), so it is the one
place in Elo that needs a gap/fold policy, and having exactly one such place is
the payoff for keeping it out of serialisation. The policy must be stated, not
defaulted silently: **on a fold take the earlier instant; on a gap, fail.** A
gap means the author named a wall clock that does not exist in that zone, which
is a data error and `0158`-style failures already exist to report it.

`instantOf` is also what makes a schedule *trigger* expressible, which the
price list below had as forbidden. It is the single function that moves several
rows of that list.

## What is deliberately not decided here

Each would bloat this task and none blocks it:

* **The nominal length of a calendar unit** — `inDays(P1M)` is 30 / 30.436875 /
  30 / 30 and `inDays(P1Y)` is 365 / 365.2425 / 365 / 365.25. Four targets,
  three answers. `ideation/0220` owns it.
* **The expressible range.** Python raises outside years 1–9999, luxon goes
  `Invalid`, PostgreSQL errors, Ruby succeeds unbounded. Recommended answer:
  clamp the language to `0001`–`9999` and make `BOT`/`EOT` mean it.
* **What `String()` of a datetime renders.** `D7` settles the *data* contract
  (JSON and `-o json`); `String()` is a separate question and still
  `ideation/0153`'s. D7 narrows it rather than answering it.
* **Epoch conversion.** An epoch integer is an instant, so under D7 it is a
  legitimate thing to accept inbound and produce via `instantOf`-style exit.
  Nothing blocks it; it is simply not designed yet.
* **A stable evaluation clock** — one `NOW` reading per evaluation. The right
  rule; needs `$.now` to implement and to test without flakiness.
* **Format patterns.** None exist. When they land, do not expose a `YYYY`-style
  token: the week-year bug (`YYYY` vs `yyyy`) is invisible fifty-one weeks a
  year and cost Twitter five hours in 2014.

## What the model forbids

The decisions above buy portability by *removing* expressiveness, so the
honest statement of them is the list of programs an author cannot write. This
section is the price list.

**Read the failure mode first, because it is not uniform.** Some of these are
refusals — the compiler says no, which is the good case. Others Elo answers
**confidently and wrongly**, because a wall clock is totally ordered and every
operation on one succeeds. Those are marked ⚠ and they are the ones that
belong in the documentation, since a refusal teaches the author and a wrong
number does not.

### Forbidden by "Elo has no instants" (D1)

These cannot be added without re-opening the model.

| an author wants | why not |
| --- | --- |
| ⚠ **Elapsed real time across a DST transition.** "How long was the night shift?" | Measured: `inHours(D2026-03-08T04:00:00 - D2026-03-08T01:00:00)` is **3** on all four targets. In `America/Los_Angeles` that night elapsed **2** real hours. Elo answers 3 and reports nothing. Any hourly billing, SLA, uptime or latency figure spanning a transition is wrong by the offset. |
| ⚠ **Ordering or deduplicating events recorded in different zones.** "Did the Brussels order arrive before the Tokyo one?" | Comparing two wall clocks from two zones is meaningless, and `<` answers anyway. |
| **Zone conversion.** `toZone(t, 'Asia/Tokyo')` | There is no instant to re-express, and the target zone would be a second zone, which D2 does not have. Verified absent today: no `toZone`, no `setZone`, no epoch function in any binding. |
| **Monotonic or stopwatch time.** "How long did this take?" | Structurally inexpressible: no monotonic clock, and within one evaluation every `NOW` is the same reading (on SQL, the same for the whole transaction — `D6`). |
| **Gap/fold disambiguation.** "This appointment is 01:30 on the fall-back night — which one?" | The API can only *force* this choice, never make it; Elo has nowhere to put it. Note the direction: converting an instant *to* a wall clock is always unambiguous, which is all `D1`'s two boundaries ever do. The reverse is ambiguous and happens **after Elo returns** — in the host, or in PostgreSQL on a write to `timestamptz`. Elo can hand back a Datetime that is ambiguous or non-existent where it lands. |

### Bought back by D7

Three rows left the list above once instants were allowed at the edge, which
is the measure of how much `instantOf` is worth:

| an author wants | now |
| --- | --- |
| **Rendering an instant.** `…T09:30:00+01:00` for an API response | `instantOf(t)` |
| **The firing instant of a schedule.** "When does 'every Monday 09:00' run?" | `instantOf(nextMonday)`. Elo expresses the rule — local-time-plus-rule is the *correct* representation, which most systems get wrong — and now also the trigger. |
| **Accepting an offset-bearing timestamp** from a web request or a database | `Datetime(_.t)`, converted to `$.timezone` |

What stays forbidden is the *type*: there is no Instant to hold, compare or
sort. `instantOf` renders one and hands it out. That is the line the model
draws, and it is a different line from "instants are not allowed near Elo".

The fall-back case is sharper than it looks. Asked the same question across
`2026-11-01T01:00` → `04:00` in Los Angeles, luxon answers **3** — it resolved
the ambiguous 01:00 to the later of its two instants. Pick the earlier and the
true answer is 4. So even the "correct" elapsed time there depends on a policy
Elo has nowhere to express, which is the argument for refusing the question
rather than answering it.

### Forbidden by "one zone, declared at compile time" (D2)

These would be lifted by `$.timezone` (`todo/0261`), and they are the case
that would justify building it.

| an author wants | why not |
| --- | --- |
| **One artifact serving many zones.** 35 client organisations, one compiled formula | The zone is baked in at compile time. The workaround is to compile once per zone. |
| **A per-row zone.** `orders` carrying `order_time` and `tz` per row | Note what *does* work: "placed before 09:00 local time" is a pure wall-clock comparison and is fine. It is "placed in the last hour *globally*" that needs instants and is forbidden by D1 as well. |
| **A per-user zone.** "Show each attendee the meeting in their own clock" | Needs the zone at call time. |

### Forbidden by D4 and D5

| an author wants | why not |
| --- | --- |
| **An offset in a literal.** `D2026-01-01T00:30:00+02:00`, or `Z` | Refused by the lexer. Today it means two different things on four targets, which is worse. |
| **Sub-millisecond precision.** `PT0.0005S`, high-resolution event ordering | Refused by the lexer; JavaScript's floor is the binding constraint. |

### Absent, but not forbidden

Worth separating, because these are missing features the model would happily
accept later — not consequences of it:

* **Business days.** "Due in 5 working days", holiday calendars, working hours.
  Wall clocks are exactly the right representation for this; nothing blocks it.
* **Format patterns.** `format(t, …)` — see the `YYYY` warning above.
* **A time-of-day type.** Elo has `date`, `datetime` and `duration` and no
  `Time` — verified in `src/types.ts`. "Every day at 09:30" has no value to
  name the 09:30.
* **Week-of-year, quarter-of-year and the rest of the calendar accessors**
  beyond `year`/`month`/`day`/`hour`/`minute`.

### What still works, and is most of what people write

Stated so the price list is not read as a warning about the whole language.
All of these are pure wall-clock computations and all four targets agree:
"orders placed today", "due in 30 days", "overdue", "this month's total",
"records from the last 24 hours" (both sides go through the same declared
zone), "before 09:00 local", "the same wall clock tomorrow", period boundaries,
and all calendar arithmetic including leap days and month-end clamping.

The model's bet is that this set is the overwhelming majority of what an
analyst-facing expression language is asked to do, and that the forbidden set
is better refused than silently approximated. The ⚠ rows are where that bet
is not yet honoured, because they are approximated silently today.

## The acceptance corpus

One new fixture, `test/fixtures/stdlib/datetime/one-clock.elo`. Every line is
an assert, every line is **host-zone-independent by construction** — which is
the property under test, so none of them hardcodes a date or a zone:

```elo
# NOW and TODAY are the same calendar day, in every host zone.
assert(let t = NOW in startOfDay(t) == TODAY)
assert(let t = NOW in Date(t) == TODAY)
assert(day(NOW) == day(TODAY))
assert(month(NOW) == month(TODAY))
assert(year(NOW) == year(TODAY))
# The hour of NOW is the time since the day began, not the host's offset.
assert(let t = NOW in inHours(t - startOfDay(t)) >= hour(t))
assert(let t = NOW in inHours(t - startOfDay(t)) < hour(t) + 1)
```

Measured status **before** any fix, in the four zones above:

| line | red on |
| --- | --- |
| `startOfDay(t) == TODAY` | **Ruby**, outside UTC (3 of 4 zones) |
| `Date(t) == TODAY` | **Ruby**, all four zones · **JS**, outside UTC |
| `inHours(…) >= hour(t)` | **JS**, in `America/Los_Angeles` and `Pacific/Chatham` |
| `inHours(…) < hour(t) + 1` | **JS**, in `Asia/Kathmandu` (+5:45) |
| the `day`/`month`/`year` trio | nothing — they hold today, and are the regression guard for D1 |

`let t = NOW` is not decoration: it takes one clock reading, so the assertion
cannot flake when two readings straddle an hour boundary.

### The harness needs a zone axis, and SQL is the trap

These assertions are green under `TZ=UTC` and red elsewhere, so the axis *is*
the test. Add a zone pass to `test-all.sh` over the temporal fixtures, in the
shape `ELO_OPTIMIZE` already has, with three zones: `UTC`,
`America/Los_Angeles` (west, DST) and `Pacific/Chatham` (+12:45, east, DST,
quarter-hour offset).

**Measured trap:** the SQL target does not see `TZ` at all. libpq does not
forward the client's zone, so the session keeps the server's and the whole
zone axis silently tests nothing on SQL. It has to be
`PGOPTIONS='-c TimeZone=…'`. This cost one wrong measurement while writing
this task — the first probe run showed SQL green in every zone, and it was
green because it had not been asked.

This also finally answers `ideation/0180` — "the acceptance suite only passes
when the machine's timezone is UTC" — by making `TZ=UTC` stop being
load-bearing instead of exporting it in the runners.

## The work, in order

Five commits, each with its assertion seen red first. The boundary moved
earlier than the first draft had it: it is not a trailing refinement, it is
half of what makes the model usable.

1. **The zone indirection, and one clock.** `--timezone` on `eloc` and `elo`;
   the prelude helper per target with the zone appearing **once** (D2); the
   check that it appears once; `NOW`/`TODAY` through it on four targets (D1);
   the zone axis in `test-all.sh`; the fixture above. Closes `ideation/0180`
   and `0255` §3.
2. **The inbound boundary.** `Date(x)` / `Datetime(x)` convert an arriving
   instant to a wall clock in the declared zone (D7). JS is already correct at
   the default zone; Ruby, Python and SQL need the conversion written for the
   first time.
3. **The outbound boundary.** A Datetime renders with no `Z`, a Date renders as
   a date, neither varies with the host's `TZ` (D7). Four measured defects to
   turn red first. Then `instantOf`, with the fold-earlier / gap-fails policy
   asserted on both transition nights.
4. **No zone in a literal.** Lexer refusal, parser unit tests, and the
   ~250-occurrence fixture migration whose diff must be nothing but deleted
   `Z` characters (D4). Closes `0255` §4.
5. **A declared precision.** Lexer refuses sub-millisecond; Ruby's `inX`
   accessors stop truncating (D5). Closes `0258` §1 and §2.

Then, as its own task: **`$` replaces the compile-time default**
(`todo/0261`). Step 1's invariant is what keeps this from being a
refactor — one definition per target changes, and no emission site does.
The harness is the real work there, as `0261` says: no `$` assertion can be
written until the four acceptance runners can supply a context.

### The host contract changes, and that is the cost of the model

Elo's **values** are wall clocks, so a host handing in a zoned instant — the
README's `inThisWeek(DateTime.now())` — needs a rule. D7 gives it one:
`Datetime(x)` converts it in the declared zone. But `--input-type` does not
apply it for you: a declared type is a promise and `_.i` reads the raw value
uncoerced (`done/0253`), so an uncoerced `_` is still a host-zoned instant
being treated as a wall clock.

The contract is therefore: **pass a zone-free value, or coerce in the
expression.** The README example changes in step 2, and this is the one place
the model is not free.

## Documentation

Per CLAUDE.md: README without detail, website with an example. The model is
four sentences and belongs on the Reference page beside the temporal stdlib.

**The price list is half the documentation**, and *What the model forbids*
above is its source. Three things in particular have to be stated rather than
left to be discovered, because an expert will reach for them and get a number
instead of a refusal:

* **No elapsed real time across a DST transition** (D3) — the ⚠ rows. A shift
  from 01:00 to 04:00 on a spring-forward night answers 3, and lasted 2.
* **`P1D` is always `PT24H`.** An expert expects these to differ and here they
  do not.
* **`+ P1M - P1M` is not the identity.** `D2026-01-31 + P1M - P1M` is
  `D2026-01-28`. Elo clamps, on purpose, and clamping has no inverse.

The honest framing for the page is the one this task is built on: Elo removes
the timezone's irregularities and keeps the calendar's. Say what that buys —
four targets that agree — and say what it costs, in the same breath.
