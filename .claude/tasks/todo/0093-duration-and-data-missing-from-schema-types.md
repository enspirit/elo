# `Duration` and `Data` are documented as schema types but rejected

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
