# K Language Roadmap

## Goal

Design a simple, well-designed, portable and safe (purely functional) expression language to support 80% of business cases in NoCode tools like Klaro Cards.

The target audience is non-tech users.

---

## Priority 1: Critical

### 1. Conditional Expression: `if(cond, then, else)`

- [ ] Implement `if(cond, then, else)` function

Non-tech users constantly need conditional logic. Currently K has no way to express "if X then Y else Z".

```
if(age >= 18, 'adult', 'minor')
if(stock > 0, price * 0.9, 'Out of stock')
```

This is fundamental for any business logic and trivially portable (ternary in JS/Ruby, CASE WHEN in SQL).

### 2. Null/Optional Handling

- [ ] Implement `isNull(x)` function
- [ ] Implement `isNotNull(x)` function
- [ ] Implement `coalesce(x, default)` function

Real-world data has missing values. Users need:
- `isNull(x)` / `isNotNull(x)` — check for null
- `coalesce(x, default)` — provide fallback value

```
coalesce(customer.email, 'No email provided')
if(isNotNull(due_date), due_date < TODAY, false)
```

This is a major gap for any data-driven application.

---

## Priority 2: High

### 3. Number Formatting: `format(n, pattern)`

- [ ] Implement `format(n, pattern)` for numbers
- [ ] Implement `formatDate(d, pattern)` for dates

Business users need to display numbers as currency, percentages, etc.
- `format(1234.5, '0.00')` → `'1234.50'`
- `format(0.156, '0.0%')` → `'15.6%'`

### 4. Error Messages & Validation UX

- [ ] Clear, human-readable error messages with line/column
- [ ] Suggestions for common mistakes ("Did you mean `and` instead of `&&`?")
- [ ] A "validate" mode that returns structured errors for the web UI

For non-tech users, cryptic parser errors are a blocker.

### 5. Min/Max Functions

- [ ] Implement `min(a, b)` function
- [ ] Implement `max(a, b)` function

```
min(a, b)
max(a, b)
```

Essential for business rules like "apply the lower of two discounts" or "cap at maximum value".

---

## Priority 3: Medium

### 6. More String Functions

- [ ] Implement `left(s, n)` — first N characters
- [ ] Implement `right(s, n)` — last N characters
- [ ] Implement `repeat(s, n)` — repeat string N times
- [ ] Implement `reverse(s)` — reverse string

### 7. Website: Live Examples with Execution

- [x] Click example → loads in playground
- [ ] Show computed result inline for literals/simple expressions
- [ ] "Copy to clipboard" button

---

## Priority 4: Lower / Future

### 8. List/Array Type

- [ ] List literals: `[1, 2, 3]`
- [ ] Aggregation functions: `sum(list)`, `avg(list)`, `count(list)`
- [ ] Higher-order functions: `map(list, fn)`, `filter(list, fn)`

This is a significant language extension but would unlock aggregation use cases. Consider deferring until the simpler features are solid.

### 9. Compiler API: Structured Output

- [ ] Return AST as JSON for syntax highlighting
- [ ] Return type information for autocomplete
- [ ] Expose function signatures for documentation

For integration with Klaro Cards.

### 10. Type Coercion Functions

- [ ] Implement `toInt(s)` function
- [ ] Implement `toFloat(s)` function
- [ ] Implement `toString(n)` function
- [ ] Implement `toDate(s)` function

Allows users to convert between types explicitly when data comes as strings.
