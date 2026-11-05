# An if expression is not an operand on three targets out of four

> Found while building the formula catalogue of 226, by the first formula that
> added something to a conditional: `acc + (if isLetter(c) then … else c)`,
> inside the IBAN checksum. Ruby raised, so it was visible there; JavaScript and
> Python answered a number, the wrong one.

## Symptom

```elo
1 + (if false then 10 else 20)
```

| Target | Emitted | Answer |
| --- | --- | --- |
| JavaScript | `1 + (false) ? (10) : (20)` | `20` |
| Ruby | `1 + (false) ? (10) : (20)` | raises `TypeError` |
| Python | `1 + (10) if (False) else (20)` | `20` |
| PostgreSQL | `1 + CASE WHEN FALSE THEN 10 ELSE 20 END` | **21** |

The answer is 21. A conditional operator binds looser than almost everything,
so an unwrapped one lets the operator around it swallow the condition:
`1 + (false) ? …` groups as `(1 + false) ? …`. PostgreSQL is right because
`CASE … END` closes itself.

It is not about `+`. `2 * (if …)`, `10 - (if …)`, `12 / (if …)`,
`-(if …)`, `!(if …)` and `'a' + (if …)` were all wrong, on all three targets,
whether or not the operand types were known.

## Why no fixture caught it

Every assertion in `if-expressions.elo` reads
`assert((if c then a else b) == x)`, and that is the one shape the bug spares
— by accident, twice over. `(c) ? (a) : (b) == x` groups as
`c ? a : (b == x)`, so when the condition is true the assertion receives `a`
rather than a boolean, and `a` is truthy; when it is false it receives
`b == x`, which is the right comparison. Nine assertions, all passing, none of
them testing what they read as.

That is the lesson worth keeping from this one: an assertion whose *failure*
mode is "returns a truthy non-boolean" is not an assertion. `assert` taking
anything truthy is what let it through.

## Fix

One parenthesis pair, in `src/compilers/{javascript,ruby,python}.ts`:
`ifExpr` emits `((cond) ? (then) : (else))` — self-delimiting, which is what
the SQL emission already was.

## Tests

- `test/fixtures/reference/if-expressions.elo` — 15 assertions where the
  conditional is an operand, on both sides of the operator, under unary
  operators, nested in each other, and as a function argument. Red first:
  **Ruby 7 lines, Python 7, JavaScript 2** — and the rest of them passed only
  because of the accident above, which is why the new lines avoid the
  `(if …) == x` shape. PostgreSQL green throughout.
- `test/fixtures/reference/precedence-dynamic.elo` — the same five shapes with
  operand types the compiler cannot know, which is the file this bug's family
  already lives in. Red first: **Ruby 4 lines**, JavaScript and Python green
  there, since an unknown type routes through `kAdd(…)` and a call's own
  parentheses hide the defect.

## Blast radius

Three fixtures beyond the two above: `guard-expressions`, `lambda` and the two
new groups — every recorded conditional gains its parentheses, nothing else
moves.
