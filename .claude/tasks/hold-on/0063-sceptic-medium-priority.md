## Problem to solve

Sceptic analysis identified medium/low-risk edge cases that should be tested for completeness and cross-target consistency.

## Tests to add

### 1. Floating point equality precision

```elo
# 0.1 + 0.2 == 0.3 is famously false in IEEE 754
# Document behavior, don't "fix"
assert(typeOf(0.1 + 0.2) == 'Float')
```

### 2. Duration zero equality

```elo
assert(P0D == PT0H)
assert(P1D - P1D == P0D)
```

Zero durations should be equal regardless of unit representation.

### 3. Empty string padding

```elo
assert(padStart('hello', 3, ' ') == 'hello')  # already shorter
assert(padEnd('hi', 5, '.') == 'hi...')
```

### 4. reduce with empty array

```elo
assert(reduce([], 0, fn(acc, x ~> acc + x)) == 0)
assert(reduce([], 'start', fn(acc, x ~> acc + x)) == 'start')
```

### 5. Nested map/filter operations

```elo
assert(map(filter([1, 2, 3, 4], fn(x | x > 1)), fn(x ~> x * 2)) == [4, 6, 8])
```

### 6. Chained pipes on dynamic type

```elo
assert((let obj = {name: 'HELLO'} in obj.name |> lower |> length) == 5)
```

### 7. Alternative with all nulls

```elo
assert(isNull(null | null | null) == true)
```

### 8. typeOf on nested array

```elo
assert(typeOf([[1, 2], [3, 4]]) == 'Array')
```

### 9. Unicode string operations

```elo
assert(length('café') == 4)
assert(upper('café') == 'CAFÉ')
```

May need to document limitations if SQL differs.

### 10. Very large integers (informational)

```elo
# Document precision limits
# 999999999999 * 999999999999 loses precision in JS
```

## Approach

1. Add tests incrementally
2. Focus on documenting cross-target behavior
3. Lower priority than task 62 - complete after high-risk items
