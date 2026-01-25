## Problem to solve

Subtype constraints currently support only a single unlabeled condition:

```elo
Int(i | i > 0)
```

Finitio supports named constraints which are more expressive:

```
Integer(i | positive: i >= 0, even: i % 2 == 0)
```

We should align with Finitio and support labeled/multiple constraints.

## Design

### Enhanced Syntax

```elo
# Single labeled constraint
Int(i | positive: i > 0)

# Multiple constraints
Int(i | positive: i > 0, even: i % 2 == 0)

# Mixed (some labeled, some not)
Int(i | i > 0, even: i % 2 == 0)

# String messages also supported
Int(i | 'must be positive': i > 0)
```

### Label Forms

Labels are optional and support two forms:

- `IDENTIFIER COLON` → identifier label: `positive: i > 0`
- `STRING COLON` → string message: `'must be positive': i > 0`

### Error Messages

When constraint fails:

- Identifier label: `"constraint 'positive' failed"`
- String message: use as-is `"must be positive"`
- No label: `"constraint failed"`

## Implementation Steps

1. Update `subtypeConstraintExpr()` in parser to:
   - Detect labels (identifier or string before colon)
   - Parse multiple comma-separated conditions
2. Update AST `SubtypeConstraint` to store array of `{label?, condition}`
3. Update IR transform to handle multiple constraints
4. Update compilers to:
   - Check all constraints
   - Include label in error messages
5. Add unit tests for parser
6. Add acceptance tests for labeled constraints
7. Document in Reference page
