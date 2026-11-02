# `%` and `^` do not mean the same thing on all four targets

> Measured while fixing 0188, which flagged them as "the same family: the
> operator exists on both sides but does not mean the same thing". Division was
> a bug with one right answer; these two need a **language decision** first.

## `%` on a negative operand: two camps

Measured directly in each runtime, not inferred:

| | `-7 % 3` | `7 % -3` | convention |
|---|---|---|---|
| PostgreSQL | `-1` | `1` | truncated — sign of the dividend |
| JavaScript | `-1` | `1` | truncated |
| Ruby | `2` | `-2` | floored — sign of the divisor |
| Python | `2` | `-2` | floored |

So a two-two split, and **nothing in the corpus covers it**: every `%`
assertion uses non-negative operands.

Elo has to pick one and make the other two targets follow. Which one is a real
design question:

- **Floored** (Ruby/Python) is what `%` means in most expression languages
  aimed at non-programmers, and it keeps `x % n` in `[0, n)` for positive `n`,
  which is what someone writing `day % 7` expects.
- **Truncated** (SQL/JavaScript) is what C and most databases do, and it is
  free on the two targets where expressions are most likely to be pushed down.

Whichever is chosen, the other two need a helper — `kMod` already exists on
JavaScript and Python for the dynamic path, so the typed registrations would
route to it as `sub` and `div` already do. On SQL, floored would be
`((a % b) + b) % b`, which evaluates `b` twice.

## `^` with a negative exponent: Ruby answers a Rational

```
2 ^ -1   ->  0.5    on JavaScript, Python and PostgreSQL
         ->  (1/2)  on Ruby
```

`2 ** -1` in Ruby is `Rational(1, 2)`, not a Float. It compares equal to `0.5`,
so an assertion would not catch it, but `typeOf` and anything that formats the
value would differ — and a Rational flowing into the rest of an expression is
the same class of surprise as the Rational that `Date - Date` produced (fixed
in 0175). `to_f` on the result, or `fdiv`-style handling of a negative
exponent, is the likely fix.

Also unasserted: `9 ^ 0.5` is `3.0` everywhere, which is fine, and `POWER`
returns `double precision` on PostgreSQL, which `round` already compensates for
with a `::numeric` cast — the existing comment in `src/bindings/sql.ts` is the
precedent for caring.

## What to do

1. Decide floored or truncated for `%`, and write it down in README and the
   website Reference next to the operator — a `%` whose meaning depends on the
   target is not portable, which is the one thing Elo promises.
2. Add `reference/modulo.elo` asserting both signs on all four targets, and see
   it red on two of them whichever way the decision goes.
3. Fix `^` with a negative exponent on Ruby, with its own assertion covering
   `typeOf(2 ^ -1)` as well as the value.

## Decision

- % Floored
- force .to_f in Ruby

## Addendum: what was done

### `%` is floored, on all four targets

Red first with `reference/modulo.elo`, 21 assertions over both signs of both
operands, floats, the cycle case `%` exists for, and composition: **12 red of
21 on JavaScript and the same 12 on SQL**, 0 on Ruby and Python, which already
floor. The split the task measured, confirmed by the fixture.

- **JavaScript** routes every `%` through `kMod`, now
  `((l % r) + r) % r`. The helper rather than an inline correction so each
  operand is evaluated once, and for the typed registrations too, not just the
  dynamic one — the precedent is `round`, which goes through `kRound` for
  exactly this reason: when the native operator disagrees with Elo, the helper
  *is* the emission.
- **PostgreSQL** gets the correction inline — `((a % b) + b) % b` — because a
  pure expression has nowhere to define a helper. That evaluates the divisor
  twice, which is the price; `last` already pays it for `CARDINALITY`.
- Verified across every sign combination before writing it: `(-7, 3) -> 2`,
  `(7, -3) -> -2`, `(-7, -3) -> -1`, `(7, 3) -> 1`, and the float cases.

### `^` never yields a Rational on Ruby

`2 ** -1` in Ruby is `Rational(1, 2)`. It compares equal to `0.5`, so the value
assertions passed; `typeOf(2 ^ -1)` answered **'Tuple'**, the dispatcher having
no case for a Rational and falling through to its last one.

`k_pow` forces `.to_f` **where Ruby would hand back a Rational**, and leaves
every other result alone:

```ruby
def k_pow(l, r)
  v = l ** r
  v.is_a?(Rational) ? v.to_f : v
end
```

Read that way rather than as an unconditional `.to_f` on `**`, because
unconditional would turn `2 ^ 10` into `1024.0` and move `typeOf(2 ^ 10)` from
`'Int'` to `'Float'` **on Ruby alone** — breaking the agreement it currently
has with JavaScript and Python, which is a portability regression rather than a
fix. The helper covers the dynamic case too, where the exponent's sign is not
known until runtime. `reference/power.elo` was 3 red of 14 on Ruby, 0 on the
other three.

### Documented

README under the arithmetic operators, and the website's Reference page under
Arithmetic — both now state that `/` is real and `%` is floored *on every
target*, with the sign rule spelled out and the reason given (`x % n` stays in
`[0, n)`, which is what `day % 7` is written for). 0188's division decision is
written down in the same place, since an author meets the two together.

### Found by this task's own fixture, filed as 0190

`round(2 ^ -1)` is `0.5` on **all four** targets: the type table declares
`pow(Int, Int) -> Int`, so `round` picks its Int implementation, which is the
identity. That is the type table rather than the emitters, and it comes with a
second divergence — `typeOf(2 ^ 10)` is `'Int'` on three targets and `'Float'`
on PostgreSQL, because `POWER` always returns `double precision`. The
assertion is left commented in `reference/power.elo` pointing at 0190.
