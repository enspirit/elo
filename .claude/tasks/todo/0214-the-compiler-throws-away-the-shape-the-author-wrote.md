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
