## Problem to solve

Period boundary functions (start_of_month, end_of_year, etc.) were only
reachable via keyword shortcuts (SOD, EOM, etc.) which implicitly use NOW.
There was no way to call them on an arbitrary date or datetime value.

## Solution

Added 10 camelCase stdlib functions for both Date and DateTime types:
startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
startOfQuarter, endOfQuarter, startOfYear, endOfYear.

These reuse the same target-specific implementations as the existing
snake_case internal functions, registered for both Types.date and
Types.datetime. No parser or IR changes needed.

## Changes

- `src/bindings/javascript.ts`: register camelCase period boundary functions
- `src/bindings/ruby.ts`: register camelCase period boundary functions
- `src/bindings/sql.ts`: register camelCase period boundary functions
- `src/bindings/python.ts`: register camelCase period boundary functions
- `test/fixtures/stdlib/temporal-startof-endof.elo` + expected files
- `README.md`: document period boundary functions
- `web/src/pages/stdlib.astro`: add startOf/endOf documentation
- `web/src/pages/learn.astro`: add startOfMonth example
