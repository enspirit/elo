# Parser depth-guard bypass → stack-overflow DoS

- **Reporter:** uaaw — https://github.com/uaaw
- **Source report:** `Security Vulnerability Report_ @enspirit_elo (2 issues) …eml` (Vulnerability 1)
- **Reported against:** v1.0.1
- **Reporter severity:** High (CVSS 7.5 — CWE-674 Uncontrolled Recursion, CWE-400)
- **Fix commit:** `Enforce the parser depth guard on all self-recursive descents`

## The issue

The parser owns a depth guard (`checkDepth()`), but it was invoked from a
single site inside `expr()`. Four directly self-recursive parse functions —
`unary()`, `power()`, `guardExprParse()` and `typeDefExpr()` — never counted
their own recursion. A crafted input a few kilobytes long drove unbounded
recursion through one of those paths and overflowed the Node.js call stack with
an uncaught `RangeError: Maximum call stack size exceeded`, violating the
documented guarantee that "every Elo expression finishes".

Confirmed vectors (all raised `RangeError` on v1.0.1):

- `!!!…true` (10 000 `!`) — `unary()`
- `1^1^1…` — `power()`
- `guard true guard true … in 1` — `guardExprParse()`
- `let T0 = {…}, T1 = {…}, … in 1` — `typeDefExpr()`

**Correction to the report:** the report also listed a long chain of `let`
value bindings (`let a0=.., a1=.., …`) as vector 1c. That path is iterative,
not recursive, and does **not** crash. It is not part of this fix.

## The fix

Added a small `descend<T>(parse)` helper that increments `this.depth`, calls
`checkDepth()`, runs the inner parse, and decrements in `finally`. It is applied
**only at the self-recursive call sites**, so a single non-recursive call costs
nothing and ordinary expressions keep the full depth-100 budget. Deep recursion
now raises the typed `Maximum expression depth exceeded (100)` error.

## Tests

`test/unit/parser.unit.test.ts` → "Parser - Recursion depth guards (security)":
each vector asserts the typed depth error (red before the fix — the guard never
fired; green after), plus a within-limit case proving legitimate nesting still
parses.
