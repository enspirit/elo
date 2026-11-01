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
