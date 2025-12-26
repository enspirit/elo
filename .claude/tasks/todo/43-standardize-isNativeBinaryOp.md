## Problem to solve

The `isNativeBinaryOp()` function has inconsistent signatures across bindings:

- Ruby: `isNativeBinaryOp(ir: IRExpr, opMap: Record<string, string>)` - requires opMap
- JavaScript: `isNativeBinaryOp(ir: IRExpr)` - no opMap parameter
- SQL: `isNativeBinaryOp(ir: IRExpr)` - no opMap parameter

## Files affected

- `src/bindings/ruby.ts:14`
- `src/bindings/javascript.ts:15`
- `src/bindings/sql.ts:23`

## Proposed fix

Standardize to not require opMap parameter (like JS/SQL). Ruby binding should
use its internal OP_MAP constant instead of requiring it as a parameter.
