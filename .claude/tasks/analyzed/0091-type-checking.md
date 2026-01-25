## Problem to solve

- Programs could be wrong. Also compiled programs are sometimes more complex
  than necessary because we need to generate kXXX functions (e.g. kMul) to cover
  all possible cases at runtime while some of them might be unnecessary.
- A type inference + checker could be much greater for end users.

## Idea

- Add an optional --typecheck to the elo command
- Check whether a known type inference algorithm could help us here. Make the
  analysis at least and let's see what is possible.

## Analysis

### Current State

The Elo compiler already has type inference during the transform phase:

- `src/transform.ts` infers types during AST → IR conversion
- Types are stored in `IRCall.argTypes` and `IRCall.resultType`
- `src/typedefs.ts` maps function signatures to result types
- When types don't match, `eloTypeDefs.lookup()` returns `Types.any` silently

### What Type Checking Could Detect

1. **Type mismatches for operators**: e.g., `"hello" - 5` (no `sub(string, int)` signature)
2. **Type mismatches for function arguments**: e.g., `upper(42)` (expects string)
3. **Unknown functions**: Function name not found in typedefs

### Handling `any` Type

The `any` type should suppress errors because:

- Variables from input `_` have type `any` (unknown at compile time)
- Lambda parameters have type `any`
- These are legitimate cases where runtime type checking is needed

### Implementation Approach

No new type inference algorithm needed - the existing transform phase already infers types. We just need to:

1. Add `--typecheck` flag to CLI (`src/cli.ts`)
2. Create `src/typecheck.ts` with `TypeError` interface
3. Modify `src/transform.ts` to collect errors when types don't match
4. Add `hasSignature()` method to `src/typedefs.ts`
5. Wire CLI to report errors to stderr

### Key Design Decisions

- **Opt-in**: Type checking only runs when `--typecheck` flag is provided
- **`any` suppresses errors**: Dynamic inputs don't trigger false positives
- **Non-blocking**: Compilation still proceeds, errors are reported to stderr

### Questions

1. Should type errors block compilation or just warn?
2. Do we want source location info (line/column) in type errors?
3. Should we also reduce generated code complexity when types are known? (the "kXXX functions" problem mentioned)
