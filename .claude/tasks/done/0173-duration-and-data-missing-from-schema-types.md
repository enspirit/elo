# `Duration` and `Data` are documented as schema types but rejected

> Renumbered from 0093, which collided with an existing task in `done/`. Commit messages written before the renumbering refer to it as 0093.

**DONE** — the implementation was fixed, as decided below.

Found while building the type checker. Pre-existing.

```
$ eloc -e "let X = { d: Duration } in 1"
Compilation error: Error: Line 1: Error: Unknown type selector: 'Duration'
$ eloc -e "let X = { d: Data } in 1"
Compilation error: Error: Line 1: Error: Unknown type selector: 'Data'
```

Both are documented as usable in a schema:

- `web/src/pages/reference.astro` (Data Schemas): *"All type selectors can be
  used as schema types: `Int`, `Float`, `Bool`, `String`, `Null`, `Date`,
  `Datetime`, `Duration`, `Data`."*
- The README lists `Duration()` and `Data()` among the type selectors.

The cause is `BUILTIN_TYPE_SELECTORS` in `src/transform.ts:278`, which lists
Any, Null, String, Int, Float, Bool, Boolean, Date, Datetime, Interval — and
omits Duration and Data, though both exist as selector *functions* and have
type definitions.

## To decide

Fix the implementation (add both to the set) or fix the docs (say they are not
schema types). The implementation is the honest fix, since both are selectors
everywhere else, but it needs checking that each target can emit a schema
parser for them — `pDuration` / `pData` or equivalent — and acceptance tests
per target. Do not add to the set without that check.

Both lists move together. `BUILTIN_TYPE_SELECTORS` in `src/transform.ts` and
`BUILTIN_TYPE_REFS` in `src/typecheck.ts` are pinned to each other by a test
(`test/integration/typecheck-differential.integration.test.ts`), because a name
the checker accepts and the transform rejects means `--typecheck` passes and
compilation then fails. Admitting Duration and Data means adding them in both
places and mapping them to `Types.duration` and `Any` respectively — the
checker needs no other change.

## Decision

* Fix the implementation


## What it took

More than adding two names to a set. `BUILTIN_TYPE_SELECTORS` is only the
parse-time allowlist; each compiler keeps its own map from those names to
runtime parser helpers, and nothing kept the two in step.

- JavaScript and Ruby already had `pDuration`/`p_duration` and `pData`/`p_data`
  in their runtimes, unreachable from a schema. Wiring them in was a two-line
  change each.
- Python had neither; both were written, modelled on its existing `pDate`.
- Ruby's two helpers turned out to be **dead code that did not work**. The
  selectors use their own inline implementations, so nothing had ever executed
  `p_data`: it parsed JSON without `symbolize_names`, so a parsed tuple never
  compared equal to an Elo tuple, and its `rescue` modifier did not return, so
  invalid JSON passed through as the raw string instead of failing. Both fixed.

## `Interval` was the same bug, pointing the other way

`Interval` was *on* the allowlist with no parser in any target, so
`{ i: Interval }` compiled to a call to an undefined `_p_Interval` and failed
at runtime. Emitting broken code is worse than refusing it, so it was removed
from the list and is now rejected at compile time with "Unknown type selector".
Nothing can have depended on the old behaviour, since it never ran. The
`Interval(...)` constructor function is untouched.

Making `Interval` a real schema type needs a parser helper written for each
target; that is a feature, not this fix.

## The structural fix

`test/unit/schema-types.unit.test.ts` now asserts that every name on the
allowlist compiles to a real parser on every target — it fails if a compiler
falls through to the undefined `_p_Name` path. Mutation-checked: removing
`Duration` from the JavaScript map makes it fail. That closes both directions
of the drift that caused this.
