# SQL member access yields text, so any comparison to a non-text literal fails

> One of five emission bugs uncovered when 0178 stopped the SQL acceptance
> runner from passing on psql errors.

## The bug

Member access emits the `->>` operator, which returns `text` whatever the
stored value is:

```
$ eloc -t sql -e "{a: 1}.a == 1"
jsonb_build_object('a', 1)->>'a' = 1

$ psql -c "SELECT jsonb_build_object('a', 1)->>'a' = 1;"
ERROR:  operator does not exist: text = integer
```

A string-valued member happens to work (`->>'a' = 'x'` is text = text), which
is why the corpus looked healthy: the fixtures that compare a number are the
only ones that fail, and they were the ones the harness ignored.

The same root cause produces the `alternative` failure, where the default
lands in a COALESCE with the text:

```
$ eloc -t sql -e "let tuple = { x: '12' } in Int(tuple.x|0)"
... elo_int(COALESCE(tuple->>'x', 0)) ...
ERROR:  COALESCE types text and integer cannot be matched
```

## Quarantined fixtures

Listed under `0182` in `KNOWN_INVALID` in `test/acceptance/test-sql.sh`:
`others/trailing-commas`, `reference/objects`, `reference/alternative`.

## Directions

- `->` instead of `->>` keeps the value as `jsonb`, and `jsonb = jsonb`
  compares numbers and strings alike — `jsonb_build_object('a',1)->'a' =
  '1'::jsonb` is true. That means the *other* side of every comparison has to
  become jsonb too, which is 0184's problem as well; the two are probably one
  fix.
- Or cast on access from the member's checked type, which needs the type
  checker's output in the emitter (0177).

Check both against `reference/datapath` and `stdlib/data/*` before choosing:
whatever `.name` and `fetch` return has to compare the same way, or Elo's
equality stops meaning one thing on SQL.

The other three targets are unaffected — they read the member as the value it
is.

## Addendum: what was done

Red first by lifting the 0182 group out of `KNOWN_INVALID`: 3 fixtures, 6
assertions. The new fixture written for it, `reference/object-member-types.elo`,
is **19 red of 23 on SQL** against the reverted compiler and green on the other
three targets — which is the shape of the bug.

Neither of the two directions the task offered, as stated. `->` instead of
`->>` would have fixed the comparisons and broken `upper(k.a)`, which works
today. What the two directions have in common is the right answer: **the read
cannot say what type it produced, so the type comes from the operation using
it.**

- `sqlBinaryOp` casts a field-read operand to the type its *sibling* has:
  `{ budget: 1500 }.budget = 1500` becomes
  `(obj->>'budget')::numeric = 1500`. Numbers go to `numeric` rather than
  through text because `{ a: 1.0 }.a == 1` is true in Elo where `'1.0' = '1'`
  is not, and because `'10' < '9'` is not an ordering. This applies to
  arithmetic and ordering as much as to equality — `{ a: 1 }.a + 1` and
  `{ a: 1 }.a > 0` were just as broken, and nothing in the corpus had noticed.
- When *both* operands are field reads, neither can tell the other anything, so
  the operator itself does: `OPERATOR_DEMAND` gives `numeric` to the arithmetic
  and ordering operators and `boolean` to `AND`/`OR`. `=`, `<>` and `||` are
  deliberately absent — two reads compare as text, which is right, and
  guessing would not be.
- `COALESCE` is the one place SQL needs several expressions to agree on a type
  where Elo does not: `tuple.x | 0` is a String with an Int default. The
  alternative's value is the first one's, so `pgTypeOf` brings the rest to the
  first's type.

And the task's second direction, now that 0177 has landed: a member read whose
type the checker supplied is cast on access —
`eloc -t sql --optimize` emits `(o->>'x')::numeric` — so it composes like any
other value and needs nothing from its context. `readsJsonField` returns false
for those, which is what keeps the two emissions equivalent.

### A third bug, found by the equivalence test

The optimized acceptance run went red on `{ a: 10 }.a / 4 == 2.5` while the
plain one passed: the annotation cast the read to `integer`, and PostgreSQL's
`integer / integer` truncates to 2. Reading a json number as `numeric` fixes
the divergence and is the more faithful emission anyway — json draws no line
between 1 and 1.0, so neither can the read.

The underlying defect is not this task's: **`7 / 2` is 3 on SQL** and 3.5 on
the other three, and `reference/division.elo` — whose first comment is "`/` is
real division in Elo, in every target" — has no `.expected.sql` at all. Filed
as **0188**.
