# Y-combinator via `apply` → non-termination DoS

- **Reporter:** Atsushi Sada — https://github.com/ultra-supara
- **Source report:** `[Elo BBP] … denial-of-service via Y-combinator self-application …eml`
- **Reported against:** v1.0.1 (commit d2a89a8)
- **Reporter severity:** High (CVSS 7.5, availability-only); Medium in programme tiers
- **Fix commit:** `Reject applying a value not known to be a function`

## The issue

The IR transform rejected recursive **named** calls (`function_call`), but the
sibling `apply` branch — which handles `(expr)(args)` — never inspected its
callee. Lambda parameters are typed `any`, so applying one to itself produced an
`apply(variable, …)` node that compiled 1:1 to a "call this value" primitive in
every backend. The standard Y-combinator term

```
(fn(x ~> (x)(x)))(fn(x ~> (x)(x)))
```

compiled and ran without termination — `RangeError` (JS), `SystemStackError`
(Ruby), `RecursionError` (Python) — breaking the "every Elo expression finishes"
guarantee from a 38-byte source.

## The fix

In the `apply` branch, after recursing the callee, reject it when it is a plain
`variable` whose inferred type is not `fn`. The check is intentionally narrow —
these remain valid:

- `(fn(x ~> …))(5)` — immediately-invoked lambda (callee is a `lambda`)
- `_.callback()` — function stored in data (callee is `member_access`)
- `let f = fn(x ~> …) in (f)(5)` — let-bound function (variable inferred `fn`)

Only applying an arbitrary `any`-typed value (a lambda parameter, `_`) is
refused, which is exactly the construct that can smuggle in non-terminating
recursion. Note `name(args)` parses as `function_call`, not `apply`, so ordinary
calls of let-bound lambdas are untouched.

## Tests

`test/unit/transform.unit.test.ts` → "transform - apply recursion guard
(security)": rejects `fn(x ~> (x)(x))` and the full Y-combinator (red before
fix), while the IIFE, let-bound-fn, and data-stored-fn forms still transform
(green throughout).
