# fetch() prototype-chain denylist bypass (JS runtime)

- **Reporter:** uaaw — https://github.com/uaaw
- **Source report:** `Security Vulnerability Report_ @enspirit_elo (2 issues) …eml` (Vulnerability 2)
- **Reported against:** v1.0.1
- **Reporter severity:** Low (CVSS 3.7 — CWE-863)
- **Fix commit:** `Enforce the fetch() member denylist in the JS runtime`

## The issue

The `FORBIDDEN_MEMBERS` denylist (`constructor`, `__proto__`, `prototype`, …)
was enforced at compile time **only when the `fetch()` key was a string
literal**. A non-literal key had a different AST type, so the check was skipped
and the JS runtime helper `kFetch` did a bare `current[segment]` — a property
read that walks the prototype chain.

Verified on current `HEAD`, each returning a host value instead of `null`:

- `let k = '__proto__' in fetch(_, k)` → `Object.prototype`
- `fetch(_, ['__proto__'])` → `Object.prototype`
- `fetch(_, '__pro' + 'to__')` → `Object.prototype`
- `fetch(_, ['__proto__', 'constructor'])` → the live `Object` constructor

No code execution is reachable (the `typeof current === 'object'` guard blocks
descending through functions), hence Low — but it leaks host internals, breaking
the "no host access" sandbox claim.

**Scope:** JavaScript only. The Ruby (`Hash#[]`) and Python (`dict.get`)
runtimes read real keys only and return `nil`/`None` — verified.

## The fix

Guard `kFetch` itself: a string segment that names a meta-property is treated as
absent (returns `null`), independent of how the key was supplied. Legitimate
data keys and numeric indices are unaffected. (Implementation note: the
denylist is an array checked with `indexOf`, not an object literal — a
`{ __proto__: … }` literal would set the prototype instead of a key. The helper
is emitted single-line, so it uses a `/* */` block comment, never `//`.)

## Tests

`test/unit/security.unit.test.ts` → "Security - fetch() prototype-chain bypass
(JS runtime)": each vector asserts `null` at runtime via `compile()` (red before
fix — returned `{}`/the `Object` constructor; green after), plus legitimate data
reads. Fixture `test/fixtures/reference/datapath.expected.js` was regenerated.
