# patch() member denylist gap (JS runtime)

- **Found by:** internal security review following the disclosed reports (same
  class as [[0164-fetch-prototype-bypass]]).
- **Severity:** Low — a denylist-consistency gap, not an exploit.
- **Fix commit:** `Enforce the member denylist in patch() at runtime`

## The issue

`patch()` is the write-side counterpart of `fetch()`. Unlike `fetch()` it had
**no** compile-time denylist check at all — the transform guard keys on
`name === 'fetch'` — so even a literal `patch(_, ['__proto__'], 1)` reached the
JS `kPatch` helper, which did a bare `obj[seg] = …` for any key. Forbidden
meta-property names (`__proto__`, `constructor`, `prototype`, …) could therefore
land in the write path via any key form (array literal, variable,
concatenation).

**Not exploitable for prototype pollution:** `kPatch` always builds a fresh
copy at each level (`{...data}`) and turns non-objects into `{}`, so it never
writes into a live host object — verified that `Object.prototype` stays clean.
The impact is limited to attacker-chosen meta-property keys appearing in the
returned data, and to inconsistency with the `fetch()` guard.

## The fix

Guard `kPatch` (JS) the same way `kFetch` is guarded: a string segment naming a
forbidden member is rejected with a clear error, independent of how the key was
supplied. Numeric indices and ordinary keys are unaffected. Ruby (`Hash`) and
Python (`dict`) writes only create ordinary keys and cannot reach a prototype,
so — as with `fetch()` — the guard is JavaScript-specific.

## Tests

`test/unit/security.unit.test.ts` → "Security - patch() member denylist (JS
runtime)": array-literal / variable / concatenated forbidden segments throw
`forbidden` (red before fix — they silently wrote the key; green after), plus
legitimate key/index patches that still work. Fixture
`test/fixtures/stdlib/data/patch.expected.js` was regenerated.
