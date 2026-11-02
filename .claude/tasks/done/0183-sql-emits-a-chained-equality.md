# SQL emits `1 = 1 = TRUE` for `(1 == 1) == true`

> One of five emission bugs uncovered when 0178 stopped the SQL acceptance
> runner from passing on psql errors.

## The bug

```
$ eloc -t sql -e "(1 == 1) == true"
1 = 1 = TRUE

$ psql -c "SELECT 1 = 1 = TRUE;"
ERROR:  syntax error at or near "="
```

PostgreSQL's `=` is non-associative, so a chain of them does not parse at all.
The emitter drops the parentheses the source had, because `emitWithParens` only
adds them for operators it knows to be precedence-sensitive, and an equality
nested inside an equality is not one of those cases.

The other three targets parse the chain — JavaScript's and Python's `==` are
left-associative and Ruby's too — so they produce a value rather than an
error. Whether that value is *right* is a second question: `1 == 1 == true` in
JavaScript is `true`, but `1 == 2 == false` is also `true`, which is not what
the parenthesised Elo expression means. Worth an assertion on every target
while fixing, not just on SQL.

## Quarantined fixture

Listed under `0183` in `KNOWN_INVALID` in `test/acceptance/test-sql.sh`:
`reference/equality` (line 10, `assert((1 == 1) == true)`).

## What to do

Make the SQL emitter parenthesise a comparison whose operand is itself a
comparison. Check the whole family — `=`, `<>`, `<`, `>`, `<=`, `>=` are all
non-associative in PostgreSQL — and `IS NULL`/`BETWEEN` alongside, rather than
special-casing `=`. Assert a nested comparison per operator, on all four
targets, and confirm the three dynamic ones agree with SQL rather than merely
compiling.

## Addendum: what was done

The task's instinct to assert this on every target rather than only on SQL was
right, and it found a second bug: **Python was silently wrong.**

```
assert((1 < 2) == true)
  sql     1 < 2 = TRUE        -> ERROR: syntax error at or near "="
  python  1 < 2 == True       -> False
  js      1 < 2 == true       -> true
  ruby    1 < 2 == true       -> true
```

Python *chains* comparisons: `1 < 2 == True` means `1 < 2 and 2 == True`, which
is False. No error, just the wrong answer. JavaScript and Ruby happen to be
right, because `==` is left-associative there and binds looser than the
ordering operators, which is what Elo means.

`reference/nested-comparison.elo` is the assertion, 18 lines over both operand
positions, both operands at once, nested one deeper, and over Int, String, Date
and `isNull`. Red before the fix: **18 of 18 on SQL, 9 of 18 on Python**, 0 on
JavaScript and Ruby.

The two fixes are the same shape and both sit in `needsParens`. A comparison
inside a comparison is parenthesised regardless of the precedence table:

- PostgreSQL's comparison operators are non-associative, so `1 = 1 = TRUE` is a
  syntax error on either side — and so is `1 < 2 = TRUE`, even though `<` binds
  tighter, which is why a precedence comparison could not catch it.
- Python has **one** comparison level and chains across all of it, while the
  emitter's table gives the ordering operators a tighter precedence than
  equality, as C does. The existing non-associativity rule there was gated on
  equal precedence and so never fired for a mixed pair.

Checked alongside, as the task asked: `IS NULL` binds tighter than `=` in
PostgreSQL, so `isNull(x) == true` was never affected; `BETWEEN` is not emitted
by any binding. The blast radius over the corpus is two lines —
`reference/equality` on SQL and one Python line in `precedence-dynamic` that
gains a redundant second pair of parentheses, because the dynamic `gt`
registration already wraps its own result.
