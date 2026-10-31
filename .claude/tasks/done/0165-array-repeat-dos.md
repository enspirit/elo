# Array-repeat unbounded allocation DoS (`[1] * n`)

- **Reporter:** Atsushi Sada — https://github.com/ultra-supara
- **Source report:** `[Elo BBP] … denial-of-service … via unbounded array repeat …eml`
- **Reported against:** v1.0.1 (commit d2a89a8)
- **Reporter severity:** High (CVSS 7.5, availability-only)
- **Fix commit:** `Reject array multiplication instead of repeating unboundedly`

## The issue

`[1] * n` had no upper bound on the repetition count. `[1] * 1000000000` (or the
data-driven `[1] * Int(_)`) allocated ~7–8 GB and OOM-killed the Ruby/Python
host within seconds.

**Design finding (basis for the chosen fix):** array repeat is not a designed
Elo operation. It is meaningless on SQL (`ARRAY[..] * n` errors), coerces to
`NaN` on JavaScript, and only repeats on Ruby/Python — inconsistent across
backends and used by no fixture. Only `String * Number` (string repeat) is a
documented multiplication over a non-numeric operand.

The reporter proposed a magic `100_000` bound; we rejected the operation
instead, which also fixes the portability inconsistency and adds no arbitrary
threshold (maintainer decision).

## The fix

- **Compile-time (primary, all backends):** the transform rejects `*` when
  either operand's inferred type is `array`. This closes every reported vector
  (the array is always a literal) and the realistic attacker-controlled-source
  threat, on every target, in one place.
- **Runtime (defense-in-depth):** an array arriving as untyped data (`_ * n`
  where `_` is a list) cannot be typed as `array` at compile time, so the JS and
  Python `kMul` helpers — the sole `any*any` multiplication path — also refuse
  array operands at runtime, turning a would-be allocation into an immediate
  error. (Ruby's `any*any` is an inline operator with no isolated helper;
  rewriting it would churn all arithmetic output, and the compile-time check
  already covers the realistic threat, so it was left inline.)

## Tests

- `test/unit/transform.unit.test.ts` → "array multiplication is rejected
  (security)": `[1] * 3`, `[1] * Int(_)`, `3 * [1]` throw; numeric / string /
  duration multiplication still transform.
- `test/unit/security.unit.test.ts` → "array multiplication runtime guard":
  `_ * 1000000000` applied to a list throws at runtime (JS).

Red before fix, green after. Six JS fixtures embedding `kMul` were regenerated.
