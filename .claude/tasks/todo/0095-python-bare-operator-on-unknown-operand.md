# Python emits a bare operator when one operand type is unknown

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
