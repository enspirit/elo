## Problem to solve

There is a disalignment between test fixtures and our documentation.

## Idea

Make an analysis about a reorganisation of fixtures to correspond more to our
Reference and Stdlib sections in the web documentation.

## Analysis

### Current State

**44 fixture files** with inconsistent naming and organization:

**Temporal files (7)** - scattered across multiple files:

- temporal.elo, temporal-keywords.elo, temporal-period-boundaries.elo
- temporal-extraction.elo, temporal-duration.elo, temporal-chained-duration.elo
- temporal-let-binding.elo

**Stdlib files (4)** - inconsistent naming:

- numeric-stdlib.elo, array-stdlib.elo, string-stdlib.elo, stdlib-data.elo

**Language constructs** - mixed organization:

- Core: arithmetic.elo, operators.elo, equality.elo, boolean-expressions.elo
- Expressions: variables.elo, let-expressions.elo, if-expressions.elo
- Data: arrays.elo, objects.elo, member-access.elo, datapath.elo
- Functions: lambda.elo, lambda-invocation.elo, lambda-sugar.elo, pipe.elo
- Types: typeof.elo, typeof-arithmetic.elo, type-selectors.elo, type-definitions.elo

### Documentation Structure

**Reference (docs.astro):**

- Core: Types, Literals, Operators
- Expressions: Variables, Conditionals, Ranges
- Data: Tuples, Lists, Input Data
- Functions: Lambdas
- Type System: Type Selectors, Type Definitions
- Runtime: Assertions

**Stdlib (stdlib.astro):**

- Type Selectors
- Any (typeOf, isNull)
- Date, DateTime, Duration
- List, Numeric, String
- Tuple (Data)

### Observations

1. **Temporal fragmentation**: 7 files could be consolidated into stdlib/date.elo, stdlib/datetime.elo, stdlib/duration.elo
2. **Stdlib naming**: Some use `-stdlib` suffix, some don't (stdlib-data.elo vs others)
3. **List stdlib split**: array-stdlib.elo + stdlib-data.elo (reverse, join, split) could merge
4. **No clear separation**: Language constructs and stdlib tests are mixed at top level

### Proposed Structure

```
test/fixtures/
├── reference/           # Language constructs (from docs.astro)
│   ├── literals.elo     # numbers, booleans, strings, dates, durations, datapaths
│   ├── operators.elo    # arithmetic, comparison, logical, pipe, alternative
│   ├── variables.elo    # let bindings
│   ├── conditionals.elo # if/then/else
│   ├── ranges.elo       # range membership (in X..Y)
│   ├── tuples.elo       # tuple creation and access
│   ├── lists.elo        # list creation
│   ├── input.elo        # _ variable usage
│   ├── lambdas.elo      # fn(), sugar syntax, invocation
│   ├── type-selectors.elo
│   ├── type-definitions.elo
│   └── assertions.elo   # assert, fail
│
├── stdlib/              # Standard library by type (from stdlib.astro)
│   ├── any.elo          # typeOf, isNull
│   ├── date.elo         # +, -, year, month, day
│   ├── datetime.elo     # +, -, hour, minute
│   ├── duration.elo     # +, *, /
│   ├── list.elo         # +, all, any, at, filter, first, isEmpty, join, last, length, map, reduce, reverse
│   ├── numeric.elo      # +, -, *, /, %, ^, abs, ceil, floor, round
│   ├── string.elo       # all string functions
│   └── data.elo         # fetch, patch, merge, deepMerge
│
└── exercises.elo        # Keep separate for website exercises
```

### Questions for Decision

1. **Flat vs nested?** The proposed structure uses subdirectories. Alternative: flat with prefixes (e.g., `ref-operators.elo`, `stdlib-string.elo`)

2. **Consolidation level?** Current temporal-\* files have specific edge cases. Should we:
   - Merge all into 3 files (date, datetime, duration)?
   - Keep some granularity for debugging?

3. **What about edge case files?** Files like `whitespace.elo`, `mixed-expressions.elo`, `real-world.elo` don't fit neatly - keep as separate integration tests?

4. **Migration strategy?**
   - Big bang rename/move?
   - Gradual migration with deprecation?
