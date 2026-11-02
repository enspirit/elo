# The pipe guard is not an expression

## Symptom

`guard(x | cond)` builds a lambda, but it may only be written at two positions:
the top of an expression, and the right of a `|>`.

```elo
guard(y | y > 0)                    # parses
5 |> guard(y | y > 0)               # parses
let g = guard(y | y > 0) in g(5)    # Expected IN but got EOF
guard(y | y > 0)(5)                 # Unexpected LPAREN after the end of the expression
1 + guard(y | y > 0)(5)             # Expected IN but got EOF
if true then guard(y|y>0)(5) else 0 # Expected ELSE but got LPAREN
```

`fn( y ~> … )` works at all six. So does every other value in the language.

## Why it is like that

`expr` resolves the two guard forms (`src/parser.ts`, `guardOrCheck`), and
`primary` only ever reads the block form. An expression that reaches `guard`
through `primary` — a `let` binding value, an operand, an `if` branch —
therefore gets the block form and fails on the `(`.

The second half: a form resolved in `expr` is returned from `expr`, which is
above `postfix`, so nothing can apply or read a member off it. That is why
`guard(y | y > 0)(5)` fails even at the top, where the form *is* admitted.

0211 removed the backtracking that used to decide between the two forms and
left this alone deliberately: `primary` calling `guardOrCheck` is a one-line
change that accepts programs which are parse errors today, and accepting more
is a change to the language, not to its parser.

## What it should be

Probably: the pipe form is a value like any other, written wherever an
expression is, and applied like any other lambda.

The change is small — `primary` resolves both forms, and `expr` stops
special-casing `guard`/`check` so that the result flows through `postfix`. The
question is whether it should happen at all, which is a language question:

- **For.** One form means one thing everywhere. Six positions out of eight
  currently fail for no reason an author can see, and the error messages
  (`Expected IN but got EOF`) do not hint at the real rule.
- **Against.** `guard(x | cond)` exists for the `|>` chain, which is where it
  reads well. Elsewhere `fn( x ~> guard cond in x )` says the same thing and is
  the form the language already has. Admitting the sugar everywhere adds a
  second spelling of a lambda without adding any power — and Elo's order is
  simple before well designed.

There is a middle answer worth considering: admit it everywhere an expression
is (fixing `primary`) but leave it unapplicable directly, since `guard(…)(5)`
is not idiomatic in any case.

## If done

Needs documentation — it changes what the language accepts. README, and the
Learn/Reference pages that introduce `guard`. Plus acceptance assertions for
the positions newly admitted, and `parser.unit.test.ts` cases for the ones
still refused, so the rule is written down either way.

## Relation to other tasks

- **0211** unified the mechanism and pinned the current grammar with tests,
  including the genuinely ambiguous `guard (a | b)`. It is the task that made
  this one a one-line change rather than a rewrite.
