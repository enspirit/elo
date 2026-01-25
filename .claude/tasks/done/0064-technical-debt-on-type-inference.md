## Problem to solve

- Elo is not strongly typed (so far)
- We have very basic heuristics of type inference, not a real algo
- So we end up with lots of variables with type `Any` when emitting code
- And some expression fail to compile with 'Function not found'...
- ...unless we doubly register lots of functions twice (see commit 16196c6902fef857a40fdcf69ff60f27cf703c23)
- We have `typeGeneralizations`, that works the other way round.

## Investigation Results

### The Problem

When type inference results in `Any` types (from lambda parameters, member access, etc.),
the stdlib lookup fails for functions that are only registered for specific types.

**Current behavior**: `typeGeneralizations` goes from concrete → any:

- Looking up `upper(String)` tries `upper:string`, then `upper:any`
- But looking up `abs(Any)` only tries `abs:any`, not `abs:int` or `abs:float`

**Affected functions** (not registered for Any):

- Numeric: `abs`, `round`, `floor`, `ceil`
- Temporal: `year`, `month`, `day`, `hour`, `minute`

**Functions already working** (double-registered):

- String: `upper`, `lower`, `trim`, `length`, etc.
- Array iteration: `map`, `filter`, `reduce`, `any`, `all`
- Arithmetic: `add`, `sub`, `mul`, etc. (have Any helper functions)

### Test File Created

`test/unit/type-specialization.unit.test.ts` - 22 tests documenting the behavior

## Solution Implemented

### Two-part fix:

1. **Type specialization fallback in StdLib.lookup()** (`src/stdlib.ts:124-150`)

   When looking up a function with Any arg types and no exact match is found through
   generalization, the lookup now falls back to finding any implementation with matching
   name and arity. This allows `abs(any)` to find `abs(int)` or `abs(float)`.

2. **Explicit Any registrations for functions with different implementations**

   For `round`, `floor`, `ceil` (where int uses identity, float uses Math.x), we added
   explicit Any registrations using the safe float implementation. This is necessary
   because the int optimization (identity) would give wrong results for floats.

### Changes Made

- `src/stdlib.ts` - Added type specialization fallback in lookup()
- `src/bindings/javascript.ts` - Added `round(any)`, `floor(any)`, `ceil(any)`
- `src/bindings/ruby.ts` - Added `round(any)`, `floor(any)`, `ceil(any)`
- `test/unit/type-specialization.unit.test.ts` - New test file with 22 tests

### Why This Approach?

The solution "kills many problems at once":

- The fallback mechanism automatically works for functions where implementations are
  equivalent (like `abs` where both int and float use the same code)
- Explicit Any registrations are only needed when implementations differ
- No changes to the type inference algorithm required
- Backwards compatible with existing code
- Simple, localized changes

### What Still Works

- Type generalization (concrete → any) continues to work as before
- Explicit Any registrations take priority over fallback
- Arity checking prevents incorrect matches
- All existing 622 unit tests pass
