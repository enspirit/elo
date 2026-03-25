# Add isNotNull stdlib function

Add `isNotNull(value: Any) → Bool` as the inverse of `isNull`.

## Rationale

We have `isNull` but no direct inverse. While `!isNull(x)` works,
`isNotNull(x)` is more readable and maps cleanly to native idioms
in each target (especially SQL's `IS NOT NULL`).

## Implementation

- typedefs: register `isNotNull` as `(Any) → Bool`
- bindings:
  - Ruby: `!(x).nil?`
  - JavaScript: `!kIsNull(x)`
  - SQL: `x IS NOT NULL`
  - Python: `(x is not None)`
- fixture: `test/fixtures/stdlib/any/isNotNull.elo`
- docs: README, website (learn, reference, stdlib)
- tests: all levels must pass
