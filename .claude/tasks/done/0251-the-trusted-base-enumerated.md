# The trusted base, enumerated

> "keep working."

H8b from `0244`, and the last of the items with a bug record behind it.

All three emitted-grammar gates exempt the prelude helpers. They have to:
helpers are *where* a guarded bracket read and an `Object.defineProperty` write
are supposed to live, so they cannot obey the rule the rest of the emission
does. The coverage audit in 0246 put a number on that exemption — **six of the
thirty security issues fixed since 1.0 are inside a helper** — which made it
the harness's largest blind spot rather than a footnote.

0246 audited it by hand, in one query, and found the `pSchema` bug. H8b is that
query, pinned, so it does not depend on anyone remembering to repeat it.

## What it asserts

`test/unit/helper-region.unit.test.ts`. Of 53 JavaScript helpers, **12 index by
a computed key**. Each must be classified with what stops that key being
`__proto__`, and — this is the part that makes it more than a list — the claim
is checked against the source:

| claim | checked by |
|---|---|
| `numeric` | the grammar gate's own `isStaticallyNumericIndex`, plus a loop-counter check |
| `ownKeys` | the helper really calls `Object.keys` |
| `guard: defineProperty` / `proto-check` / `hasOwnProperty` / `type-check` | the mechanism really appears in the source |

Plus one invariant over the whole region regardless of classification: **a
computed write with a runtime key must use `defineProperty` or check for
`__proto__`.** That is the `kDeepMerge` bug and the `pSchema` bug, stated once.

Complete in both directions, so a new helper that starts indexing by a runtime
key fails until somebody says why it is safe.

Reusing `isStaticallyNumericIndex` from the grammar gate is deliberate:
"numeric by construction" then means the same thing inside a helper as outside
one, rather than being argued twice.

## Seen red, three ways

| revert | result |
|---|---|
| the `kDeepMerge` guard (1.2.4) | 2 failures — the `defineProperty` claim and the write invariant |
| the `pSchema` fix (1.2.4) | 1 failure — the write invariant |
| add a `kFake` helper doing `o[k]` | 1 failure — unclassified |

The middle one is the result that matters: **H8b would have found the `pSchema`
bug without the hand audit.** 0246 found it because I happened to run the right
query; this makes the query part of the build.

## Why JavaScript only

The class does not exist on the other targets, and that is worth stating rather
than leaving as an omission. A Ruby `Hash#[]` and a Python `dict[k]` are plain
key reads with no prototype chain behind them, so a computed key has no
meta-property to reach. Python's analogous risk is the dunder *attribute*,
which `gate-python.py` already closes with a list of 34. SQL has no object
model.

## Four copies of one invariant

Worth recording as open work: `kFetchObject`, `kPatch`, `kDeepMerge` and `pSet`
each carry their own copy of "keep `__proto__` a data key". `pSet` exists to
make it safe once, and the other three predate it. One invariant, four sites,
is the exact shape 0243 named as the cause of this whole class — so
consolidating them onto `pSet` is the structural fix, and the test now at least
makes the duplication visible.

## State

Unit 2101, integration 4223, acceptance green on four targets plus the optimize
and dynamic axes. CLAUDE.md's security section now points at the four
machine-checked lists rather than asking for a hand audit.

## What is left in 0244

Everything with a bug record behind it is done. What remains is the speculative
half: H3 (hostile values), H4 (hostile shapes), H0-inside-`compile()`, H5
(lying inputs), the SQL gate, and the branded `Code` type.

H4 is the one I would do next of those, because it has four reported DoS issues
behind it (the parser depth guards, the type-expression bypass, the Y-combinator,
the `in` backtracking) and the generators are one function each. H3 is the most
expensive and the least evidenced: the grammar gates now cover the sink side of
§1.1 structurally, so a hostile-value corpus would mostly be re-testing what a
closed allowlist already refuses.
