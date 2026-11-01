# Python emits a bare operator when one operand type is unknown

**DONE** — fixed by registering the dynamic operator signatures explicitly.

Found while wiring `Duration` in as a schema type (0093). Pre-existing on
`main`, independent of that work:

```
$ eloc -t python -e "_ + P1D"
(lambda _: _ + EloDuration.from_iso("P1D"))
```

`EloDuration` defines named methods (`plus`, `minus`, `scale`, `divide`), not
Python's operator dunders, so that code raises at runtime:

```
TypeError: unsupported operand type(s) for +: 'EloDuration' and 'EloDuration'
```

With both operand types known it is correct — `P1D + P1D` emits
`kAdd(...)`, and `kAdd` dispatches properly.

## Cause

`StdLib.lookup` (`src/stdlib.ts`) tries progressively more general signatures,
and when that fails *and* an argument is `any`, falls back to **the first
registered implementation with a matching name and arity**. For
`add(any, duration)`:

- generalizations are `[any, duration]` and `[any, any]` — Python registers
  neither;
- so the arity fallback runs and returns `add(int, int)`, which is
  `simpleBinaryOp('+')`.

Registration order decides the semantics. This is the hazard noted as §1.4 of
`done/0091-type-checking.md` ("a latent correctness hazard in `any` dispatch"),
here producing genuinely broken output rather than a merely arbitrary choice.

JavaScript and Ruby are unaffected because they register `add(any, any)`
explicitly, so generalization finds it before the fallback is reached. Python
relies on its `registerFallback` operator handler instead, which the arity
fallback pre-empts.

## Fix

Register the dynamic operator signatures explicitly in
`src/bindings/python.ts`, as Ruby and SQL do:

```ts
for (const op of ['add','sub','mul','div','mod','pow'])
  pyLib.register(op, [Types.any, Types.any], helperCall(`k${...}`));
```

That makes generalization find them before the arity fallback, and should also
let the 15 `python` entries in `NOT_EMITTABLE`
(`test/unit/registry-consistency.unit.test.ts`) be deleted — they exist because
those temporal signatures resolve only through the fallback today.

Check the other operators at the same time: `neg`, `eq`, `neq` and the
comparisons have the same shape in the Python binding.

## Wider question

Worth deciding separately whether `StdLib.lookup`'s arity fallback should exist
at all. It silently picks an implementation by registration order whenever a
type is unknown, which is how this bug is possible. Rejecting instead would
surface these at compile time — but it would need every target to declare its
dynamic signatures, which is the change above applied everywhere.

## Test

`test/fixtures/reference/type-definitions.elo` had

```
assert((let T = { d: Duration } in { d: 'P1D' } |> T).d + P1D == P2D)
```

which fails on Python for this reason. It was replaced with an `inHours` check
that does not do arithmetic on an `any`-typed duration. Restore it once fixed.


## What was done

The `registerFallback` handler in `src/bindings/python.ts` became explicit
`[Any, Any]` registrations, which is what every other target already did —
Python was the only one with a fallback. Generalization now finds them before
the arity fallback is reached, so the fallback no longer answers for operators.

A second wrong emission turned up on the way. `eq(Any, …)` also went through the
arity fallback and picked `eq(Int, Int)`, a bare `==`. `EloDuration` defines no
`__eq__`, so two equal durations compared `False`:

    >>> EloDuration(86400000) == EloDuration(86400000)
    False

`_ == P1D` now emits `kEq`, which compares properly.

The 16 `python` entries in `NOT_EMITTABLE`
(`test/unit/registry-consistency.unit.test.ts`) are gone — Python can now emit
every signature the type table declares, with no exceptions. The fixture line
that had to be dropped is restored.

Cost: Python output grows 1.6% across the fixture corpus (79 528 → 80 787
characters), confined to the dynamic paths. Where types are known the emission
is unchanged — `1 + 2` is still `1 + 2`.

## The wider question

Assessed and answered in `todo/0096`: the arity fallback should **not** be
removed. It resolves 13–22 calls per target over the fixture corpus and the
large majority have exactly one candidate, where picking it is correct and
necessary. Only 22 sites across all four targets emit different code depending
on the choice, and those are better fixed one by one than by changing the
mechanism — which would either break working programs or require ~22
registrations including SQL dispatch that cannot be written as a pure
expression. Two of those sites are wrong today (`floor(_)` and `length(_)` on
SQL) and are recorded there with the measurements.


## Addendum: the test came after the fix, and that cost a bug

The fix was committed with its `.elo` coverage limited to one restored
assertion, exercising `+` through a schema. The `eq` bug found while fixing it
had no assertion at all — it was verified by hand and then trusted.

Writing the fixture properly afterwards, with assertions over each dynamic
temporal operation, immediately found a **third** instance of the same defect
in Ruby: `datetime - datetime` on operands of unknown type emitted a bare `-`,
which in Ruby yields a Rational number of days rather than a duration, so it
disagreed with the typed path:

    typed:   D2024-01-16T00:00:00Z - D2024-01-15T00:00:00Z  ->  86400 seconds
    dynamic: (fn(x, y ~> x - y))(…)                          ->  (1/1)

Fixed with a `k_sub` dispatcher, matching what JavaScript and Python already
do. Ruby had no typed numeric subtraction at all — it relied on the `Any`
signature for every case — so the numeric registrations were added alongside,
keeping `5 - 3` a bare `-` and confining the helper to genuinely unknown types.

`test/fixtures/reference/dynamic-temporal-dispatch.elo` now covers the path:
8 of its 20 assertions fail on Python and 1 on Ruby without the respective
fixes. Every assertion is paired with a typed twin, so a future divergence
between the typed and dynamic emission shows up as one failing and the other
passing.
