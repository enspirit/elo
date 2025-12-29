## Problem to solve

We'd like Elo to be understood as an extended artithmetic/algebra. Instead of
being simple arithmetics on numbers, it's extended with addition types and
operators (with functions as a generalization of them).

## Idea

Let's already check our current state of arithmetics

- Int & Flow: +, -, *, /, %, (+ abs, etc.)
- String
  - `+` = concatenation
  - `*` = multiply (e.g. 3*'hi' = 'hihihi', same for 'hi'*3)
  - what else ?
- Boolean
  - `||` = or
  - `&&` = and
- Datetime
  - `+` = Datetime + Duration ~> Datetime
  - `-` = Datetime - Duration ~> Datetime
  - what else ?
- Duration
  - `+` = Duration + Datetime ~> Datetime
  - `+` = Duration + Duration ~> Duration
  - `-` = Duration - Duration ~> Duration
  - `*` = Duration * Number ~> Duration
  - `/` = Duration / Number ~> Duration
  - what else ?
- Tuple
  - `+` = Tuple + Tuple ~> Tuple (could be merge or deep merge ?)
  - what else ?
- List
  - `+` - list concatenation
  - what else ?
- DataPath
  - `+` - datapath concatenation (.name + .0.foo = .name.0.foo)
  - What else ?

## Todo

- Let's already check what we have, and make sure acceptance exists, adding
  them if needed
- Let's see what would be good additions to the stdlib for the vision

## Analysis (Claude)

### Currently Implemented & Tested

| Type | Operators | Test Coverage |
|------|-----------|---------------|
| Int/Float | +, -, *, /, %, ^ | arithmetic.elo, operators.elo |
| String | + (concat) | equality.elo:12, string-stdlib.elo:34-38 |
| Boolean | &&, \|\| | boolean-expressions.elo |
| Date | + Duration, - Duration, - Date | temporal-duration.elo, equality.elo |
| Duration | + Duration, - Duration, * Number, / Number | equality.elo:21-29 |
| Datetime | + Duration, - Duration, - Datetime | equality.elo:17-19,30, temporal.elo |

### ✅ Added Acceptance Tests (this session)

Added tests in equality.elo:28-30 for:
- `P2D - P1D == P1D` (Duration - Duration)
- `PT2H - PT1H == PT1H` (Duration - Duration with hours)
- `typeOf(D2024-01-15T10:00:00Z - D2024-01-15T09:00:00Z) == 'Duration'` (Datetime - Datetime)

### NOT Implemented Yet (mentioned in task)

1. **String * Number** (e.g., `3*'hi'` = `'hihihi'`) - NOT implemented
2. **Tuple/Object + Tuple/Object** (merge) - NOT implemented
3. **List + List** (concatenation) - NOT implemented
4. **DataPath + DataPath** (concatenation) - NOT implemented

### Questions to Resolve Before Implementation

1. **String * Number**: Should `'hi' * 3` and `3 * 'hi'` both work? (commutative)
2. **Tuple/Object merge**: Shallow merge or deep merge? What about key conflicts?
3. **List concat**: Should it flatten nested lists or just concatenate as-is?
4. **DataPath concat**: Confirm `.name + .foo` = `.name.foo` semantics

### Recommendations

These additions align well with the "extended arithmetic" vision:
- String * Number is intuitive for users coming from Python/Ruby
- List + List is standard in most functional languages
- Object merge is useful for data manipulation (common in JSON processing)
- DataPath concat enables dynamic path construction
