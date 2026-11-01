# Infer the input type a program needs

Split out of `done/0091-type-checking.md` (§9 of that analysis), where it was
answered as a nice-to-have and deliberately left out of the type-checker work.
Everything it depends on has since shipped, so it stands on its own now.

## Problem to solve

The type checker (`src/typecheck.ts`, `eloc --typecheck`) is precise about a
program that *declares* its input:

```
let Order = { total: Int }, order = _ |> Order in upper(order.total)
# 1:47: error: No signature of upper accepts upper(Int)
```

and silent about one that does not, because `_` is `Any` until it is coerced:

```
upper(_.total)     # accepted: _ may well be a tuple with a String field
```

`--strict` reports the second as `unresolved-any`, which says "declare your
input". That is the right answer most of the time, but it cannot tell apart two
very different situations:

| Program | Today under `--strict` | Should be |
|---|---|---|
| `_.price * 2` | `unresolved-any` | fair enough — depends on the input |
| `year(_.x) + length(_.x)` | `unresolved-any` | **no input can make this work** |

The second asks for `_.x` to be a `Date|Datetime` *and* a `String|Array`. No
declaration could rescue it. Verified against the shipped checker: both compile
silently without `--strict`, and under `--strict` both produce nothing but
`unresolved-any`.

## Idea

Run the checker backwards: collect constraints on `_`-rooted access paths from
each use site and solve them. Two outputs fall out, and they are worth very
different amounts.

## Analysis

### Why it is tractable in Elo

The usual blockers to this kind of reconstruction are absent:

* **No recursion and no loops** (`transform.ts` rejects recursive calls), so
  every path from `_` is a finite, statically known chain — `_.a.b`, or `_.xs`
  plus an element constraint from a lambda. The constraint graph is a tree, not
  a cycle.
* **The type domain is 13 kinds**, so leaf solving is finite-domain
  propagation, not unification over an open universe.
* **Shapes are closed by construction** — the set of fields the program touches
  *is* the inferred shape; only the leaf types are ambiguous.
* **Unions are expressible** (`T|U`), so a non-singleton solution can often be
  written down in Elo rather than discarded.
* **`:?` falls out of the program's own null handling** — the prettiest part. A
  field is optional exactly where the program narrows it (`k.a | 0`,
  `isNull(k.a)`, `guard isNotNull(k.a)`), and the checker already recognises
  all of those forms. The program tells you which fields it tolerates missing.

So the algorithm is constraint collection plus a small CSP — **not**
Hindley–Milner. There are no type variables to unify; overloading is the whole
difficulty. The natural output shape is `{ touched fields…, ... }` (ignored
extras), which is both safe for the program — it uses only what it declared —
and tolerant of the real input carrying more columns.

### The trap: an inferred type must not become the contract

> An input type derived *from* a program, then used to check *that* program,
> proves nothing. It passes by construction.

So this cannot replace `--input-type` or `_ |> X`, and should not be presented
as a safety feature. Its two honest uses:

1. **Authoring scaffold.** `eloc --infer-input-type` prints a schema skeleton
   the author reviews, corrects and pastes in. This is how people reach the
   idiomatic declared form without hand-writing schemas — plausibly what would
   make `--strict`-by-default (agreed as a long-term direction) palatable.
2. **Host-side cross-check.** A host that *knows* its columns can compare the
   inferred requirement against its real schema: *"this formula needs
   `price: Int|Float`, you have `price: String`"* — a better error than either
   side alone, and not circular, because the real schema is independent
   evidence.

### The sound half: unsatisfiability

Constraint collection fails in a useful way. If two use sites demand disjoint
types for the same path, **no input makes the program well-typed** — a real
defect, provable with zero declarations. Still accepted silently today:

```
year(_.x) + length(_.x)                   # Date|Datetime and String|Array
upper(_.x) == lower(_.x) && _.x * 2 > 1   # String and a number
upper(_.a) + year(_.a)                    # String and Date|Datetime
```

This partly rescues the bare-`_` case the original analysis wrote off: you
still cannot type `_.price * 2`, but you *can* prove `year(_.x) + length(_.x)`
is impossible. It is also the one part with a soundness story, it is cheaper
than rendering a schema, and it needs no new CLI surface — one diagnostic code,
`unsatisfiable-input`.

### Where it degrades

So nobody expects more than it can give:

* **Overloading makes solutions non-unique.** `_.x + 1` admits `Int` and
  `Float`; `_.x + _.y` admits several pairs. The output is a set, to be
  rendered as a union, widened, or reported as a choice. There is no principal
  type to fall back on, which is the main reason the output needs human review.
* **Branches are disjunctions.** `if c then upper(_.x) else _.x + 1` has no
  single-type solution, and the checker's union rule (an operation must hold
  for *every* member) means `String|Int` does not rescue it. "Unsatisfiable" is
  the correct answer but may read as a false positive to an author who expected
  branch-local typing. Decide this deliberately rather than discovering it.
* **Dynamic access is opaque.** `fetch()` and datapath segments computed at
  runtime yield `Any` leaves and silently weaken the inferred schema — so the
  printed schema must mark where it gave up, or it will be trusted too much.
* **Unconstrained fields** — touched but never used in a typed position — can
  only be `Any`.

## Proposed order

**(a) The `unsatisfiable-input` diagnostic.** Small, sound, useful immediately,
no new CLI surface. Reported by default rather than only under `--strict`,
since it needs no declaration to be true. Reuses the checker's existing
machinery: the access-path keying already written for null narrowing
(`pathOf` in `src/typecheck.ts`) and the signature table's `signaturesOf`.

**(b) `--infer-input-type` as a scaffolding command.** A real step up in
machinery — constraint collection, finite-domain solving, union rendering — call
it 400–600 lines and a genuinely new concept in the codebase. Justified as
authoring UX and as the on-ramp to `--strict` by default, not as a check.

Both belong in `src/` as their own module, consuming the checker rather than
living inside it, so the checker stays a single bottom-up pass.

## Prerequisites — all shipped

- the checker and its structural lattice (`src/typecheck.ts`,
  `src/checktypes.ts`)
- `--input-type` and `parseTypeExpr`, so an inferred schema has a spelling to
  be printed in and compared against
- null narrowing, which is what makes `:?` inferable from the program

## Open questions

1. **Is (a) alone enough?** The unsatisfiability diagnostic is most of the
   value for a fraction of the work. (b) is a developer convenience; it may be
   better served by the playground than by the CLI.
2. **Branch disjunctions** (see above): report unsatisfiable, or special-case
   branch-local typing and accept a weaker guarantee?
3. **Where should (b) surface?** A CLI flag, a library function for hosts, or a
   button in the playground that fills in a schema skeleton. The playground is
   where the authoring audience actually is.
