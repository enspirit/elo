## Problem to solve

In task #39 (hold on, information contracts) we identified that some error
handling might be needed. For instance because a Selector like Date may fail
(invalid iso8601).

So we probably need to add basic error support to the language.

## Idea

- I'm ok with a general error, such as ArgumentError
- I'm ok that stdlib raise this kind of error
- Possibly we need a user-facing `fail` function too, but I don't want to
  add an explicit try/catch mechanism

## Alternative

The real need is to offer a way to do something like

```
try `Date<iso8601>`, if it fails fallbacks to `Date<other representation>`,
if it fails, fail with an error message.
```

Instead of error handling, this could be seen as a chain of function calls
where the first one that returns a non `NoVal` type wins. We could have a
special construct for this.

## Brainstorming

What clean constructs exist in other languages for this kind of need ?

### Patterns from other languages

1. **Nullish Coalescing / COALESCE** - Most portable:
   - SQL: `COALESCE(a, b, c)` — first non-NULL wins
   - JavaScript: `a ?? b ?? c`
   - Ruby: `||` but different semantics

2. **Rust/Haskell** - `or_else` / `<|>` operator

3. **Ruby** - inline rescue: `expr rescue fallback`

4. **Kotlin/Swift** - Elvis operator `?:`

### The `|` operator (Finitio-inspired)

Finitio uses `X = Y|Z` for union types that also dress values with fallback
semantics. This maps well to Elo:

```elo
Date<iso8601> | Date<alternative> | fail("invalid date")
```

**Why `|` works:**

- Finitio precedent — consistent semantics across tools
- Infix implies short-circuit — unlike `coalesce(a,b,c)` which looks eager
- Grammar/regex intuition — `|` universally means "alternative"
- Haskell's `<|>` — Alternative typeclass uses this exact pattern

**Portable compilation:**

- SQL: `COALESCE(a, b, c)`
- JS: `(a) ?? (b) ?? (c)`
- Ruby: `begin/rescue` blocks or helper

### What triggers fallback?

| Trigger      | Pros                                 | Cons                                   |
| ------------ | ------------------------------------ | -------------------------------------- |
| `NoVal` only | Clean, maps to SQL NULL, predictable | Selectors must return NoVal on failure |
| Exceptions   | Catches all errors                   | Less predictable, harder in SQL        |

**Decision: NoVal-based** — it's the portable "nothing" value.

### Problem: Losing error context

With pure NoVal, we lose WHY something failed. Options considered:

1. **Explicit message at end** — Simple but loses specifics
2. **Tagged NoVal** — NoVal carries optional reason ✓
3. **Accumulating errors** — Collect all failures (complex)
4. **Selector-specific error form** — e.g., `Date.error(input)`

## Chosen approach: Tagged NoVal

NoVal can optionally carry a reason:

```
NoVal                        -- simple absence
NoVal("not valid iso8601")   -- absence with reason
```

The `|` operator:

1. If left is a value → return it
2. If left is NoVal → try right side
3. If all fail → last NoVal's reason is preserved

`fail()` without arguments surfaces that reason.

Compilation:

- SQL: NULL (reason lost, acceptable)
- JS/Ruby: Can preserve reason in a wrapper

## Design: Tagged NoVal implementation

### Current state

NoVal is represented as native null:

- JS: `null` / `undefined`
- Ruby: `nil`
- SQL: `NULL`

Helper functions exist:

- `isVal(x)` → checks x is not null
- `orVal(x, default)` → returns x if value, else default
- `typeOf(x)` → returns 'NoVal' for null values

### Design decision: Error tracking via exception catching

Rather than changing the NoVal representation (which would complicate all operations),
the `|` operator compiles to code that:

1. Evaluates alternatives left-to-right
2. Returns first non-NoVal value
3. Catches exceptions and stores the message as "last error"
4. If all alternatives fail, the last error is available

This means:

- NoVal stays simple (null/nil/NULL)
- Exceptions during evaluation become NoVal + tracked reason
- `fail()` explicitly throws (and can use tracked reason)

### Grammar change

Add `|` as a binary operator, higher than `or`/`and`, lower than comparisons:

```
alternative = comparison ("|" comparison)*
```

Precedence (lowest to highest):

1. `or`
2. `and`
3. `|` (alternative)
4. comparisons
5. arithmetic
6. unary

This means:

- `a or b | c` → `a or (b | c)` — a, or (b else c)
- `a and b | c` → `a and (b | c)` — a AND (b else c)
- `a | b > 0` → `(a | b) > 0` — compare (a else b) to 0
- `getValue(x) | 0 + 1` → `(getValue(x) | 0) + 1` — add 1 to (value else 0)

### IR representation

Option A: New IR node type

```typescript
export interface IRAlternative {
  type: "alternative";
  alternatives: IRExpr[];
  resultType: EloType;
}
```

Option B: Treat as function call

```typescript
irCall("alternative", [a, b, c], argTypes, resultType);
```

**Decision: Option A** - cleaner semantics, special compilation needed anyway.

### Compilation targets

**JavaScript:**

```javascript
// a | b | fail("error")
(function() {
  let _err = null;
  { try { let v = <a>; if (v != null) return v; } catch(e) { _err = e.message; } }
  { try { let v = <b>; if (v != null) return v; } catch(e) { _err = e.message; } }
  throw new Error(_err || "error");
})()
```

**Ruby:**

```ruby
# a | b | fail("error")
begin
  _err = nil
  begin; v = <a>; return v unless v.nil?; rescue => e; _err = e.message; end
  begin; v = <b>; return v unless v.nil?; rescue => e; _err = e.message; end
  raise _err || "error"
end
```

**SQL (PostgreSQL):**

```sql
-- a | b | fail("error")
COALESCE(<a>, <b>, elo_fail('error'))
```

For SQL, error tracking is lost (acceptable per design). The `elo_fail(text)` function
is a PL/pgSQL helper that raises an exception:

```sql
CREATE OR REPLACE FUNCTION elo_fail(msg text) RETURNS text AS $$
BEGIN
  RAISE EXCEPTION '%', msg;
END;
$$ LANGUAGE plpgsql;
```

### The `fail` function

Two signatures:

1. `fail(message: String)` → always throws with given message
2. `fail()` → throws with last captured error (if in `|` chain)

For `fail()` without args to work, we need:

- JS: access to `_err` variable in scope
- Ruby: access to `_err` variable in scope
- SQL: N/A (just returns NULL or we skip this variant)

**Simpler approach**: Only support `fail(message)`. Users write:

```elo
Date<iso8601>(s) | Date<dmy>(s) | fail("Invalid date: " ++ s)
```

### Type inference

For `a | b`:

- If both have same type → that type
- If one is NoVal → other's type
- Otherwise → union type or `any`

### Implementation steps

1. Add `|` to parser as binary operator
2. Add `IRAlternative` to IR
3. Transform `|` expressions into `IRAlternative`
4. Add `fail` function to typedefs
5. Implement `fail` in each binding
6. Implement `IRAlternative` compilation in each compiler
7. Add tests

### Complexity assessment

- Parser: Low (add operator)
- IR: Low (new node type)
- Transform: Medium (type inference for alternatives)
- Compilers: Medium (IIFE/begin-end patterns)
- Selectors returning NoVal: Future work (currently throw)

**Verdict: Feasible, not implementation hell.**

## Implementation completed

The following was implemented:

1. **Parser**: Added `|` operator with precedence between `and` and comparisons
2. **AST**: Added `Alternative` node type
3. **IR**: Added `IRAlternative` node type
4. **Transform**: Transforms `Alternative` AST into `IRAlternative` IR
5. **Compilers**:
   - JS: IIFE with try/catch chain
   - Ruby: Lambda with begin/rescue chain
   - SQL: COALESCE
6. **fail function**: Added to typedefs and all bindings
7. **Tests**: Added `alternative.elo` and `fail.elo` fixtures

Example usage:

```elo
indexOf('hello', 'x') | indexOf('hello', 'z') | -1
```

Compiles to:

- JS: `(function() { let _err = null; { try { let v = ...; if (v != null) return v; } catch(e) { _err = e.message; } } ... return null; })()`
- Ruby: `->() { _err = nil; begin; v = ...; return v unless v.nil?; rescue => e; _err = e.message; end; ... nil }.call`
- SQL: `COALESCE(...)`

### Resolved decisions

1. **`|` catches both exceptions and NoVal**
   - Exceptions are an implementation detail, not exposed in Elo semantics
   - More flexible: handles both selectors that throw and those returning NoVal

2. **Precedence: `|` higher than `or`/`and`, lower than comparisons**
   - `a or b | c` → `a or (b | c)`
   - `a | b > 0` → `(a | b) > 0`

3. **SQL uses `elo_fail()` helper function**
   - Safer and more explicit than accepting NULL
   - Function raises EXCEPTION in PL/pgSQL
