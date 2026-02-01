## Problem to solve

The current `assert()` function works for acceptance tests but has no real-world
use in larger programs because Elo has no statement sequencing.

We need a way to express preconditions/postconditions that:
1. Can be embedded in real programs (not just tests)
2. Can be stripped at compile time (production builds)
3. Include optional labels/messages for reasoning about code

## Prerequisites

Task 121 (Enhanced Subtype Constraints) must be completed first. The labeled
constraint syntax `Type(x | label: condition, ...)` provides the foundation
for pipe-style guards.

## Design

### Label Forms

Labels are optional and support two forms (same as subtype constraints):

```elo
# Identifier label (Finitio-style)
guard positive: x > 0 in x * 2

# String message (more expressive)
guard 'age must be positive': x > 0 in x * 2

# No label
guard x > 0 in x * 2
```

### Block-Style Syntax

```elo
guard CONDITION in EXPRESSION
guard LABEL: CONDITION in EXPRESSION
```

Examples:

```elo
# Without label
guard _.age > 0 in
  compute(_)

# With identifier label
guard positive: _.age > 0 in
  compute(_)

# With string message
guard 'age must be positive': _.age > 0 in
  compute(_)
```

### Multiple Guards (syntactic sugar)

```elo
# Sugar:
guard
  positive: _.age > 0,
  'name is required': _.name != ''
in
  compute(_)

# Desugars to:
guard positive: _.age > 0 in
guard 'name is required': _.name != '' in
  compute(_)
```

### Pipe-Style Syntax

Uses predicate binding (like subtype constraints):

```elo
# Basic - x binds the piped value
data |> guard(x | x.valid) |> transform

# With identifier label
data |> guard(x | valid: x != null) |> transform

# With string message
data |> guard(x | 'must be valid': x != null) |> transform

# Multiple conditions
data |> guard(x |
  valid: x != null,
  'has items': size(x) > 0
) |> transform
```

Semantics:
- `guard(x | condition)` returns `x` if condition is true, throws otherwise
- Reuses constraint parsing from task 121

### Check (synonym for postconditions)

`check` is a pure synonym for `guard`, but more idiomatic for postconditions:

```elo
let
  result = compute(_)
in
  check
    non_empty: size(result) > 0
  in
    result
```

### Full Syntactic Sugar

`guard`, `let`, and `check` can all stack before a single `in`:

```elo
# Full sugar:
guard
  'valid input': _.data != null
let
  result = transform(_.data)
check
  non_empty: size(result) > 0
in
  result

# Desugars to:
guard 'valid input': _.data != null in
  let result = transform(_.data) in
    check non_empty: size(result) > 0 in
      result
```

### Complete Example

```elo
# Block-style with full sugar
guard
  'valid input': _.data != null
let
  result = transform(_.data)
check
  non_empty: size(result) > 0
in
  result

# Pipe-style equivalent
_.data
  |> guard(d | 'valid input': d != null)
  |> transform
  |> guard(r | non_empty: size(r) > 0)
```

## Compile Modes

- Default: guards/checks evaluated at runtime (throws on failure)
- `--strip-guards`: all guard/check constructs removed

## Implementation Steps

### Block-Style Guards

1. Add `guard` and `check` to lexer as new keywords
2. Add GuardExpression to AST
3. Implement block-style parsing (reuse label detection from task 121)
4. Implement multi-guard desugaring
5. Implement `guard...let...check...in` sugar
6. Transform to IR (with flag for stripping)
7. Implement in all three compilers
8. Add acceptance tests
9. Document in Reference page

### Pipe-Style Guards

1. Parse `guard(x | ...)` reusing constraint parsing from task 121
2. Emit as guard check that returns input value
3. Add acceptance tests
4. Document in Reference page
