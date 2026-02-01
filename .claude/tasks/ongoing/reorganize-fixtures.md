# Reorganize acceptance test fixtures

## Goal

Apply the same organizational pattern we used for List (`type/category/function.elo`)
to all fixture files. The structure should mirror the stdlib page and reference page.

## Target structure

```
test/fixtures/
  reference/                    # Language constructs (keep as-is, already well organized)
    alternative.elo
    arithmetic.elo
    arrays.elo
    boolean-expressions.elo
    datapath.elo
    equality.elo
    fail.elo
    guard-expressions.elo
    if-expressions.elo
    lambda-invocation.elo
    lambda-sugar.elo
    lambda.elo
    let-expressions.elo
    member-access.elo
    objects.elo
    operators.elo
    pipe.elo
    predicates.elo
    range-membership.elo
    type-definitions.elo
    type-selectors.elo
    variables.elo
  stdlib/
    any/                        # Any type functions
      isNull.elo                  ← from null-handling.elo
      typeOf.elo                  ← from typeof.elo
      typeOf-arithmetic.elo       ← from typeof-arithmetic.elo
    date/                       # Date functions
      temporal.elo                ← from temporal.elo (date comparisons)
      temporal-duration.elo       ← from temporal-duration.elo
      temporal-extraction.elo     ← from temporal-extraction.elo
      temporal-keywords.elo       ← from temporal-keywords.elo
      temporal-let-binding.elo    ← from temporal-let-binding.elo
      temporal-chained-duration.elo ← from temporal-chained-duration.elo
    datetime/                   # DateTime functions
      startof-endof.elo           ← from temporal-startof-endof.elo
      period-boundaries.elo       ← from temporal-period-boundaries.elo
    duration/                   # Duration functions
      conversion.elo              ← from duration-conversion.elo
    interval/                   # Interval functions
      interval.elo                ← from interval.elo
    list/                       # Already done ✓
      arithmetic/
      access/
      predicates/
      transform/
      summary/
    numeric/                    # Numeric functions
      abs.elo  ]
      round.elo]                  ← split from numeric-stdlib.elo
      floor.elo]
      ceil.elo ]
    string/                     # String functions
      *.elo                       ← split from string-stdlib.elo (one per function)
      equality.elo                ← from strings.elo
    data/                       # Tuple/Data functions
      merge.elo                   ← from data-merge.elo (merge + deepMerge)
      selector.elo                ← from data-selector.elo (Data constructor)
      patch.elo                   ← from datapath-patch.elo
      reverse-join-split.elo      ← from stdlib-data.elo (or split further)
  others/                       # Keep as-is (integration/edge case tests)
    exercises.elo
    mixed-expressions.elo
    real-world.elo
    trailing-commas.elo
    whitespace.elo
```

## Decisions to make

- **reference/**: Already one file per construct, well organized. Keep as-is.
- **others/**: Integration/edge-case tests, not stdlib. Keep as-is.
- **Splitting**: For types with few functions (numeric has 4), splitting to one file
  per function is cleaner. For string (15+ functions), definitely split. For temporal
  files that are already thematic, we can keep them grouped or split — up to us.
- **stdlib-data.elo** tests `reverse`, `join`, `split` which span List and String.
  Move to `list/` or `string/` depending on what they primarily test, or split.
- **null-handling.elo** tests `isNull` and `|` operator. The `|` part is really
  a reference test (alternative operator). May need splitting.

## TODO

- [ ] Move stdlib files into type-based folders (any, date, datetime, duration, interval, numeric, string, data)
- [ ] Split composite files into one-per-function where sensible
- [ ] Regenerate all expected files after moves
- [ ] Verify all tests pass
