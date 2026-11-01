# Feed the checker's types back into codegen

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

### Interaction with 0096

`0096` records that `StdLib.lookup`'s arity fallback picks by registration order
whenever a type is unknown, with 22 sites where the choice changes the emitted
code and two that are wrong. Annotation **reduces how often that path is
reached** but does not remove it, and the two are independent: 0096 should be
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
