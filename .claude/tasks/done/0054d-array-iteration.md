## Problem to solve

Add array iteration functions (map, filter) using existing lambda support.

## Functions

| Function | Signature                 | Description                      |
| -------- | ------------------------- | -------------------------------- |
| `map`    | `(Array, Fn) -> Array`    | Transform each element           |
| `filter` | `(Array, Fn) -> Array`    | Keep elements matching predicate |
| `reduce` | `(Array, Any, Fn) -> Any` | Fold array to single value       |
| `any`    | `(Array, Fn) -> Bool`     | True if any element matches      |
| `all`    | `(Array, Fn) -> Bool`     | True if all elements match       |

## Implementation

1. Stdlib: add function definitions
2. Compilers: emit correct code for each target
   - JS: `.map()`, `.filter()`, `.reduce()`
   - Ruby: `.map`, `.select`, `.reduce`
   - SQL: TBD (may need array functions or unnest)
3. Tests: unit, integration, acceptance
4. Documentation: README, website, stdlib page

## Examples

```elo
map([1, 2, 3], fn(x ~> x * 2))           // [2, 4, 6]
filter([1, 2, 3, 4], fn(x | x > 2))      // [3, 4]
reduce([1, 2, 3], 0, fn(acc, x ~> acc + x)) // 6
any([1, 2, 3], fn(x | x > 2))            // true
all([1, 2, 3], fn(x | x > 0))            // true
```

## Dependencies

- 54b (array literals)
- 54c (basic array stdlib)
- Existing fn() lambda support
