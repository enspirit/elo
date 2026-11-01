# Feed the checker's types back into codegen

> Renumbered from 0097, which collided with an existing task in `done/`. Commit messages written before the renumbering refer to it as 0097.

Hand the type checker's inferred types to `transform`, so the compilers pick a
typed implementation where the checker knows the type and the transform does
not. §5.5 of `done/0091-type-checking.md`, deferred then and worth doing now
that the checker ships.

## Problem to solve

The checker understands declared schemas; the transform does not. `_ |> Order`
is `Any` to the transform, so every operation on a coerced value falls to
dynamic dispatch — even though the author declared the types and the runtime
validated them.

```
$ eloc -t ruby -e "let T = { a: Int, b: Int }, k = _ |> T in k.a - k.b"
… k_sub(k[:a], k[:b]) …
```

`a` and `b` are declared `Int`. The checker says `int`. The transform says
`any`, so a dispatcher is emitted for a subtraction that cannot be anything but
integer arithmetic.

Measured on six realistic declared-schema programs (order total, discounted
price, margin, label comparison, map over a list, age in days):

| target | dynamic helpers pulled in |
|---|---|
| javascript | `kMul`, `kSub`, `kDiv`, `kEq` — at least one in **all six** |
| python | `kMul`, `kSub`, `kDiv`, `kEq` — at least one in **all six** |
| ruby | `k_sub`, `k_div` — in three of six |

Every one of those is avoidable: the checker's inferred type for the root of
each program is `int` / `float` / `array` where the transform says `any`.

The helper definitions those pull in are not small — they ship inline on
JavaScript and in the prelude elsewhere:

| target | `kAdd` | `kSub` | `kMul` | `kDiv` | `kEq` | all dynamic helpers |
|---|---|---|---|---|---|---|
| javascript | 300 | 340 | 293 | 140 | 766 | **1 989 ch** |
| python | 301 | 308 | 247 | 118 | 495 | **1 588 ch** |
| ruby | — | 173 | 86 | — | — | **259 ch** |

So the win is twofold: smaller output, and a real arithmetic operation instead
of a function call per operation at runtime.

## Idea

The checker already walks the AST and computes a type for every node. Have it
record them, and let `transform` consult that map before falling back to its
own inference.

```ts
// typecheck.ts
export function typecheckStructural(expr, options): {
  type: CheckType;
  diagnostics: Diagnostic[];
  types: Map<Expr, EloType>;     // new: projected, keyed on node identity
}

// transform.ts
export interface TransformOptions {
  types?: ReadonlyMap<Expr, EloType>;   // new: consult before inferring
}
```

Node identity works because both walk the same AST object. Nothing changes for
a caller that does not pass the map.

## Analysis

### Why this is safe to express but risky to get wrong

Today a checker bug produces a false diagnostic: annoying, visible, harmless.
With this change a checker bug produces **wrong emitted code**, silently. That
is a qualitative change in how much the checker is trusted, and it is the main
thing to design against.

Three mitigations, all of which already exist or are cheap:

1. **The one-directional invariant is already tested.** The checker may be more
   precise than the transform, never less — asserted over every fixture line in
   `typecheck.integration.test.ts`. Annotation only ever acts where the
   transform said `any`, so the invariant is exactly the precondition.
2. **The differential test already proves the checker never blesses what a
   compiler refuses** (`typecheck-differential.integration.test.ts`, ~8 900
   expressions). Extend it: with annotation on, the emitted code must still
   compile *and* produce the same value.
3. **Equivalence, not just compilation.** The acceptance suite must pass with
   annotation on and off, and the two must agree on every fixture line. That is
   the real test, and it is the one worth writing first.

### Opt-in, not automatic

`--typecheck` is optional today, and the compile path does not import the
checker. Annotation must not change that:

- a flag (`--optimize`? `--use-types`?) turns it on;
- with it off, the emission is byte-identical to today;
- with it on, the emission is *equivalent*, never different in behaviour.

Worth deciding whether it should eventually be the default. It probably should,
once the equivalence test has been green for a while — but not on day one.

### Where the wins are

In rough order of value:

- **Fields of a declared schema** — the case above, and the common one.
- **Lambda parameters from a list's element type** — `map(k.xs, fn(x ~> x * 2))`
  with `xs: [Int]` knows `x` is an `Int`.
- **Results of type selectors** — already typed since the Stage 0 work, so the
  transform gets these right; no change.
- **`let`-bound values** carrying a schema type through.

### Where it will not help

- An undeclared `_`. The checker knows no more than the transform there, so
  nothing changes — which also means the benefit is proportional to how much a
  codebase declares. Worth saying plainly in the docs rather than implying a
  general speed-up.
- `fetch()` and data paths, which stay `Any` for both.

### Interaction with 0176

`0176` records that `StdLib.lookup`'s arity fallback picks by registration order
whenever a type is unknown, with 22 sites where the choice changes the emitted
code and two that are wrong. Annotation **reduces how often that path is
reached** but does not remove it, and the two are independent: 0176 should be
fixed on its own merits.

## Steps

- Record `Map<Expr, EloType>` in the checker and expose it. The projection to
  `EloType` already exists (`project` in `checktypes.ts`)
- Add `TransformOptions.types` and consult it in `transformWithDepth` wherever
  it currently calls `inferType` on a sub-result
- Write the equivalence test FIRST, and see it fail: compile every fixture line
  with and without annotation, assert the executed results match. It cannot
  fail before the feature exists, so write it against a stub that returns an
  empty map, then watch it exercise real annotations as the feature lands
- Wire a CLI flag, off by default
- Measure again: the six programs above should pull in no dynamic helper on any
  target
- Document in README and Reference, next to the type checker, stating plainly
  that the benefit is proportional to how much the program declares

## Open questions

1. **Flag name and eventual default.** `--optimize` suggests more than this
   does; `--use-types` is accurate but obscure. And is it a compiler flag or a
   property of the API (`compileToX(ast, { types })`)?
2. **Does the checker run twice?** `--typecheck --optimize` would check once and
   annotate once; sharing the single walk is the obvious implementation but it
   couples the two flags.
3. **What about a reported program?** If the checker found errors, its types are
   partly `any`-by-recovery. Refusing to annotate a program with diagnostics is
   the conservative answer and probably right.
4. **Is the ~2 kB and one-call-per-operation worth the coupling?** For a browser
   bundle or a hot SQL expression, likely yes. Measure a realistic Klaro-style
   formula set before committing to making it the default.

## Decision

1. --optimize
2. coupling the two flags is no problem, one pass only
3. refusing to annotate is ok, failing out loud is even better
4. I don't see much coupling after all, --typecheck & --optimize stay optional
   and having type-annotations on AST seems legit anyway.

## Addendum: what was done

Built to the decisions above: the flag is `--optimize`, it implies
`--typecheck` and shares its single pass, it refuses to annotate a reported
program and says so, and the per-node types now live on the AST.

### The mechanism

`Checker.check` records `project(type)` for every node it visits, keyed on the
AST object. A node visited twice with *different* answers — a lambda body
checked once per argument combination of a union — **poisons** its entry rather
than overwriting it: emitting from the wrong one of two types is precisely the
failure mode this feature must not have. `any` entries are dropped on export,
since that is what the transform already assumes.

`transform` consults the map through one function:

```ts
function checkedType(expr, ctx, fallback) {
  if (fallback.kind !== 'any') return fallback;   // the transform always wins
  return ctx.types?.get(expr) ?? fallback;
}
```

One direction only, enforced in one place. Two call sites use it: `variable`
(where a lambda parameter and a coerced value are both registered as `any`) and
`member_access` (where `inferType` answered `Types.any` unconditionally, which
is why a declared field was opaque). `IRMemberAccess` gained an `inferredType`
to carry it.

`TransformOptions` grew a `types` map, and the five positional parameters the
walk threaded through seven helpers became one `TransformContext` — a net
simplification that made the feature nearly free to plumb. `TypeAnnotations` is
declared in `types.ts` so neither the checker nor the transform depends on the
other; the compile path still never calls the checker.

### Measured

The six declared-schema programs now pull in **no dynamic helper on any
target**, which is `optimize.integration.test.ts`. Seen red first: with the two
`checkedType` call sites reverted, **18 of its 24 assertions fail**. Output over
those six programs:

| target | plain | `--optimize` | |
|---|---|---|---|
| javascript | 11 815 ch | 9 066 ch | **-23%** |
| ruby | 8 943 ch | 8 328 ch | -6% |
| python | 1 158 ch | 1 124 ch | -2% (helpers live in the prelude) |

Over the whole fixture corpus the gain is small — javascript -16 648 ch
(-2.6%), ruby -104, python -179, sql ±0 — because the corpus declares almost
nothing. That is the honest shape of the feature and it is what the docs say:
**the benefit is proportional to how much the program declares.**

### Equivalence, which is the part that matters

Two tests, both of which bite:

- `optimize-equivalence.integration.test.ts` compiles every line of every
  fixture both ways on all four targets, asserts annotating never changes
  whether it compiles, and *executes* the JavaScript both ways comparing value
  or thrown message. 111 fixtures.
- `npm run test:acceptance:optimize` (`ELO_OPTIMIZE=1`) recompiles each
  fixture's `.elo` with `--optimize` and runs it on ruby, node, python3 and
  psql, instead of reading the `.expected` file. It is now part of `npm test`,
  so the corpus executes four ways on every run.

Neither is worth anything if it cannot fail, so both were mutation-tested with
a deliberately wrong annotation (`checkedType` returning `Types.int` for every
unknown): the integration test failed 9 fixtures, the optimized acceptance run
failed 5 across the four targets, and the unannotated acceptance run stayed
green — which also proves `ELO_OPTIMIZE=1` is not passing vacuously.

### One bug found on the way

Ruby registered `div` for `[Int, Int]`, `[Duration, Int]` and `[Duration,
Float]`, and nothing else — so `1.5 / 2.0` went through the `k_div` dispatcher
with *both* types statically known. Integer / Integer is the only case Ruby
truncates, so the three float combinations are a bare `/`; registered, which is
the same split `sub` above it already makes. This was in scope rather than
filed because the task's own measurement says `k_div` should disappear from the
margin program, and it could not until the typed signature existed.
Regenerating touched six ruby fixtures, all of them `k_div(…)` collapsing to a
bare `/`, with the dynamic (lambda-parameter) sites unchanged.

### Documented

README, next to the type checker: what it does, the before/after emission, the
23%, the refusal, and the proportionality. Same on the website's Reference page
under Type Checking, plus `--optimize` in both CLI option tables. Not in Learn
— a compiler flag is not part of learning the language.

`typecheckWithAnnotations` and `TypeAnnotations` are exported from the package
for a host that wants to do this itself.
