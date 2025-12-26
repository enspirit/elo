## Problem to solve

9 stdlib functions are implemented in all bindings and documented on the website,
but missing from `src/typedefs.ts`. This causes type inference to return `any`
instead of the correct return type.

## Missing functions

- Numeric: `abs`, `round`, `floor`, `ceil`
- Temporal: `year`, `month`, `day`, `hour`, `minute`

## Files affected

- `src/typedefs.ts` - needs new registrations
- Already implemented in: `src/bindings/ruby.ts`, `src/bindings/javascript.ts`, `src/bindings/sql.ts`
- Already documented in: `web/index.html` stdlib section
