# A table for the bounded primitives

> "continue"

H6a and H6b from `0244`. The grammar gates cannot see this class at all:
`v0 * v1` on two numbers and `v0 * v1` on a string are the same syntax, and
only the operand types tell them apart.

## The one sentence

Every allocation bug Elo has had is the same sentence: **the helper exists and
some path did not call it.**

| release | bug |
|---|---|
| 1.1.0 | `[1] * n` repeated an array unbounded on Ruby and Python |
| 1.2.3 | `padStart`/`padEnd` bounded on three targets, bare `LPAD` on SQL |
| 1.2.3 | `patch` grew an array one element per step with no cap |
| 1.2.4 | `s * n` bounded on the typed path, unbounded `String#*` on the dynamic one |
| 1.2.4 | `a ^ b` built an exact bignum on Ruby and Python |
| 1.2.4 | `x % n` on a String ran `sprintf` |

Never "the helper was wrong". Always a cell of (operation × operand types ×
target) that nobody had enumerated.

## H6a — the table

`test/unit/bounded-primitives.unit.test.ts`. For every signature of every
bounded operation that any target registers, the emission must either **name
the bounded helper** or be classified as native with a reason. 91 signatures
across four targets: 47 helper-routed, 44 native. Complete in both directions,
so a signature nobody has decided about fails, and a stale classification
fails too.

Two details worth keeping:

**The stub arguments are variables, not literals.** An emitter may legitimately
special-case a compile-time literal — JavaScript's `at` emits a bare bracket
read for an integer literal index, safe because a literal cannot name a
meta-property — so passing literals would have let the 1.2.4 typed-`at()`
escape sail through. The question is what happens to a value that arrives at
runtime.

**The 44 native classifications share six reasons**, stated once each: native
numeric arithmetic, duration scaling, literal replacement (the 1.2.3 fix bounds
the output at input × 1 without a cap), an inline guard, and three SQL ones —
no object model to walk, `POWER` answers a double rather than a bignum, and no
lambdas means an `any` operand can only be an untyped column.

The inline-guard group is the finding. Ruby's `at` and Python's dynamic `at`
check the index *in the emitted expression* rather than in a helper. They are
bounded — but a change to `kAt` does not cover them, which is not obvious from
anywhere else.

## H6b — the bounds bite

`security/bounded-primitives/bounded-primitives.elo`. H6a checks a helper is
*called*; it cannot check the helper then refuses a large input rather than
merely being on the call stack.

Most of that coverage existed already (`repeat-bound`, `pad-bound`,
`arith-string-op-bounds`). Two cells it did not reach:

- **the array index a `patch` grows to** — bounded in 1.2.3, with the changelog
  quoting a 200k index going from minutes to milliseconds, and no acceptance
  assertion that the cap refuses a larger one;
- **padding on the dynamic path** — bounded only where the length is a literal
  the checker can see.

Plus the `at()` guard answering null for an index that is not an integer at
all, which only the dynamic path can produce.

**Seen red.** All nine passed first try, and a bound nobody has watched refuse
something is a bound nobody knows works — so: rebuilt with
`ELO_MAX_STRING_LENGTH=10000002`, just above the value the fixture uses, and
the two padding assertions fail with "Expected error but none thrown".

SQL has no lambdas, so `assertFails` cannot be written there. Its bounds live
in the prelude, checked for existence by `sql-prelude-consistency` and for
being called by H6a. That asymmetry is why the fixture has no `.expected.sql`.

## State

Unit 2074, integration 4223. Acceptance: Ruby 132, JavaScript 130, SQL 94,
Python 132; dynamic axis 123/123/123. The two JavaScript `startOf` timezone
failures fail identically on `main`.

## What is left in 0244, and a caveat about it

§1.3 is now covered. What remains is H3 (hostile values), H4 (hostile shapes),
H8b (keep the helper region audited), H0-inside-`compile()`, H5 (lying inputs)
and the SQL gate.

Worth recording honestly: H3 and H4 are the two items needing a corpus somebody
invents, and they are the two that have found nothing — because they are
unbuilt. Everything that found a bug across 0245–0250 worked by enumerating
something the repository already contained: the grammar the emitters produce,
the signatures the bindings register, the fixtures that already exist, the
writes the helpers already perform. That is not an argument against H3 and H4,
but it is a reason to expect less from them per hour, and to do H8b — a list of
52 helpers to pin — before either.
