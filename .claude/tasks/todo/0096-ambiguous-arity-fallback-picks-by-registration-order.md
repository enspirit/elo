# `StdLib.lookup`'s arity fallback silently picks by registration order

Split out of 0095, where fixing Python's operators answered the narrow bug but
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
