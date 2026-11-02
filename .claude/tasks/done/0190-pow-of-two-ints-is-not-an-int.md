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

## Decision

- change signature to pow(Int, Int) -> Float

## Addendum: what was done

`pow(Int, Int)` is declared `Float`, as decided. Red first by adding the
assertions to `reference/power.elo`: **4 red on JavaScript, Ruby and SQL, 2 on
Python** (whose `floor` and `ceil` emit `math.floor`/`math.ceil` for Int as
well as Float, so they were already right).

### The declaration was not enough on its own

Declaring Float made `round`, `floor` and `ceil` pick their Float
implementations and the four red assertions went green — and turned two of the
*new* ones red on Ruby:

```
2 ^ 3 / 16 == 0.5     ->  k_pow(2, 3) / 16   ->  8 / 16  ->  0
```

Because `2 ** 3` is an Integer at run time on Ruby whatever the type table
says, and `div(Float, Int)` emitted a bare `/`, which truncates. **A declared
type is a static approximation; the emission has to be right for every value
that can reach it.** So Ruby's numeric division now goes through `fdiv` for all
four Int/Float combinations rather than only Int/Int — `fdiv` is real division
whatever the operands turn out to be, which is exactly what the declaration
promises. The unknown-type case still goes to `k_div`, so `Duration / Integer`
keeps the overloaded operator.

Those three division assertions are in the fixture on purpose: they are what
catches a declared Float that is secretly an integer, and only Ruby ever had
that problem.

On SQL the change made the emission *smaller*: `div(Float, Int)` needs no
`::double precision` cast, so `ROUND((POWER(5, 1)::double precision / 2)::numeric)`
is now `ROUND((POWER(5, 1) / 2)::numeric)`.

### The second divergence is not fixable, and is now documented instead

`typeOf(2 ^ 10)` is still `'Int'` on JavaScript, Ruby and Python and `'Float'`
on PostgreSQL. The recommendation above — make all four *return* a Float so
`typeOf` agrees with the declaration — turns out to be unachievable, and
measuring it showed why:

```
typeOf(2.0)   ->  'Int'    on JavaScript
              ->  'Float'  on Ruby, Python, PostgreSQL
```

JavaScript has a single number type and cannot tell `2.0` from `2`, so a
whole-valued Float reports as `'Int'` there no matter where it came from. This
is a **general property of the language on that target**, not something about
`^`, and `typeOf` is a runtime check rather than a reading of the declaration.
Forcing Ruby and Python to return a Float from `^` would only move the
disagreement around, not remove it.

So it is written down rather than filed: README and the website's Reference
page now say that `typeOf` inspects the value, that a whole-valued Float is the
one case where it is target-dependent, and that `^` yields a Float. No task
left over.
