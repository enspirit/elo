# Host-object method dispatch on the `_` input (documented contract)

- **Reporter:** Atsushi Sada — https://github.com/ultra-supara
- **Source reports:**
  - `[Elo BBP] RCE in Python backend via dunder protocol dispatch across 42 stdlib functions …eml`
  - `[Elo BBP] RCE in Python backend via dunder protocols invoked by bare-builtin emit for Int(), Float(), and length() …eml`
- **Reported against:** v1.0.1 (commit d2a89a8)
- **Reporter severity:** Critical (CVSS 9.1 claimed, both)
- **Our assessment / resolution:** Documented the input contract — **no code
  change** (maintainer decision).
- **Fix commit:** `Document the data contract for the _ input`

## The issue

The backends compile expressions such as `_ + 1`, `_ == 1`, `upper(_)`,
`Int(_)`, `len(_)` to the target language's own operators and built-ins. In
Python and Ruby those dispatch to whatever methods the runtime **value**
defines. If a caller passes an arbitrary host object as `_` — an ORM row, a
`Decimal`, a class instance with operator overloads or `__add__` / `__int__` /
`__len__` — that object's code runs inside the host process.

Verified: objects with hostile `__add__`, `__eq__`, `.upper()`, `__int__`,
`__len__` all executed when passed to the matching compiled lambda.

**Correction to the report:** it claims only Python is affected and that "Ruby
validates types". That is inaccurate for arithmetic/comparison — Ruby emits bare
`_ + 1` / `_ == 1` and a hostile Ruby object's custom `+` / `==` fires too. The
class spans both Ruby and Python.

## Why documentation, not a code fix

This is a property of the host languages' operator/protocol dispatch, not
something the compiler can close without wrapping **every** operation in
`isinstance`/type guards across dozens of stdlib functions on two backends — a
real cost to generated-code quality and portability (principles Elo ranks above
raw power). The honest boundary is the input contract that the security page
already implied: **Elo operates on plain JSON-shaped data; `_` must be data, not
host objects.** Exploitation requires the integrator to hand Elo a live host
object, which is outside "you give it data".

## What was done

Strengthened `web/src/pages/security.astro` with an explicit "The data contract"
section: `_` and everything reachable from it must be strings, numbers,
booleans, null, lists, and string-keyed maps (JSON shape); arbitrary host
objects must be converted to plain data before evaluation, because operators and
built-ins will otherwise invoke the object's own methods — outside the sandbox.

## Residual note

If a future release wants to *enforce* this rather than document it, the options
are the (invasive) per-operation type guards, or a thin boundary that rejects
non-data `_` inputs at the host adapter. Tracked here for the record.
