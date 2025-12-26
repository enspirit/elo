## Problem to solve

The SQL `assert()` function uses `pg_terminate_backend()` to kill the database
connection on assertion failure. This is dangerous and inappropriate - it's a
denial of service mechanism rather than a proper assertion.

## Current implementation

```typescript
// src/bindings/sql.ts:149-156
sqlLib.register('assert', [Types.any], (args, ctx) => {
  const condition = ctx.emit(args[0]);
  return `CASE WHEN ${condition} THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END`;
});
```

## Proposed fix

Replace with a standard PostgreSQL error mechanism:
- Option 1: Use division by zero to raise error: `CASE WHEN condition THEN TRUE ELSE 1/0 END`
- Option 2: Use a subquery that fails: `CASE WHEN condition THEN TRUE ELSE (SELECT 1 FROM (SELECT 1 WHERE FALSE) x HAVING TRUE) END`
- Option 3: Simply return FALSE and let the caller handle it

The fix should raise an error without terminating the connection.
