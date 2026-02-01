# Reorganize acceptance test fixtures

## Goal

Apply the same organizational pattern we used for List (`type/category/function.elo`)
to all fixture files. The structure should mirror the stdlib page and reference page.

## Done

- [x] Move stdlib files into type-based folders (any, date, datetime, duration, interval, numeric, string, data)
- [x] Split composite files into one-per-function where sensible
- [x] Regenerate all expected files after moves
- [x] Verify all tests pass

## Decisions made

- **reference/**: Kept as-is — already one file per construct.
- **others/**: Kept as-is — integration/edge-case tests, not stdlib.
- **null-handling.elo**: Kept as single file in `any/isNull.elo` — the `|` operator tests
  are part of null handling semantics and belong together.
- **stdlib-data.elo**: Split into `list/transform/reverse.elo`, `list/summary/join.elo`,
  and `string/split.elo`.
- **data-merge.elo**: Kept merge + deepMerge together in `data/merge.elo` (same concept).
- **Temporal files**: Kept their existing names, just moved into `date/` and `datetime/` folders.
