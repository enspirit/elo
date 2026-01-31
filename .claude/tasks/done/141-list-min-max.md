## Problem to solve

Add `min` and `max` stdlib functions for lists.

## Solution

Native stdlib compilation for all four targets:
- JS: `Math.min(...arr)` / `Math.max(...arr)`
- Ruby: `arr.min` / `arr.max`
- Python: `min(arr)` / `max(arr)`
- SQL: `(SELECT MIN/MAX(v) FROM UNNEST(arr) AS v)`

## Changes

- `src/bindings/javascript.ts`: register min/max for array type
- `src/bindings/ruby.ts`: register min/max for array type
- `src/bindings/python.ts`: register min/max for array type
- `src/bindings/sql.ts`: register min/max for array type
- `test/fixtures/stdlib/array-minmax.elo` + expected files: acceptance tests
- `README.md`: add min/max to list functions
- `web/src/pages/stdlib.astro`: add min/max documentation
- `web/src/pages/learn.astro`: add min example
