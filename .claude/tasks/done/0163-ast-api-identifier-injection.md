# AST-API identifier injection in type nodes (incomplete GHSA #3 fix)

- **Reporter:** Atsushi Sada — https://github.com/ultra-supara
- **Source report:** `[Elo BBP] Incomplete fix of GHSA #3 … SubtypeConstraint.variable …eml`
- **Reported against:** v1.0.1 (commit d2a89a8)
- **Reporter severity:** Critical (CVSS 10.0 claimed)
- **Our assessment:** Real, and consistent with the threat model GHSA #3 already
  accepted ("macro or plugin systems that build AST"). **Not** reachable from
  `.elo` source — the parser only ever produces identifier-shaped fields from
  `IDENTIFIER` tokens; it requires a hand-built or tampered AST passed to
  `compileTo*`.
- **Fix commit:** `Validate identifier-shaped type-node fields at every emit site`

## The issue

GHSA #3 added `assertSafeIdentifier()` to the identifier emit sites known at the
time. The type-expression IR nodes introduced afterwards were not covered, so an
AST-API consumer could interpolate arbitrary host code into the emitted
JavaScript, Ruby and Python:

- `subtype_constraint.variable` — lands as a binding LHS. Verified: a variable of
  `x = (() => { throw new Error('PWN-JS') })(); let __` executed on instantiation
  (JS), and `_x = (puts('PWN-RUBY'); nil); _y` executed in Ruby.
- `type_schema` property `key` — interpolated into JS/Ruby code positions
  (`v.<key>`, `_r_<key>`); verified injection.
- `typedef` `name` and user-defined `type_ref` names — interpolated as
  identifiers.

## The fix

Apply the existing `assertSafeIdentifier()` helper to all four fields across the
three backends (JavaScript, Ruby, Python). Because these names always come from
`IDENTIFIER` tokens when produced by the parser, validation rejects no valid
program; it closes the gap only for hand-built or tampered ASTs — the same
defence GHSA #3 established.

## Tests

`test/unit/security.unit.test.ts` → "Security - AST-API identifier injection
(type nodes)": tamper a parsed AST's `variable` / schema `key` / typedef `name`
and assert each backend throws `Invalid …` (red before fix — code injected;
green after), plus a legitimate typed program that still compiles on all three.
