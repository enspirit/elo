# What is Elo's public interface?

> Raised while deciding whether the changes since 1.1.1 were 1.2.0 or 2.0.0.
> The question could not be answered, because semver is a promise about a
> surface and we have never said what ours is. That is the actual blocker, and
> it will recur at every release until it is settled.

## The measurement

`@enspirit/elo` exports **66 names** at runtime. The README documents **five**
of them (`compile`, `binary`, `variable`, `literal`, and the `compileToX`
family). Nothing says which of the other sixty-one a host may depend on.

Thirty-three come from one line:

```ts
// src/index.ts
export * from './ast';
```

So every AST factory and every AST interface is public by accident rather than
by decision — `assertDistinctNames`, `locate`, `isLocated`,
`formatSourceLocation` and `withLetBindings` are compiler internals that a
`export *` published. Across 1.1.1 → 1.2.0 nothing was removed and 21 names
were added, so the surface only grows, and it grows without anyone choosing.

## What it already cost

`typeDef(name, typeExpr, body)` became `typeDef(definitions, body)` in this
release. Whether that was a breaking change was unanswerable: the factory is
reachable from the package entry, so it is published, but it is not documented,
so it was arguably never promised. It was made backward compatible — the right
call for one function, and not a policy.

The same question is open for the AST **node shapes**. A `typedef` node now
holds `definitions` where it held `name` and `typeExpr`. A host that *builds*
one is fine; a host that *reads* one is not. Nothing says whether reading an
AST node is supported, so nothing says whether that needed a shim too.

## What to decide

1. **The boundary.** Which of the 66 are supported? A defensible cut:
   - **Supported**: `compile`, `parse`, the four `compileToX`, `getPrelude` /
     `isPreludePrependable`, `toEloCode`, the typechecker entry points, the
     module loader entry points, the format adapters, and the AST *factories*.
   - **Internal**: the AST *node shapes* (so the IR and the transform can
     change freely), `locate` / `isLocated` / `formatSourceLocation` /
     `assertDistinctNames`, and anything under `src/compilers`, `src/bindings`,
     `src/ir.ts`, `src/transform.ts`, `src/stdlib.ts`.
   The hard part is the AST node shapes: `parse()` returns one, so a host
   already holds the value. Either the shape is public (and the IR work of
   0211–0214 would have been breaking), or `parse()`'s result is opaque except
   through documented accessors. Pick one and say it.

2. **How it is expressed, not just written down.** A list in the README rots.
   `export *` is what created the problem, so replace it with an explicit
   export list in `src/index.ts` — then the public surface is a file someone
   has to edit deliberately, and a test can assert the list matches the
   documentation.

3. **What a version number then means**, including whether refusing a program
   that used to compile is breaking. Three of this release's changes were
   decided ad hoc: a `.elo` file being read as one program (judged a bug fix),
   ill-typed calls being refused, and duplicate `let` bindings being refused.
   The rule we actually applied, and should write down, is that **a program the
   language never meant to accept is a bug fix, not a break** — but that rule
   needs stating, because it is doing a lot of work.

## Tests

- A unit test over `Object.keys(require('../src/index'))` pinned to the
  declared public list, failing in both directions: a new export that is not
  declared, and a declared name that is gone. That is the one test that makes
  the boundary real rather than aspirational.
- The README section documenting the surface, checked against the same list, as
  the website examples already are.

## Note

`README.md` documents a programmatic AST example that does not work and never
did — `binary('-', binary('*', variable('price'), ...))` compiled on its own
raises `Undefined variable: 'price'`, at 1.1.1 as well as now. Filed separately
as 0222; mentioned here because it is the same root cause, a surface nobody
checks.
