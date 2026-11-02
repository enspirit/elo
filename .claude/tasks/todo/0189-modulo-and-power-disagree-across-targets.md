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
