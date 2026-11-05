# A leading zero is a base on Ruby, and '12abc' is a number on JavaScript

> Found while building the formula catalogue of 226. Every identifier formula —
> a VAT number, a national register number, a postal code — parses a
> zero-padded numeric string, and that is the one string `Int()` disagreed
> about.

## Symptom

```elo
Int('08')
```

| Target | What happens today |
| --- | --- |
| JavaScript | `8` |
| Python | `8` |
| PostgreSQL | `8` |
| **Ruby** | **raises** `invalid value for Integer(): "08"` |

And `Int('010')` is `10` on three targets and **`8`** on Ruby, which is worse:
nothing raises, the formula just answers a different number.

The opposite lean, found by the same fixture:

```elo
Int('12abc')
```

| Target | What happens today |
| --- | --- |
| Ruby, Python, PostgreSQL | refused |
| **JavaScript** | **`12`** |

Same for `Int('1.5')` → `1` and `Float('2.5abc')` → `2.5`. The website already
says type selectors "throw on invalid input", so JavaScript was the one target
disagreeing with the documentation, not a second reading of it.

And on the dynamic path (a lambda parameter, so `any`):

```elo
let f = fn( s ~> Int(s) ) in f(3.7)
```

| Target | What happens today |
| --- | --- |
| Ruby, Python, PostgreSQL | `3` |
| **JavaScript** | **raises** `.: expected Int, got number` |

while the typed `Int(3.7)` is `3` on all four. A target's dynamic dispatch
answering something its own typed emission does not is the bug class
`dynamic-*` fixtures exist for.

## Why

Three separate causes, one per symptom:

- `src/bindings/ruby.ts` emitted `Integer(s)`, and `Kernel#Integer` reads a
  leading `0` as an octal prefix — base 10 was never asked for.
- `src/runtime.ts`'s JavaScript `pInt`/`pFloat` parsed with `parseInt` /
  `parseFloat`, which stop at the first character they do not understand
  instead of refusing the string. This is the **schema** parser as well, so
  `{"age": "30 years"} |> { age: Int }` silently validated to `30` on
  JavaScript and failed on Ruby and Python.
- `Int([any])` on JavaScript was registered as that same schema parser, which
  is right to refuse a Float where `Int` is *declared* (all three targets do)
  but wrong for the `Int()` *selector*, whose whole job is to convert one.

## Fix

- Ruby: `Integer(s, 10)`, in both the `String` and the `any` registration.
- JavaScript `pInt`: accept `/^[+-]?\d+$/` after trimming, nothing else.
  `pFloat`: `/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/`, which is what the
  other three accept — including `'.5'` and `'1.'`, which Ruby, Python and
  PostgreSQL all read, so they are pinned by an assertion rather than refused.
- A new `kInt` runtime helper for `Int([any])`: truncate a number, send
  anything else through `pInt`. The two dead `kInt`/`kFloat` helpers that
  returned `null` on bad input — nothing required them, and returning null is
  not what Elo does with a value it refuses — are gone.

## Tests

Red first, per target:

- `test/fixtures/reference/type-selectors.elo` — the typed path. **Ruby 5
  failing lines** (`'08'`, `'09'`, `'010'`, `'-08'`, `'01234567'`), **JavaScript
  3** (`Int('12abc')`, `Int('1.5')`, `Float('2.5abc')`), Python and SQL green.
  `Int('007')` passed on Ruby before the fix — octal 007 is 7 — which is how
  this hides.
- `test/fixtures/reference/dynamic-selector-dispatch.elo`, new — every selector
  applied to a lambda parameter, the path no fixture covered. **Ruby 3 failing
  lines**, **JavaScript 1** (`Int(3.7)`), Python green. No SQL expectation: the
  file needs a lambda to reach the dynamic path.

## Blast radius

17 expected files regenerated, all of it the two helper bodies and
`Integer(s, 10)`. Nothing else in the corpus changed behaviour.

Unspecified before and after, deliberately left alone: `Int('0x10')` is `16` on
Ruby and PostgreSQL and refused on Python (and now on Ruby, since base 10 is
explicit), `Int('1_000')` is `1000` on Ruby and Python, `Int(true)` is `1` on
Python and refused elsewhere. No fixture asserts any of them.
