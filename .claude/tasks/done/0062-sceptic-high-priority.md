## Problem to solve

Sceptic analysis identified high-risk edge cases that likely contain bugs due to cross-target inconsistencies or missing boundary handling.

## Tests to add

### 1. Negative array index access

```elo
assert(isNull(at([1, 2, 3], -1)) == true)
```

JS returns `undefined`, Ruby returns last element, SQL uses 1-based indexing.

### 2. Array index out of bounds

```elo
assert(isNull(at([1, 2, 3], 100)) == true)
```

All targets should return null for out-of-bounds access.

### 3. Division by zero

```elo
# Need to define behavior - likely target-specific
# JS: Infinity, Ruby: ZeroDivisionError, SQL: error
```

May need to skip or handle differently per target.

### 4. Modulo with negative numbers

```elo
# -5 % 3 behavior differs: JS=-2, Ruby=1, Python=1
# Need to verify/document Elo semantics
```

### 5. Date subtraction producing duration

```elo
assert(D2024-01-15 - D2024-01-10 == P5D)
```

Typedefs register this but no acceptance test exists.

### 6. Lambda capturing outer scope (Ruby closure)

```elo
assert(let x = 10 in map([1, 2, 3], fn(y ~> x + y)) == [11, 12, 13])
```

Ruby's `&proc` syntax may not capture closures correctly.

### 7. Substring with excessive length

```elo
assert(substring('hello', 2, 100) == 'llo')
```

Boundary handling may differ across targets.

### 8. Duration scaling with negative multiplier

```elo
assert(typeOf(-2 * P1D) == 'Duration')
```

Negative duration semantics may be inconsistent.

## Approach

1. Add tests one by one
2. Run acceptance tests to see which fail
3. Either fix the implementation or document as known limitation
4. Some tests (division by zero) may need target-specific handling
