# `StdLib.lookup`'s arity fallback silently picks by registration order

> Renumbered from 0096, which collided with an existing task in `done/`. Commit messages written before the renumbering refer to it as 0096.

Split out of 0175, where fixing Python's operators answered the narrow bug but
left the mechanism that caused it. **Measured, not estimated** — the numbers
below come from instrumenting `StdLib.lookup` and emitting every candidate.

## The mechanism

`StdLib.lookup` (`src/stdlib.ts`) tries generalizations of the argument types,
and if none matches *and* an argument is `any`, returns **the first registered
implementation with a matching name and arity**. So when a type is unknown, the
emitted code is decided by the order registrations happen to appear in the
binding file.

## How often it fires, and how often the choice matters

Over the 922-line fixture corpus, the fallback resolves 13–22 calls per target.
Most are harmless: only one implementation of that name and arity exists, so
picking it is both necessary and correct (`count(Any)`, `sum(Any)`,
`first(Any)`, `assertFails(Any)`).

The cases where the candidates **emit different code** are the problem:

| target | sites | examples |
|---|---|---|
| javascript | 1 | `fetch/2` |
| ruby | 11 | the ten period boundaries, `fetch/2` |
| sql | 7 | `length/1`, `isEmpty/1`, `contains/2`, `reverse/1`, `floor/1`, `ceil/1`, `fetch/2` |
| python | 3 | `round/1`, `reverse/1`, `fetch/2` |

Two are demonstrably wrong today:

```
$ eloc -t sql -e "floor(_)"
$1                                  # the Int implementation: identity.
                                    # Flooring an unknown value does nothing.
$ eloc -t sql -e "length(_)"
COALESCE(CARDINALITY($1), 0)        # array semantics; 0 for a string
```

Ruby's period boundaries pick `X.beginning_of_day` over
`X.to_datetime.beginning_of_day` — probably fine, not provably so.

## Should the fallback be removed?

**No — not wholesale.** Assessed and rejected:

- Removing it breaks the harmless majority. `count(_)`, `sum(_)`, `first(_)`
  and `assertFails(fn(…))` all resolve through it and have exactly one
  candidate; they are correct today and would stop compiling.
- Keeping it but refusing when ambiguous is a **breaking change** for programs
  that work: `length(_)` on SQL is a reasonable thing to write and does the
  right thing whenever the value really is a list.
- Making it refuse *and* keeping those programs working means every target
  registers an explicit `Any` signature for each ambiguous name — about 22
  registrations, and SQL cannot always dispatch dynamically inside a pure
  expression without `pg_typeof` CASE scaffolding.

The cost lands on all four targets; the benefit is bounded by a list we can
enumerate. So fix the list, not the mechanism.

## What to do instead

Register an explicit `Any` implementation for each ambiguous name, per target,
choosing the variant that is correct for every possible runtime type. Several
are trivially safe and worth doing first:

- SQL `floor(Any)` / `ceil(Any)` → `FLOOR(x)` / `CEIL(x)`. Correct for Int too,
  so this is a strict improvement with no decision to make.
- Python `reverse(Any)` → `x[::-1]`, which is right for both a string and a
  list, unlike `list(reversed(x))`.
- Ruby's period boundaries → the `.to_datetime.` variant, correct for a Date
  and a Datetime alike.

The rest need a decision rather than a patch, because no single emission is
right for every type:

- SQL `length(Any)`, `isEmpty(Any)`, `contains(Any, …)`, `reverse(Any)` —
  string versus array. Either dispatch on `pg_typeof`, or decide that these
  require a known type and report it.
- `fetch(data, key)` on every target — the second argument decides between
  `kFetch`, a path array, and `kFetchObject`.

Each one wants an acceptance test per target asserting the behaviour for *both*
runtime types, which is what would have caught `floor(_)`.

## Related

The type checker reduces how often this is reached: a program that declares its
input gets concrete types and never takes the fallback. That is mitigation, not
a fix — an undeclared `_` still hits it.

## Test to add regardless

Pin the ambiguous (name, arity) pairs per target to an explicit list, so adding
a new one is deliberate. Same technique as the registry-consistency and
schema-types tests. The measurement script is reproducible: for each
(name, arity) with more than one candidate and no explicit all-`Any` signature,
emit every candidate with a stand-in argument and compare the strings.

## Addendum: what was done

The measurement is now a test — `test/unit/ambiguous-dispatch.unit.test.ts` —
which reproduces the enumeration above and pins the result. It groups a
target's registrations by (name, arity), skips pairs with an explicit all-`Any`
signature, emits every remaining candidate with stand-in arguments, and reports
a pair whose candidates disagree on the emitted string. Red first, and it
reproduced the table in this file exactly: ruby 11, sql 7, python 3,
javascript 1.

Four of the eight resolved, each by registering the emission that is correct
for every runtime type:

| target | name | now emits |
|---|---|---|
| sql | `floor(Any)`, `ceil(Any)` | `FLOOR(x)` / `CEIL(x)` — was the Int identity, so `floor(x)` compiled to `x` |
| ruby | the ten period boundaries | `x.to_datetime.<boundary>` — `to_datetime` is the identity on a DateTime |
| python | `round(Any)` | `kRound` |
| python | `reverse(Any)` | `x[::-1]`, right for a string and a list alike |

Python's two were already picking the correct candidate; registering them
changes no emission and only removes the dependence on registration order.

`test/fixtures/reference/dynamic-ambiguous-dispatch.elo` is the acceptance
coverage, 37 assertions over all four targets. `min([x])` is the dynamic source
rather than a lambda parameter, because it is typed `any`, emits on SQL too,
and needs no input. Red before the fix: **4 assertions on SQL** (`floor` and
`ceil` of a Float, where the identity left the value untouched) and **4 on
Ruby** (`endOfWeek`, `endOfMonth`, `endOfQuarter`, `endOfYear` of a Date, where
`Date#end_of_week` yields a Date at midnight rather than the last instant of
the day). JavaScript and Python were already green and stayed so.

## A second bug, found by the same measurement

JavaScript's `reverse(Any)` *was* registered — inside the
`for (const t of [Types.string, Types.any])` loop over the String functions —
so the test skipped it as a deliberate choice. It was the String emission:

    reverse([1, 2, 3])  ->  [1,2,3].split('').reverse().join('')
                        ->  TypeError: split is not a function

The other names in that loop happen to coincide on a string and a list
(`.length`, `.length === 0`, `.includes`), which is why only `reverse` broke.
It now goes through a `kReverse` helper that looks at the value;
`reference/dynamic-reverse-dispatch.elo` asserts both runtime types and was
2 red of 6 on JavaScript, green on Ruby (`.reverse` covers both) and Python
(`[::-1]` covers both).

That is the limit of the pinning test, and it is now written in its header: it
sees *that* a choice was made, never whether the choice is right. Only an
acceptance assertion per runtime type does that.

## What is left, and why

Listed in `AMBIGUOUS` with a reason, unchanged:

- SQL `length/1`, `isEmpty/1`, `contains/2`, `reverse/1` — string versus array.
  Dispatching on `pg_typeof` inside an expression does not work: PostgreSQL
  type-checks **both** arms of a `CASE` even when only one can run, so
  `CARDINALITY(x)` fails to plan when `x` is text. The remaining option is to
  require a known type and say so, which is a language decision rather than a
  patch.
- `fetch/2` on all four targets — a String key is wrapped into a one-element
  path, an Array key *is* the path, an Object key builds a record. A key of
  unknown type is taken as a path and iterated, so on JavaScript
  `fetch({ab: 1}, <dynamic 'ab'>)` walks `data['a']['b']` and answers null,
  and on Ruby a String has no `reduce` at all. Needs a dispatching helper on
  three targets and has no pure-expression form on SQL.

Both want their own task once the direction is chosen.

## Also found, out of scope, filed

- `0178` — `test-sql.sh` reports a pass when psql reports an error, because
  psql exits 0 without `ON_ERROR_STOP`. Only failed *assertions* are caught,
  via `pg_terminate_backend`. This hid 0179 for as long as it existed.
- `0179` — SQL emits `ARRAY[3.7][1]` for `first([3.7])`, which PostgreSQL
  cannot parse; the subscripted expression needs parentheses. This is why the
  fixture here uses `min([x])` and not `first([x])`.
- `0180` — the acceptance suite is green only under `TZ=UTC`;
  `temporal-startof-endof` fails in CET on a clean checkout.
