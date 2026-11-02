# A helper is required, or maybe not

## Symptom

`EmitContext.requireHelper` is optional (`src/stdlib.ts:82`), so every use of it
is a conditional call:

```ts
ctx.requireHelper?.('pUnwrap');
```

There are **104** of those in `src/`, and not one of them wants to be
conditional: an emitter that names a helper needs that helper. The `?.` says
"and if nobody is listening, emit code that calls an undefined function" — which
is not a case any caller wants, only one the type allows.

The optionality propagates. `emitJS(ir, requiredHelpers?, options?)` and its
three siblings thread an optional set and an optional options record through
every level of the emission recursion (`src/compilers/javascript.ts:172`,
`ruby.ts:188`, `python.ts`, 6 signatures in all), and each builds its `ctx` with
a ternary on it:

```ts
requireHelper: requiredHelpers ? (name) => requiredHelpers.add(name) : undefined,
```

## Why it is like that

SQL. Its prelude is installed in the database rather than emitted, so
`compilers/sql.ts` builds an `EmitContext` with no `requireHelper` — the only
target that does. One absent field on one target made the field optional for
all four, and 104 call sites pay for it.

But SQL does not *decline* to collect helper names; it has nothing to collect.
A sink that discards is the honest representation of that, and it is a no-op
function.

## What it should be

`requireHelper: (name: string) => void`, required. SQL passes `() => {}`. The
104 `?.` become `.`, and the emission recursions stop carrying an optional set
they always have.

While there: `options?: EmitOptions` on the same signatures is optional for no
reason either — every compile path builds one (`{ stripGuards: … }`) before
emitting. Make it required and drop the `options?.stripGuards` reads.

## Why it matters

This is the smallest of the complexity items and the one with the widest reach:
it touches 104 lines and removes a question from all of them. It is also the
one to do before 0213, which unifies the four emission walks — a required field
is far easier to thread through one generic walker than an optional one.

## Tests

Pure refactoring with no change to any emitted byte, covered by the three
levels as they stand. The check that matters is that the fixture corpus
regenerates to **zero diff** — if a single `.expected.*` moves, a `?.` was load
bearing somewhere and the task has found a bug instead.

No new test.
