## Problem to solve

Add Array type and literals to Elo for JSON input processing.

## Design decisions

- Arrays are heterogeneous (can mix types)
- Syntax: `[1, 'two', true, null]`
- Empty array: `[]`

## Implementation

1. Parser: array literal syntax `[expr, expr, ...]`
2. AST: ArrayLiteral node
3. Types: Array type (heterogeneous, no generics)
4. IR: handle array expressions
5. Compilers:
   - JavaScript: `[...]`
   - Ruby: `[...]`
   - SQL: `ARRAY[...]`
6. Tests: unit, integration, acceptance
7. Documentation: README, website

## Examples

```elo
[]
[1, 2, 3]
['a', 'b', 'c']
[1, 'mixed', true, null]
let items = [1, 2, 3] in items
```

## Dependencies

- 54a (null literal) - for `[1, null, 3]`
