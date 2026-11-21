# A second parameter, called context

> **Renumbered from 0257. Committed, and scheduled after the five steps of
> `todo/0259-the-temporal-model.md`** — which is why the number moved: the
> todo list is taken in alphabetic order, and this comes after `0259`.
>
> `0259`'s `D2` settles the question this document left open at the bottom
> ("is the multi-context case real enough to justify `$` at all?"). The answer
> is **yes, and it is the destination, not a contingency**: an Elo function
> becomes a web service, a web service is called from many zones, and a zone
> frozen at compile time makes little sense in the long run. `eloc --timezone`
> ships first as the *default* that `$.timezone` falls back to, not as a rival
> design.
>
> So the Bricks question below — do those 35 organisations span more than one
> timezone? — is no longer a gate on building this. It is still worth asking,
> but only to decide *when*.
>
> **What `0259` step 1 owes this task, and the reason it is not a refactor:**
> the declared zone appears exactly once per emitted program, in the prelude,
> and every site that needs it calls a helper. When `$` lands, one definition
> per target changes and no emission site does.
>
> **What this document still owns:** the closed schema with `$.request` as the
> `Data`-typed escape hatch, `$2` on SQL emitted if and only if `$` is
> referenced, and the harness work — which remains the part with the most
> unknowns, since no `$` assertion can be written until the four acceptance
> runners can supply a context.
>
> **One thing `0259` adds to the cost side.** Once the zone is a context read,
> every program touching `NOW`, `TODAY`, `Datetime(x)` or `instantOf`
> references `$` — so on SQL, `usesContext` is true and `$2` must be bound for
> nearly every temporal program. The *Emission, per target* section below was
> written assuming `$` would be rare. It will not be rare.

> Proposal for review. Nothing here is implemented. The second half is the
> feasibility analysis you asked for on moving the hardcoded `'utc'` into it,
> and its answer is **no, not the literals** — for a reason worth reading
> before deciding the rest.
>
> **Decided (review round 1).** Closed schema, no `$.now` for now, and `$2` on
> SQL is acceptable *if and only if* `$` is referenced. Those three are folded
> into the body below.
>
> **Superseded in part by `0256`, which must be decided first.** Question 1 —
> whether the multi-context case justifies `$` at all — turned out to be the
> wrong question to ask first. Measuring what Elo actually does with time
> (`0256`) shows that a declared timezone is used in exactly **two** places,
> both boundaries, and that `--timezone` and `$.timezone` are therefore not
> alternatives but the same value with two lifetimes: the flag sets the default
> that the context read falls back to. So `--timezone` comes first regardless
> of how question 1 is answered, and `$` is wanted only when one artifact must
> serve two zones at once.
>
> One conclusion below also needs reading with `0256` beside it. The
> feasibility section says "not the literals", which stands — but it implied
> the *"`NOW` and a literal must share a timezone"* requirement could not be
> met cheaply. It can: by pulling `NOW` into the literals' zone-free clock
> rather than pushing the literals into `NOW`'s. `0256` has the measurement
> and the two options priced.

## The contract today

Every Elo program is `output = f(input)`, and `input` is spelled `_`:

```
(function(_) { … })                     // JavaScript
->(_) { … }                             // Ruby
(lambda _: …)                           // Python
… $1 …                                  // SQL, where `_` is the parameter
```

Four emitters, one shape. `usesInput(ir)` reports whether `_` was referenced,
so a host knows whether it has to supply anything.

## What is proposed

`output = f(input, context)`, where `context` is spelled `$`:

```elo
$.timezone                      # 'Europe/Brussels'
startOfDay(NOW)                 # ... computed in that zone
_.total > 0 and $.tenant.plan == 'pro'
```

`$` is a second **optional** parameter, emitted only when the program
references it. A program that does not mention `$` compiles to exactly the
bytes it compiles to today — which is the acceptance criterion, not an
aspiration: see *Backward compatibility is testable* below.

### Why in the language rather than at compile time

The cheaper design is a compile-time constant: `eloc --timezone Europe/Brussels`
bakes the zone into the emission, no language change, no new parameter, no
threading. It covers a single-tenant service completely, and it is a sound
thing to ship first.

It stops covering the case `$` is for: **one compiled artifact, many
contexts.** A formula compiled once and evaluated for 35 organisations in 12
timezones cannot bake the zone in; it needs the zone at call time. Same for
anything derived from the request rather than from the deployment. That is the
whole justification, and the proposal should be rejected if that case is not
real.

## The shape of the context

Your framing is "a standard receptacle of constants". The design question that
follows is whether it is a **closed schema the compiler knows** or an **open
bag**, and they are very different languages.

**Decided: closed, with one typed escape hatch.**

```
$.timezone        String     an IANA zone name; defaults to 'UTC'
$.locale          String     BCP 47; defaults to 'en'
$.request         Data       whatever the host put there: headers, claims, …
```

* A closed schema means `$.timezon` is a **compile-time diagnostic**, the
  checker knows `$.timezone` is a `String` without the author declaring
  anything, and `--optimize` can emit a typed operation on it. An open bag
  makes every read `any`, which is how `0157` and `0217` got their symptoms:
  Elo failing to refuse.
* `$.request` is the escape hatch, and it is `Data` — the same `jsonb`-shaped
  "I do not know this shape" Elo already has — so an author who wants
  `$.request.headers.authorization` coerces it like any other untyped data and
  the type system stays honest. HTTP headers genuinely have no schema the
  compiler can know; pretending otherwise would be the worse lie.
* Adding a key to the closed part is a decision somebody makes on purpose, in
  one place, like `ALLOWED_GLOBALS` and `public-surface.unit.test.ts`. The
  mechanism for that is the same: a table plus a test that fails when the
  table and the bindings disagree.

**Decided out, for now: `$.now`.** A context-supplied "now" would make `NOW`
deterministic — and therefore **mockable in a test**, which is the reason it
will come back. Two places in this repository are already waiting for it:

* `ideation/0180` — "the acceptance suite only passes when the machine's
  timezone is UTC". A mockable `NOW` is half of what would let the temporal
  corpus assert an answer instead of an inequality (`SOD <= NOW`), and the
  other half is `$.timezone`.
* Every `NOW`/`TODAY` assertion in `stdlib/date/temporal-keywords.elo` is a
  loose comparison against a date in 2020 or 2024, because a tight one cannot
  be written. That is a fixture promising less than it looks like it does.

Keeping it out of the first cut is right — it changes what `NOW` *means*, which
deserves its own decision rather than arriving as a side effect — but the
mechanism here must not make it harder. It does not: `$.now` is one more key in
the closed schema and one more default in `kContext`.

## Grammar

One token and one primary form:

```
primary -> … | '$'
```

`$` is currently a lexer error — `Unexpected character '$'`, measured — so
nothing in the language has to move to make room. The rest is free: `$` parses
as a variable named `$`, so member access, `fetch`, the type checker, the
precedence table and the IR walkers need no new node.

Two rules, both matching `_`:

* `$` cannot be shadowed. `let $ = …`, `fn( $ ~> … )` are refused, exactly as
  `_` is (`src/transform.ts:248`, `262` — the check is `name === '_'`, and
  becomes `name === '_' || name === '$'`).
* `$` cannot be assigned. Nothing in Elo assigns anything, so this is free.

**Simplicity cost:** one sigil, no new precedence, no new type, no new
construct. This is about the cheapest extension the language could take. The
expensive part is all in the emitters.

## Emission, per target

The sigil is `$` in *Elo*. What each target calls the parameter is the
target's business, and two of them cannot use `$`:

| target | parameter | why |
| --- | --- | --- |
| JavaScript | `(function(_, $) { … })` | `$` is a legal identifier |
| Ruby | `->(_, _ctx = nil) { … }` | **`$x` is a global variable in Ruby**, and `gate-ruby.rb` rejects a global reference by rule (`:gvar`, line 171). `_ctx` it is. |
| Python | `(lambda _, _ctx=None: …)` | `$` is not a legal Python identifier |
| SQL | `$2` | `_` is already `$1` |

Verified mechanically before writing this:

* Ruby `->(_, ctx = nil) {}` has arity `-2` and `.call(nil)` works, so every
  existing `.call(nil)` in the corpus keeps working.
* Python `(lambda _, ctx=None: …)(None)` works.
* JavaScript `f(1)` on a two-parameter function gives `undefined` for the
  second — so JS needs a default somewhere, and it cannot be `$ = $ || {…}`
  because the emitted-grammar gate forbids assignment (rule 5).

### Reads go through a helper, not through `.timezone`

```js
kContext($, "timezone")        // not  $.timezone
```

Three reasons, and they are the reasons the repository already has:

1. **Defaults.** `kContext` is the one place that answers `'UTC'` when the
   host passed nothing, so a program referencing `$.timezone` works when
   called as `f(input)`. One place, not four, and not an assignment.
2. **Validation.** A declared type is a promise, not a runtime check
   (`done/0253`). `$` is host-supplied, so `$.timezone` is a runtime-supplied
   value of a declared type, and the CLAUDE.md rule applies verbatim: a bare
   operation is safe only on a compile-time literal. `kContext` is where
   `IANAZone.isValidZone` gets called — measured: it answers `true` for
   `'Europe/Brussels'` and `'utc'`, `false` for `'Nope/Nope'` — so an invalid
   zone is an Elo failure rather than a luxon `Invalid DateTime` propagating
   silently into every subsequent operation.
3. **The grammar gate.** A static `$.timezone` read would need `timezone`,
   `locale`, `request` and every future key added to `ALLOWED_PROPERTIES` — a
   list that would then grow with the context schema, which is exactly what
   that list is *not* for. One helper keeps the allowlist a statement about
   what the emitted language may reach.

   `$` itself needs nothing: it is a bound parameter, not a free identifier,
   so `ALLOWED_GLOBALS` and Python's `ALLOWED_NAMES` are untouched.

`kContext` indexes by a key, so `helper-region.unit.test.ts` will demand it be
classified. The classification is `ownKeys`-adjacent but better: **the key is a
compile-time literal from the closed schema**, never a runtime value, so it
cannot be `__proto__`. That claim is checkable against the source, which is
what that test is for.

### SQL is the one that is not free, and that is accepted

**Decided:** `$2` appears in the emitted SQL *if and only if* the expression
references `$`. `$` is a four-target feature; it is not refused on SQL. So the
cost below is real and taken on purpose.

`$2` is a positional parameter with no default, so:

* `compileToSQLWithMeta` grows a `usesContext` beside `usesInput`, and a host
  that gets `usesContext: true` must bind two parameters. There is no way to
  make that invisible, and it should not be made invisible.
* A program that uses `$` but not `_` still has to emit `$2`, not `$1`,
  because the parameter *position* is part of the contract. `usesInput` false
  with `usesContext` true means "bind $1 to anything, $2 to the context" —
  worth stating explicitly in the host documentation rather than being clever.
* `$2` would be `jsonb`, and `($2->>'timezone')` reads a key. Measured:
  `PREPARE q(jsonb) AS SELECT $1->>'timezone'` works, and so does
  `TIMESTAMP '…' AT TIME ZONE $1` with a `text` parameter — so the zone can be
  a *parameter* rather than interpolated syntax, which is the only acceptable
  form. **A context value is never interpolated into target syntax**, on any
  target; that is the seam CLAUDE.md's security section is entirely about.

### Backward compatibility is testable

The acceptance criterion is mechanical: **regenerate the whole fixture corpus
and the diff is empty.** No program in `test/fixtures/` mentions `$`, so if any
`.expected.*` file changes, the second parameter is being emitted
unconditionally and the change is wrong. That is a better guarantee than a
promise in a commit message, and it is free.

Plus the host surface: `compile()` returns `f(input)` today and must keep
accepting a one-argument call. `public-surface.unit.test.ts` is where the new
`usesContext` field and any new export get decided.

## Work, in order

1. **Harness first.** The four acceptance runners and `elo`/`eloc` need a way
   to supply a context, or no `$` assertion can be written. `elo --context
   '{"timezone":"Europe/Brussels"}'`, and a fixture convention for it — a
   `.context.json` beside the `.elo`, read by all four runners, absent for
   every existing fixture. This is the part that is easy to underestimate.
2. Lexer and parser: the `$` token, the primary, the two refusal rules, and
   `parser.unit.test.ts` cases for the refusals.
3. The context schema in `typedefs.ts`, and the checker reading `$`.
4. `kContext` / `k_context` / `kContext` / an `elo_context` SQL function, with
   the defaults and the zone validation, in one place per target.
5. The second parameter in the four emitters, conditional on `usesContext`.
6. `NOW`/`TODAY` from `$.timezone` — the first and best use of it; see below.
7. README, and the Learn/Reference pages. `$` is a language construct, so
   CLAUDE.md's rule applies: README without detail, website with an example.

---

# Feasibility: moving the hardcoded `'utc'` into `$`

## The short answer

`'utc'` in the JavaScript emitter is **not the timezone knob.** It is the
marker that says *this target has no ambient zone*, and it is there because
three targets have none and JavaScript does. Replacing it with `$.timezone`
would not make Elo timezone-aware; it would make a date literal mean a
different instant in different contexts, re-opening `0240` by design and
falsifying what the corpus now asserts.

What *should* read `$.timezone` is a much smaller and much better-defined set,
and `0240` is what makes that set small.

## Where `'utc'` actually is

Six places, all added by `0240`:

```
src/compilers/javascript.ts   dateLiteral, datetimeLiteral        ← UTC_ZONE
src/bindings/javascript.ts    bot, eot
src/runtime.ts                kDate, kDatetime, pDate, pDatetime  ← the coercion boundary
```

Ruby, Python and SQL have no counterpart: `Date.parse` keeps the literal's
offset, Python builds naive datetimes, PostgreSQL's `TIMESTAMP` carries no
zone. There is nothing to move there, which is itself the tell.

## Why the literals must not move

`0240` established, and the corpus asserts, that **a Date or a Datetime is a
zone-free wall clock**. Two consequences:

* `inDays(startOfDay(D2026-03-11) - startOfDay(D2026-01-10))` is `60`.
* `day(D2026-01-01T00:30:00Z)` is `1`.

Both hold *because* the value is not in a zone that has DST. Make the literal
mean "midnight in `$.timezone`" and under `$.timezone = 'America/Los_Angeles'`
the first answers 59.958… again — the exact defect `0240` fixed, reintroduced
as a feature. To keep `60` you would also have to make duration arithmetic
calendar-aware (Luxon's `diff(…, 'days')`, PostgreSQL's component division,
ActiveSupport's, Python's) on four targets, which is `ideation/0220`'s open
question and a project of its own.

And `startOf('day')` would become a different instant per context, so
`startOfDay(D2024-06-15T10:30:00Z) == D2024-06-15T00:00:00Z` — asserted today
on all four targets — would be false for most zones.

So: **expensive, and semantically backwards.** This is the part of the request
to decline.

## What should read `$.timezone`

Once a Date is zone-free, a zone can only matter in three places. All three are
real, and two of them are already written up as bugs.

### 1. `NOW` and `TODAY` — the whole point

These are the one temporal value whose answer *is* a clock reading, and
converting an instant to a wall clock needs a zone. Today that zone is the
**host's ambient one**, on all four targets:

```
DateTime.now().startOf('day')     // JS: the host's zone
Date.today                        // Ruby: the host's zone
_elo_dt(datetime.now().year, …)   // Python: the host's zone
CURRENT_DATE                      // SQL: the session's TimeZone
```

So a program compiled to Ruby on one server and to SQL on another already
disagrees about what day it is, and nothing declares which is right. `$` is
exactly the fix: `TODAY` becomes *midnight of the calendar date in
`$.timezone`*, identical on all four targets, defaulting to `UTC`. A
**declared** zone is portable where an ambient one cannot be — that is the
difference that makes this worth doing and makes it the opposite of the
literal case.

It also closes two recorded bugs:

* `ideation/0255` finding 3 — Ruby's `startOfDay(NOW) == TODAY` is false at
  any offset but zero, because `DateTime.now` carries the host offset and
  `Date.today` does not. With both computed in `$.timezone` the question
  disappears.
* `ideation/0255` finding 5 — `TODAY == D<today>` is true on three targets and
  false on JavaScript, and `0240` left it that way because a host is
  documented to pass its own zoned `DateTime.now()` as `_`. With a *declared*
  zone, `TODAY` is the local calendar date labelled zone-free on every target,
  and the inconsistency is gone without touching the host contract — which is
  the one answer I could not reach while fixing `0240`.

**Cost: small, and it is the four places listed above plus `today`/`now` in
each binding.** The literals do not move.

### 2. The coercion boundary, for an input that carries an offset

`Datetime(_.t)` where `_.t` is `"2026-01-01T00:30:00+02:00"`, or a host-supplied
zoned `DateTime`. There is a genuine conversion to do and today the four
targets do four different things — `ideation/0255` finding 4: JavaScript reads
hour `22`, the other three read `0`, because they ignore the offset.

A context zone is the honest resolution: *an instant arriving from outside is
converted to a wall clock in `$.timezone`.* That is one rule, it is the same on
four targets, and it is stated rather than inherited. The four coercion helpers
(`kDate`, `kDatetime`, `pDate`, `pDatetime`) are where `'utc'` already is, so
this is the one place the hardcoded value genuinely becomes `$.timezone`.

**Cost: medium.** Four helpers on JavaScript, and the equivalent conversion
written for the first time on Ruby, Python and SQL — which today have none.

### 3. Rendering, if and when Elo gets a formatter

`String(D…)` has no zone question while the value is zone-free, and `0153` is
already the open question about what `String()` of a datetime should be. If a
`format(t, pattern)` ever lands, `$.timezone` and `$.locale` are what it reads.
Nothing to do now; worth knowing the slot exists.

## Summary of the feasibility answer

| | moves to `$`? | cost | verdict |
| --- | --- | --- | --- |
| `dateLiteral` / `datetimeLiteral` | **no** | would need calendar-aware arithmetic on 4 targets | re-opens 0240; decline |
| `startOf` / `endOf`, `day`/`month`/`year`, `inDays` | **no** | — | zone-free wall-clock arithmetic; nothing to do |
| `bot` / `eot` | no | — | fixed sentinels |
| `NOW` / `TODAY` | **yes** | small | the reason to build `$`; closes 0255 §3 and §5 |
| `kDate`/`kDatetime`/`pDate`/`pDatetime` | **yes** | medium | the real conversion; closes 0255 §4 |
| a future `format()` | yes, later | — | the slot exists |

So the honest shape of the work is: **`$` is worth building, and the first
thing it should govern is `NOW`/`TODAY`, not the literals.** That is a small,
self-contained second step after the mechanism lands, with an acceptance
assertion that does not depend on the host's `TZ` — which is the thing `0180`
has been waiting for.

## Decided in review round 1

* **Closed schema**, with `$.request` as the `Data`-typed escape hatch.
* **No `$.now`** in the first cut — recorded above with the two places that
  are already waiting for it, because it will come back.
* **`$2` on SQL is accepted**, emitted if and only if `$` is referenced. `$`
  is a four-target feature.

## The one question still open — now answered, see the banner

> **Answered: yes.** `0259`'s `D2` decides that `$.timezone` is the
> destination. The reasoning below still holds for *ordering* the work —
> `--timezone` first, because it is cheap and needs no harness — but it no
> longer decides *whether*. Read it as the sequencing argument it became.

**Is the multi-context case real enough to justify `$` at all?**

The alternative is `eloc --timezone Europe/Brussels`: a compile-time constant,
no language change, no second parameter, no threading through four emitters,
no harness work to supply a context to the acceptance runners. It covers a
service with one timezone *completely*.

`$` earns its keep only when **one compiled artifact must serve many
contexts**. What the repository already knows about that:

* Bricks run 2 007 expressions, 158 workflows and **35 client organisations**
  off one deployment (`analyzed/bricks-requests-original.md`). Multi-tenant is
  established. Whether those 35 span more than one timezone is *not* recorded
  anywhere here, and it is the whole question — worth one message to them
  before building anything.
* `0240` was found in a formula service whose boot "runs every case of every
  bundle". A service compiling once and evaluating many times is the shape
  that wants `$`; a build step that compiles per deployment is the shape that
  wants `--timezone`.

**Recommendation: ask Bricks, and build `--timezone` first either way.** It is
a day's work, it is not thrown away by `$` (the flag becomes the default that
`kContext` returns when the host passed nothing), and it makes the zone a
*declared* value rather than the host's ambient one — which is the property
that actually fixes the `NOW`/`TODAY` divergence priced above. If the answer
comes back "yes, many timezones per deployment", `$` is the second step and the
flag is its default; if it comes back "one per deployment", Elo gains a
portability fix and no new syntax.

That ordering also de-risks the part of this proposal with the most unknowns:
the harness. No `$` assertion can be written until the four acceptance runners
can supply a context, and `--timezone` needs none of that.
