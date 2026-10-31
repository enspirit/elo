# Type-expression depth-guard bypass → stack-overflow DoS

- **Reporter:** Atsushi Sada — https://github.com/ultra-supara
- **Source report:** `[Elo BBP] Type-expression depth-guard bypass …eml`
- **Reported against:** v1.0.1 (commit d2a89a8)
- **Reporter severity:** High (CVSS 7.5, availability-only)
- **Fix commit:** `Count type-expression recursion against the depth guard`

## The issue

Type expressions recurse in parallel to value expressions, but the depth guard
did not cover them — in **both** phases:

- **Parser:** `typeExpr()` / `typeExprPrimary()` and the schema/union/subtype
  family never touched `this.depth`.
- **Transform:** `transformTypeExprWithContext()` passed the current `depth`
  argument to its recursive calls unchanged, so the guard in `transformWithDepth`
  could never fire on type-expression recursion.

A source like `let T = [[[…Int…]]] in 1` with a few thousand nested brackets
overflowed the host call stack with an uncaught `RangeError` in each phase,
reachable through `parse()` and every `compileTo*` entry point.

## The fix

- Parser: wrap the body of `typeExpr()` in the shared `descend()` helper, so
  every nested array / schema / union / subtype level is counted.
- Transform: give `transformTypeExprWithContext()` its own depth check at the
  top and increment on every recursive descent (including into
  subtype-constraint conditions).

Deeply nested types now raise the typed `Maximum expression depth exceeded` /
`Maximum transform depth exceeded` error; legitimate types are unaffected.

## Tests

- `test/unit/parser.unit.test.ts` → "bounds nested type expressions".
- `test/unit/transform.unit.test.ts` → "throws when depth limit exceeded in
  nested type expressions" + a within-limit positive case.

Both red before the fix (no error / stack overflow), green after.
