# `pow(Int, Int)` is declared `Int`, and a negative exponent is not one

> Found while fixing 0189, by an assertion written for it: `round(2 ^ -1) == 1`
> fails on **all four** targets, which is how it is not 0189's bug. The
> assertion is commented out in `reference/power.elo` with a pointer here.

## The bug

`src/typedefs.ts`:

```ts
defs.register('pow', [Types.int, Types.int], Types.int);
```

`2 ^ -1` is `0.5`. The declaration says Int, so every operation downstream
picks its Int implementation — and for `round` the Int implementation is the
*identity*:

```
$ eloc -t js -e "round(2 ^ -1)"
(function(_) { return (Math.pow(2, -1)); })      # no rounding at all
```

So `round(2 ^ -1)` is `0.5` on all four targets where it should be 1. The same
would go for anything else that dispatches on Int versus Float — `floor`,
`ceil`, and SQL's `div`, which only casts to `double precision` when both
operands are declared Int.

Elo cannot know the exponent's sign statically, so the only sound declaration
is `pow(Int, Int) -> Float`. That is also what SQL already *returns*:
`POWER(2, 10)` is `double precision`.

## A second divergence in the same place

`typeOf` is a runtime check on every target, so it reports what the value is
rather than what was declared. And the value differs:

| | `typeOf(2 ^ 10)` |
|---|---|
| JavaScript, Ruby, Python | `'Int'` |
| PostgreSQL | `'Float'` |

PostgreSQL's `POWER` returns `double precision` whatever it is given, where the
other three keep `2 ** 10` an integer. Three-to-one, and nothing asserts it.

Declaring the return `Float` does **not** fix this — `typeOf` does not consult
the declaration — so it is a second decision: either every target returns a
Float from `^` (consistent, and arguably right since power is a real
operation), or SQL casts back to an integer when both operands were integers,
which `POWER(2, 10)::bigint` would do but which then lies for `2 ^ 0.5`.

Recommendation: declare the return `Float`, and make all four *return* a Float
too, so the declaration and `typeOf` agree. `9 ^ 0.5` is already `3.0`
everywhere, so the only visible change is `typeOf(2 ^ 10)` on three targets.

## Test

```
assert(round(2 ^ -1) == 1)
assert(floor(2 ^ -1) == 0)
assert(ceil(2 ^ -1) == 1)
assert(typeOf(2 ^ 10) == 'Float')
```

The first three are red on all four targets today; the fourth is red on three.
Add them to `reference/power.elo`, which already covers the value and the Ruby
Rational, and uncomment the line left there pointing here.
