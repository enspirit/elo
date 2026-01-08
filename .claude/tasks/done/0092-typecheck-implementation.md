## Problem to solve

Add static type checking to Elo to analyze the IR and detect type errors before compilation.

## User Requirements

- **Warn only**: Type errors don't block compilation, just report to stderr
- **Warn on `any`**: Report when operations involve the `any` type

## Implementation Plan

### 1. Create `src/typecheck.ts`

```typescript
export interface TypeWarning {
  message: string;
  location?: { line?: number; column?: number };
  category: 'type_mismatch' | 'unknown_function' | 'any_type';
}

export class TypeCheckCollector {
  warnings: TypeWarning[] = [];

  warnTypeMismatch(fn: string, argTypes: EloType[], context?: string): void;
  warnAnyType(context: string): void;
  warnUnknownFunction(name: string): void;
}
```

### 2. Modify `src/transform.ts`

Add `typeChecker?: TypeCheckCollector` to `TransformOptions`.

Check at key points:
- `transformBinaryOp` (line 321): Use `eloTypeDefs.has()` after lookup
- `transformUnaryOp` (line 345): Same for unary operators
- `transformFunctionCall` (line 443): Check stdlib function signatures
- When any `argType` is `any`, add warning

### 3. Modify `src/eloc.ts`

Add `--typecheck` flag:

```typescript
case '--typecheck':
  options.typecheck = true;
  break;
```

When enabled, create `TypeCheckCollector`, pass through transform, print warnings to stderr.

### 4. Add Unit Tests

Create `test/unit/typecheck.test.ts` covering:
- Unknown operator signatures (`"hello" - 5`)
- Operations with `any` type (`_.x + 1`)
- Unknown functions (`unknownFn(1)`)

## Type Error Categories

| Category | Example | Warning |
|----------|---------|---------|
| `type_mismatch` | `"hello" - 5` | No signature for `sub(string, int)` |
| `unknown_function` | `foo(1)` | Unknown function `foo` |
| `any_type` | `_.x + 1` | Operation involves `any` type |

## Key Insight

The existing `eloTypeDefs` already has `has(name, argTypes)` to check if a signature exists. We just need to call it during transformation and collect warnings.
