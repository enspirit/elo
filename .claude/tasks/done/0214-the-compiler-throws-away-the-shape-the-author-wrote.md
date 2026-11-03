# The compiler throws away the shape the author wrote

## Symptom

An author writes a shape and Elo enforces it:

```elo
let Order = { lines: [{ price: Int }], label: String } in _ |> Order
```

Three representations of that shape then exist, and only one of them is
structural.

1. **`EloType`** (`src/types.ts`, 88 lines) — a flat enum of 13 kinds plus
   `any`. No field types, no element types, no unions. This is what every
   compiler dispatches on.
2. **`CheckType`** (`src/checktypes.ts`) — schemas, element types, unions,
   nullability. Structural, and **checker only**. Its header says so plainly:
   "only the compiler throws it away."
3. **An undeclared third one, inside the SQL binding.**

The third is the symptom. `src/bindings/sql.ts` carries its own type inference:

| | |
|---|---|
| `isJsonb` | `:112` |
| `jsonPath` | `:142` |
| `readsJsonField` | `:179` |
| `OPERATOR_DEMAND` | `:215` |
| `demandedPgType` | `:221` |
| `pgTypeOf` | `:248` |
| `PG_TYPE`, `jsonFieldPgType` | — |
| `PG_ARRAY_FAMILY`, `assertRepresentableList` | `src/compilers/sql.ts:88-146` |

Three of them (`isJsonb`, `readsJsonField`, `pgTypeOf`) are mutually recursive
re-walks of `let` / `typedef` / `guard` / `if` bodies, re-derived per node
*during emission*. They exist for one reason, stated in the comment at
`bindings/sql.ts:170-174`:

> Elo's `Object` is `jsonb` on PostgreSQL, and `jsonb->>'k'` is **text**
> whatever the stored value is. […] The read cannot say what type it produced,
> so the type has to come from whatever the value is being used with.

The read cannot say what type it produced *because `EloType` has nowhere to put
it*. `{ budget: 1500 }.budget` is `any`, so SQL guesses from the sibling
operand, and `OPERATOR_DEMAND` guesses from the operator when both siblings are
guesses. That whole mechanism is a workaround for representation 1 being weaker
than what the author already wrote down.

## The fourth path

`transform.ts` takes an optional `types?: TypeAnnotations` (`:88`) and consults
it only where its own inference said `any` (`checkedType`, `:220`). So
inference behaves differently with and without `--optimize`, and the SQL
binding branches on exactly that:

```ts
case 'member_access':
  // A read whose type the checker supplied is already cast, so it needs
  // nothing from its context.
  return jsonPath(ir) !== null && ir.inferredType.kind === 'any';   // :184
```

Two emission strategies for one node, selected by whether an optional pass ran.
`optimize-equivalence.integration.test.ts` exists to hold them equal — a test
whose necessity is itself the finding.

## What it should be

Give `EloType` the structure the language already has: object field types and
array element types, at minimum. Collapse representations 1 and 2.

The checker's richer lattice stops being a private asset and becomes *the* type
representation. Then:

- `member_access` infers a real type, so `readsJsonField`, `demandedPgType`,
  `OPERATOR_DEMAND` and most of `pgTypeOf` have nothing left to do — the cast
  comes from the type, not from the neighbours.
- `--optimize` stops changing emission semantics, because there is one
  inference.
- Ideation `0205-a-sql-binding-forgets-the-type-of-the-member-it-holds` closes
  as a consequence rather than as a patch.
- `commonElementType` (`src/ir.ts:420`) and `PG_ARRAY_FAMILY` get an actual
  element type to work with instead of reconstructing one.

`StdLib` dispatch must stay flat. `signatureKey` (`src/stdlib.ts:24`) and
`typeGeneralizations` (`:46`) key on `typeName`, and a structural type would
explode the key space. The answer is that dispatch **projects down** — exactly
what `project` in `checktypes.ts` already does for the checker. So: one
structural representation, projected to a flat key at the dispatch boundary.
That keeps the 168-entry type table and the four 150–190-entry bindings
untouched, which is the single most important constraint on this task.

## Why this is last, and why it may not be done at all

It touches `types.ts`, `typedefs.ts`, `stdlib.ts`, `transform.ts`,
`checktypes.ts`, `typecheck.ts` and all four bindings. It is the only task in
this series that can make the language *less* simple if done badly — a
structural `EloType` with unification, variance or subtyping would be a worse
language than a flat one with a workaround in the SQL binding.

Elo's design order is simple, well designed, portable, safe. The case for this
task is that it serves *portable*: SQL's guessing is the one place where the
same Elo expression means different things per target for reasons the author
cannot see. The case against is that it risks *simple*.

So the first step is not code. It is to write down, against the fixture corpus,
how many SQL emissions actually depend on `demandedPgType` guessing, and
whether a narrower change — field types only, no unions, no nullability —
removes them. If field types alone do it, do only that. 0213 should land first
regardless: it shrinks the blast radius from four emitters to one.

If the narrow version does not clearly pay for itself, move this to
`analyzed` with the measurement recorded, and leave the workaround documented
where it is. A measured decision not to do it is a good outcome for this task.

## Done, 2026-11-03 — in three steps

### Step 1: EloType gained field and element types

`EloType` gained `props` and `element`, and the transform propagates them from
the object literals and type expressions it already walks. Measured again over
the corpus: `OPERATOR_DEMAND` fired **8 times before, 0 times after**, without
the checker — so the asymmetry this task was really about (`--optimize`
changing emission *semantics*) is gone, and the invariant that nothing in the
compile path calls the checker is preserved rather than broken.

The claim below that the transform cannot find a field's type without
duplicating the checker's walk was **wrong**: `transformTypeExprWithContext`
already builds the whole `IRTypeExpr`, and `inferType` already has the object
literal in hand. Both were throwing the shape away — `Types.fn` at the binding
and `Types.any` at the read. Recording it instead is propagation, not a second
inference engine.

Two bugs fell out, both now fixed and pinned:

- `{a: 'x'}.a + {b: 'y'}.b` cast two strings to `numeric` on SQL and errored on
  PostgreSQL, where the other three concatenate. The residual case — an
  untyped `jsonb` value — is ideation **0217**.
- A json read did not parenthesise itself, and PostgreSQL binds `||` tighter
  than `->>`, so `a->>'x' || b->>'y'` parsed as `a ->> ('x' || b) ->> 'y'`. A
  cast had been hiding it by parenthesising as a side effect, which held only
  as long as every read was cast.

Emitted JavaScript shrank 2.6% over the corpus, because a read off a known
shape dispatches statically: `kEq(kMul(o.price, o.quantity), 100)` became
`o.price * o.quantity == 100`.

### Step 2: one type system, the richer one

The fork step 1 left — whether `EloType` grows `optional`/`extras`/`nullable`
or whether `CheckType` stays the checker's richer view — was decided by the
owner: one type, the richer one.

`EloType` now carries `props` (with their optional flags), `extras`, `element`,
`members` and `result`. `checktypes.ts` is gone, and `project()` with it.

The invariant that keeps this simple, and the reason no assignability relation
had to be invented: **`kind` is always the kind dispatch sees.** Everything
else is precision hanging off it. `signatureKey` and `typeGeneralizations` key
on `kind` alone through `typeName`, so the signature table has no notion of
field or element types and `{a: Int}` and `{b: String}` are both `object` to
every signature in it. Nothing matches structurally to choose an
implementation, so "does `{a: Int, b: Int}` satisfy `{a: Int}`?" never arises.
A union whose members disagree has kind `any`, because that is precisely what
dispatch means by "I cannot resolve this", and it still carries its members so
the checker can resolve it one at a time.

The projection is therefore *materialised* rather than computed — there is no
longer a `project()` anyone can forget to call.

Two equalities, because there are two questions: `typeEquals` compares kinds,
which is what dispatch means by equal; `structurallyEquals` compares all the
way down. The annotation path needed the latter — comparing two visits to one
node by kind would call two different schemas the same and never poison the
entry.

### Step 3: the transform reads the declaration itself

Which is what the collapse was *for*: before it, the transform had nowhere to
put a schema. `typeExprType` turns an `IRTypeExpr` into the type it stands for,
the transform records it against the name, and applying a type selector yields
what it parses to. So `let T = { a: Int, b: Int }, k = _ |> T in k.a - k.b`
emits `k[:a] - k[:b]` with **no flag**, and a definition building on an earlier
one resolves too.

That is the asymmetry this task was really about: `--optimize` no longer
changes emission *semantics* for a declared program. It is left with what the
checker genuinely works out and the compiler does not — chiefly a lambda
parameter typed from a declared list's element type, which is inference about a
*call* rather than the shape of a declaration. Both tests that used to assert
"the flag makes the difference" are re-pointed at that case; if it ever stops
needing the flag, `--optimize` has nothing left to do.

README and the reference page are updated: their headline example no longer
needs the flag, so it was showing something false.

### Measured

| | before 0214 | after |
| --- | --- | --- |
| `OPERATOR_DEMAND` guesses over the corpus | 8 | **0** |
| emitted JavaScript over the corpus | 985 409 | 939 913 (−4.6%) |
| type representations | 3 | **1** |

`checktypes.ts` deleted (224 lines). The residual guessing — an untyped `jsonb`
value, where no shape exists to know — is ideation **0217**.

## Measured, 2026-11-02 — and the answer changed the task

The task asked for a number before any code: how many SQL emissions actually
depend on `demandedPgType` guessing, and whether field types alone remove them.

Instrumented `demandedPgType` and `readsJsonField`, then compiled every line of
every fixture to SQL (948 lines compile; 231 are refused, as they should be —
lambdas, type definitions, guards):

|  | without field types | with them |
| --- | --- | --- |
| `demandedPgType` calls | 54 | 21 |
| **`OPERATOR_DEMAND` guesses** | **8** | **0** |
| derived from the sibling's known type | 46 | 21 |
| member reads that know their own type | 0 | 38 |

So **field types alone do it**, and they do it completely: the one genuinely
unsound mechanism — inferring an operand's type from the *operator* — fires 8
times over the corpus without field types and **never** with them. Unions and
nullability are not needed for this. The other 46/21 calls are not guessing at
all; they propagate a type the sibling already knows, which is what a compiler
should do.

### But the narrow change is not the one this task describes

"With them" above is `typecheckWithAnnotations` + `types` passed to the
compiler — which is to say **`--optimize` already removes all the guessing
today**. Restructuring `EloType` is not required to get there.

That matters because `transform.ts` cannot find a field's type on its own.
`let T = { a: Int } in _ |> T` makes `T` a `fn` in the type table and its
result `any`; the shape is in the AST, and the only thing that reads it
structurally is `checktypes.ts`. Putting field types in `EloType` without
making the transform propagate them structurally buys nothing — and making it
propagate them means duplicating the checker's walk in the compile path, which
is the duplication the architecture exists to avoid.

So the real options are:

1. **Make the checker's annotations mandatory on the compile path.** Small
   change, and the measurement says it reaches 0 guesses. But it reverses the
   stated invariant in `typecheck.ts`: "Nothing in the compile path calls it
   […] the four compilers behave exactly the same whether or not it runs." It
   costs a second AST walk per compile, and it leaves a hole: a program the
   checker *reports on* gets no annotations, so it would still compile down the
   guessing path — two semantics again, just with a rarer trigger.
2. **Keep it optional and accept the workaround**, documenting that
   `OPERATOR_DEMAND` is the price of compiling without the checker, and that
   `--optimize` removes it. 8 occurrences in the whole corpus, none of them
   wrong today.
3. **The task as written** — structural `EloType` *and* structural propagation
   in the transform. Removes the asymmetry at the root, and is the only option
   that makes `--optimize` purely an optimisation rather than a semantics. Also
   by far the largest, and the one that can make the language less simple.

### Why this is where it stops

Which of those three is right is a question about what the checker *is* — an
optional lint, or part of the compiler — and that is a design decision rather
than a cleanup. The audit this task came from was asked to find complexity, and
the finding stands: there are three type representations and the third one is a
shadow of the first being too weak. What to do about it is the owner's call.

The measurement above is the thing that was missing from the decision, and it
is now recorded. Option 2 is what ships today and nothing is broken by it, so
there is no pressure.

Worth noting for whichever option wins: `0205` (a SQL binding forgets the type
of the member it holds) is the same root cause and should be decided with it,
not separately.

## Tests

`typecheck-differential.integration.test.ts` already asserts the invariant this
task must preserve: the checker may be more precise than the transform, never
less. That is the net.

Beyond it, the SQL fixtures are the ones that matter — every
`.expected.sql` encodes a cast decision, so the diff after this change *is* the
specification of what moved, and every line of it has to be explained rather
than regenerated. Per CLAUDE.md: regenerating is not a test. Any emission that
changes needs an acceptance assertion that executes against `psql` and proves
the new cast is right.
