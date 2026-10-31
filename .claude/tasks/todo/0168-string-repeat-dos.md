# String repeat `'a' * n` — unbounded allocation DoS

- **Found by:** internal security review (sibling of the fixed array-repeat
  DoS, [[0165-array-repeat-dos]]).
- **Severity:** High (availability) on Ruby and Python.
- **Status:** deferred — the fix changes observable behaviour on finite inputs,
  so it needs a maintainer decision (we were asked not to change semantics
  silently).

## The issue

`String * Number` (repeat a string) is a documented feature. It has no upper
bound on the count:

```
'a' * 1000000000       # Ruby:   "a" * 1000000000      -> ~1 GB, OOM
                       # Python: "a" * 1000000000      -> ~1 GB, OOM
                       # JS:     "a".repeat(1000000000) -> RangeError (self-limits)
```

Data-driven form `'a' * Int(_)` reads the count from input. JavaScript already
throws a `RangeError` past ~2^28; Ruby and Python allocate until the host OOMs.

This is the same class as the array-repeat DoS we closed — but array repeat was
undocumented (so we rejected it), whereas string repeat is a real feature, so it
must be **bounded**, not removed.

## Why not fixed yet

Any bound changes behaviour for large-but-finite counts (`'a' * 50_000_000`
would start throwing). That is a semantics decision:

1. **Bound to the JS ceiling** (~2^28). Makes Ruby/Python match JavaScript's
   existing limit — arguably the *most* portable choice and the least surprising
   (anything that works on all backends today keeps working). Recommended.
2. **Bound to a smaller fixed limit** (e.g. 1_000_000). Safer memory ceiling,
   but rejects some currently-valid programs and picks an arbitrary number.

## Proposed implementation

Route `String * Number` through a runtime helper on Ruby and Python (JS already
self-limits) that raises when the count exceeds the chosen bound, mirroring the
`kMul` array guard. Add red/green acceptance + unit tests. Document the limit on
the security page under the "every expression finishes" guarantee.
