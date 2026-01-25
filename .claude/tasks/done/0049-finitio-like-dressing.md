## Current Status (2026-01-01)

15 commits on `finitio-types` branch. All unit, integration, and acceptance tests pass.

### Completed ✅

1. **Parser** - Uppercase let bindings trigger type expression parsing (`let Person = {...}`)
2. **AST/IR** - TypeExpr nodes: TypeRef, TypeSchema, SubtypeConstraint, ArrayType, UnionType
3. **JavaScript compiler** - Full implementation with Result-based parser functions
4. **Ruby compiler** - Full implementation with same Result-based approach (c3f13af)
5. **Acceptance tests** - 34 assertions in `test/fixtures/type-definitions.elo`

### Remaining Sub-tasks

- [x] **README documentation** - Added to Current Features list
- [x] **Website documentation** - docs.astro, learn.astro, stdlib.astro, Layout.astro updated

### Finitio Type Constructs Coverage

| Finitio Construct         | Elo Syntax                          | Status | Notes                                     |
| ------------------------- | ----------------------------------- | ------ | ----------------------------------------- |
| **Any type**              | `.` or `Any`                        | ✅     | Accepts any value                         |
| **Base types**            | `String`, `Int`, `Bool`, `Datetime` | ✅     | With coercion (e.g., `'42'` → `42`)       |
| **Subtype constraint**    | `Int(i \| i > 0)`                   | ✅     | Predicate on dressed value                |
| **Union type**            | `Int\|String`                       | ✅     | PEG-style: tries left-to-right            |
| **Sequence type**         | `[Int]`                             | ✅     | Homogeneous arrays                        |
| **Struct type**           | `{ name: String }`                  | ✅     | Object schemas with property types        |
| **Named types**           | `let Person = ... in`               | ✅     | Uppercase let bindings                    |
| **Tuple type**            | `[Int, String]`                     | ❌     | Fixed-length positional - not implemented |
| **Relation type**         | `{{name: String}}`                  | ❌     | Set of tuples - not implemented           |
| **Set type**              | `{Int}`                             | ❌     | Unique elements - not implemented         |
| **Optional attr**         | `name :? String`                    | ✅     | Missing/null values become null           |
| **Closed struct**         | `{ name: String }`                  | ✅     | Extra attributes cause failure (default)  |
| **Open struct (ignored)** | `{ name: String, ... }`             | ✅     | Extra attrs allowed but not in output     |
| **Open struct (typed)**   | `{ name: String, ...: Int }`        | ✅     | Extra attrs must match type               |

### Composition Support

All implemented constructs compose freely:

```elo
# Array of union types
let T = [Int|String] in ['1', 'hello'] |> T  # => [1, 'hello']

# Struct with constrained fields
let Person = { age: Int(i | i > 0) } in { age: 25 } |> Person

# Array of structs
let People = [{ name: String }] in data |> People

# Union of struct types
let Result = { ok: Bool } | { error: String } in data |> Result
```

### Target Language Support

| Target         | Status          | Notes                                                           |
| -------------- | --------------- | --------------------------------------------------------------- |
| **JavaScript** | ✅ Complete     | All constructs work, 34 acceptance tests                        |
| **Ruby**       | ✅ Complete     | All constructs work, same tests as JS                           |
| **SQL**        | ⊘ Not supported | SQL lacks lambda/function capabilities for Result-based parsing |

### Implementation Details

**Parser (`src/parser.ts`):**

- Uppercase let bindings (`let Person = ...`) trigger type expression parsing
- `typeExpr()` handles: `.`, `Any`, `TypeName`, `TypeName(x \| pred)`, `[T]`, `{...}`, `T\|U`
- Lexer fix: 'P' followed by non-duration chars tokenizes as identifier (not duration)

**AST (`src/ast.ts`):**

- `TypeExpr = TypeRef | TypeSchema | SubtypeConstraint | ArrayType | UnionType`
- `TypeDef` node for `let TypeName = TypeExpr in body`

**IR (`src/ir.ts`):**

- Mirrors AST types with `IR` prefix
- `IRTypeDef`, `IRTypeRef`, `IRTypeSchema`, `IRSubtypeConstraint`, `IRArrayType`, `IRUnionType`

**JS Compiler (`src/compilers/javascript.ts`):**

- Generates parser functions with Result type: `{ success, path, value, cause }`
- Runtime helpers: `pOk`, `pFail`, `pUnwrap`, `pAny`, `pString`, `pInt`, `pBool`, `pDatetime`
- Inline parser functions wrapped in parens for immediate invocation

**Ruby Compiler (`src/compilers/ruby.ts`):**

- Generates parser lambdas with Result hash: `{ success:, path:, value:, cause: }`
- Runtime helpers: `p_ok`, `p_fail`, `p_unwrap`, `p_any`, `p_string`, `p_int`, `p_bool`, `p_datetime`
- Parser helpers wrapped in lambda immediately invoked (`.call`) for scoping

**Test Coverage (`test/fixtures/type-definitions.elo`):**

- 34 assertions covering all implemented constructs
- Tests for success cases, failure cases, and edge cases
- assertFails() helper for testing error-throwing expressions

---

## Next Steps

**Task 49 is complete.** All sub-tasks done:

- JavaScript and Ruby compilers implemented
- README and website documentation added
- All tests passing

### Not in scope

- **SQL target** - SQL lacks lambda/function capabilities for Result-based parsing
- Tuple types `[Int, String]` - low priority, rarely needed
- Set types `{Int}` - would require runtime deduplication
- Relation types `{{...}}` - complex, SQL-specific use case

---

## Commit History (task 49)

```
c3f13af Add Ruby compilation support for type definitions
20aac0a Support multiple type bindings and type alias references
84f3fef Improve type error messages with path and description
fca51ed Unify selector semantics with Finitio (throw on failure)
0a32f3d Optional attributes skip missing values instead of null
7c2112e Add unit tests for optional commas in type schemas
cfc14fa Support optional commas in type schema definitions
9bf16d6 Add extra attributes support to type schemas
3ceeeb0 Add assertFails helper and throw on type parse failures
432c75e Add optional attributes to type definitions
3f3e149 Update task 49 with Finitio coverage summary
cad0be8 Fix inline parser invocation in type schemas
cd73c80 Add union types to type definitions
cb9c10d Add subtype constraints and array types to type definitions
1462eb9 Add Finitio-like type definitions for JavaScript
```

---

## Original Problem Statement

Finitio allows validating and dressing "external" data via type definitions,
including complex data/object structures (typically coming from json files).

In Elo's mindset, this means that while dressing scalars is possible:

```elo
'2025-12-26' |> Date
```

Then, object dressing should be possible too:

```elo
let Person = { name: String, born: Date } in
  data |> Person
```

## Key Design Decisions

1. **Uppercase let bindings for types**: `let Person = {...}` vs `let person = {...}`
2. **Closed structs by default**: Extra properties cause failure, use `...` to allow
3. **Throw on failure**: Type parse failure throws an error (use assertFails for testing)
4. **PEG-style unions**: Try alternatives left-to-right, return first success
5. **Result type internally**: `{ success, path, value, cause }` for composability
6. **Auto-unwrap for users**: `value |> Type` returns dressed value or throws on failure
