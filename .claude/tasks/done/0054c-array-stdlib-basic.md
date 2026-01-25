## Problem to solve

Add basic array stdlib functions for accessing array elements.

## Functions

| Function  | Signature             | Description                |
| --------- | --------------------- | -------------------------- |
| `length`  | `Array -> Int`        | Number of elements         |
| `at`      | `(Array, Int) -> Any` | Element at index (0-based) |
| `first`   | `Array -> Any`        | First element (or null)    |
| `last`    | `Array -> Any`        | Last element (or null)     |
| `isEmpty` | `Array -> Bool`       | True if empty              |

## Implementation

1. Stdlib: add function definitions
2. Compilers: emit correct code for each target
3. Tests: unit, integration, acceptance
4. Documentation: README, website, stdlib page

## Examples

```elo
length([1, 2, 3])        // 3
at([1, 2, 3], 0)         // 1
first([1, 2, 3])         // 1
last([1, 2, 3])          // 3
isEmpty([])              // true
```

## Dependencies

- 54b (array literals)
