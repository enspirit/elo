## Problem to solve

Finitio allows validating and dressing "external" data via type definitions,
including complex data/object structures (typically coming from json files).

In Elo's mindset, this means that while dressing scalars is possible:

```elo
'2025-12-26' |> Date
```

Then, object dressing should be possible too:

```elo
{ x: '2025-12-26' } |> Object({ x: Date })
```

Finitio also supports subtype constraints:

```finitio
PosInt = Int( i | i > 0 )
```

And complex object definitions like:

```finitio
{
  x :  Date|String    # Union type
  y :? Date           # Optional field
  ...                 # Open struct
}
```

## Current State

1. **Scalar dressing works**: `'2025-12-26' |> Date` via type selectors (`Date()`, `Int()`, etc.)
2. **Objects are simple**: `{key: value}` syntax, `.property` access, but no type validation
3. **Type system is flat**: `TypeKind` enum without structural type info (no object shapes)

## Key Challenges

### 1. Type schemas as first-class constructs

In `{ x: '2025-12-26' } |> Object({ x: Date })`, the inner `{ x: Date }` is NOT a regular
object - `Date` is a type selector, not a value.

### 2. Parsing ambiguity

Currently `{ x: Date }` parses as an object where `Date` is a variable reference. We'd need:
- Special context when parsing `Object(...)` argument
- Or new syntax like `@{ x: Date }` for type schemas

### 3. Recursive dressing

Each property needs to be dressed according to its type in the schema.

### 4. Subtype constraints

`Int(i | i > 0)` combines dressing with validation - dress first, then check constraint.

### 5. Optional fields & union types

```finitio
{
  x :  Date|String    # Union type
  y :? Date           # Optional field
  ...                 # Open struct
}
```

## Design Decisions

### Syntax for subtype constraints

**Options:**
```elo
# Option A: Finitio-like with pipe (recommended)
Int(i | i > 0)

# Option B: Using existing predicate syntax
Int & ?(i ~> i > 0)

# Option C: Explicit constraint keyword
Int where (i ~> i > 0)
```

Recommend **Option A** for Finitio compatibility and conciseness.

### Syntax for object type schemas

**Options:**
```elo
# Option A: Object() with special parsing (recommended)
{ x: '2025-12-26' } |> Object({ x: Date })

# Option B: Type literal syntax with prefix
{ x: '2025-12-26' } |> @{ x: Date }

# Option C: Registered type definitions only
let Person = Type({ name: String, born: Date }) in
  data |> Person
```

Recommend **Option A** - mirrors data structure, natural syntax.

### Failure mode

Return `NoVal` on validation failure (consistent with current type selectors).

### Named types

Allow via `let` bindings:
```elo
let PosInt = Int(i | i > 0) in
  x |> PosInt
```

## Phased Implementation Plan

### Phase 1 - Subtype constraints on scalars

```elo
'42' |> Int(i | i > 0)           # => 42
'-5' |> Int(i | i > 0)           # => NoVal
'abc' |> Int(i | i > 0)          # => NoVal (dressing fails first)
```

**Semantics:**
1. First dress/coerce the value using the base type selector
2. If dressing succeeds, evaluate the constraint predicate
3. Return the dressed value if constraint passes, `NoVal` if it fails

**AST node:**
```typescript
interface SubtypeConstraint {
  type: 'subtype_constraint';
  baseType: string;           // 'Int', 'Date', etc.
  variable: string;           // 'i' in Int(i | i > 0)
  constraint: Expr;           // i > 0
}
```

**IR transformation:**
```typescript
// Int(i | i > 0) on value x transforms to:
let i = Int(x) in
  if isVal(i) && (i > 0) then i else NoVal
```

**Target compilation:**

| Target | Output for `Int(i | i > 0)` on `x` |
|--------|-----------------------------------|
| **JS** | `((i) => i !== null && i > 0 ? i : null)(kInt(x))` |
| **Ruby** | `(->(i) { i && i > 0 ? i : nil }).call(x.to_i rescue nil)` |
| **SQL** | `CASE WHEN elo_int(x) IS NOT NULL AND elo_int(x) > 0 THEN elo_int(x) ELSE NULL END` |

### Phase 2 - Named type definitions

```elo
let
  PosInt = Int(i | i > 0),
  Percentage = Float(p | p >= 0 && p <= 100)
in
  score |> Percentage
```

### Phase 3 - Object dressing with simple types

```elo
{ x: '2025-12-26' } |> Object({ x: Date })
```

**Parser changes:**
- When parser sees `Object({ ... })`, treat inner object values as type references
- Property values must be type selector names or nested schemas

### Phase 4 - Object dressing with constrained types

```elo
let
  Person = Object({
    name: String(s | length(s) > 0),
    age: Int(a | a >= 0 && a <= 150),
    born: Date
  })
in
  jsonData |> Person
```

### Phase 5 - Optional fields

```elo
Object({
  name: String,
  nickname?: String    # Optional - missing or null is OK
})
```

### Phase 6 - Union types (if needed)

```elo
Object({ id: Int | String })
```

## Portability Analysis

| Feature | JS | Ruby | SQL | Notes |
|---------|-----|------|-----|-------|
| Subtype constraints | Yes | Yes | Yes | Lambdas/CASE |
| Object dressing | Yes | Yes | Partial | SQL needs jsonb helpers |
| Optional fields | Yes | Yes | Partial | NULL handling |
| Union types | Yes | Yes | Complex | SQL requires elaborate CASE |

## Open Questions

1. Should type schemas be first-class values (can be stored, passed, composed)?
   - **No** (simpler): Type schemas only valid inside `Object()`
   - **Yes** (powerful): More Finitio-like but adds complexity
   - Recommendation: Start with **No** for simplicity

2. Allow placeholder `?` shorthand like `Int(? | ? > 0)`?

3. Open vs closed objects - support `...` for allowing extra properties?
