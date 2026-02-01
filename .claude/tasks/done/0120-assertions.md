## Problem to solve

When programs become complex, one needs to be able to reason clearly and
document/instrument their program to do so.

## Idea

- How could we add support for assertions / pre-conditions / post-conditions ?
- Are they annotations, a bit like comments, but not part of the language
  semantics per se ?
- Or are they special syntaxes for assert functions taking a continuation
  as parameter ?

## Analysis

**Assertions are already implemented** as stdlib functions. The design decision was:

### Current Implementation

1. **`assert(condition)`** - Validates a boolean condition at runtime
   - Throws/raises error if condition is false
   - Returns `true` on success

2. **`assert(condition, message)`** - Same with custom error message

3. **`assertFails(fn)`** - Tests that a lambda throws an error
   - Used for testing error conditions

### Design Decision Made

The implementation chose **regular function calls** (option 3), not annotations:

- **Not annotations**: They ARE part of language semantics - they execute and
  can throw errors. This aligns with the principle that Elo is an expression
  language where everything has a value.

- **Not continuations**: Simple function call syntax rather than special
  continuation-based syntax. This keeps the language simple and portable.

- **Type signatures**:
  ```
  assert: (bool) -> bool
  assert: (bool, string) -> bool
  assert: (any) -> bool
  assert: (any, string) -> bool
  assertFails: (fn) -> bool
  ```

### Documentation Status

- ✅ Documented in README (example usage)
- ✅ Documented in Reference page (Assertions section)
- ✅ Used extensively in test fixtures
- ✅ All 3 target languages supported (JS throws, Ruby raises, SQL terminates)

### Pre/Post-Conditions

These were mentioned but NOT implemented. Given the simplicity principle
("we SHOULD always restrict Elo's powerfullness if a wanted feature leads to
a violation of those principles"), the current simple assertion functions are
sufficient. Pre/post-conditions would add complexity for marginal benefit in
Elo's use cases (data validation and transformation).

**Conclusion**: Task is already done. Moving to done folder.
