# Division by zero has no agreed answer, on any of the four targets

> Found while adding the CLI exit-code coverage of 0224: `elo -e "1 / 0"`
> prints `null` and exits 0, which is a success for an expression that has no
> value. Looking at why led here.

## Symptom

Measured, not inferred:

| | JS | Ruby | Python | SQL |
| --- | --- | --- | --- | --- |
| `1 / 0` | `Infinity` | `Infinity` | raises `ZeroDivisionError` | raises `division by zero` |
| `1.0 / 0` | `Infinity` | `Infinity` | raises `ZeroDivisionError` | raises `division by zero` |
| `1 % 0` | `NaN` | raises `ZeroDivisionError` | raises `ZeroDivisionError` | raises `division by zero` |

So `/` splits two-two and `%` splits one-three. Nothing in `test/fixtures/`
asserts any of it, which is why it is invisible: under the rule the README now
states, this behaviour is **unspecified** rather than broken. That is its honest
status — and also the reason to specify it, because an author writing
`total / count` has no way to know what happens when `count` is 0, and the
answer depends on where the formula runs.

It gets worse through the CLI, which is how it surfaced:

```
$ elo -e "1 / 0"
null
```

`Infinity` is not representable in JSON, so it serialises to `null` — an
expression with no value reports as a successful evaluation of nothing. The
same shape as the defect noted in `stdlib/list/summary/min.elo`, where a `NaN`
"serialises to null — a wrong value where a refusal or a null would be honest".

## What to decide

`/` and `%` have to agree across the four targets, and there are two coherent
answers:

1. **Raise.** Division by zero is an error, as Python and PostgreSQL already
   say, and as Ruby says for `%`. It is the answer that cannot be mistaken for
   a value, and it fits a language whose stated purpose is to avoid silent
   nulls. The cost is that JavaScript and Ruby need an explicit check in the
   emission — on the dynamic path too — which makes every division carry it.
2. **Yield null.** Elo has `null` and the alternative operator, so
   `total / count | 0` would be the idiom, and it composes with everything that
   already handles absence. The cost is that `null` then means both "no value"
   and "undefined result", and the three targets that raise need catching,
   which in SQL means `NULLIF(denominator, 0)` — cheap and idiomatic there,
   actually.

Option 2 is probably the better fit for Elo and the cheaper emission on SQL;
option 1 is the safer one. Either way `Infinity` and `NaN` should stop escaping
to a host, because neither survives JSON.

Not a decision for this task to make alone: it is the same question as 0174
(the nullable list accessors) and should be answered with it, since both are
about whether an operation that has no answer returns null or refuses.

## Tests

`reference/division-by-zero.elo` with the table above, on all four targets —
`/` and `%`, integer and float, zero on the right and a zero that only appears
at run time (a lambda parameter, so the dynamic path is covered too). Plus
`typeOf(1 / 0)` if the answer is a value, since that is where `Infinity`
currently answers `'Float'` on three targets and `'Int'` on JavaScript.

Whatever is chosen, the fixture is what makes it specified. Today there is
nothing to be red.
