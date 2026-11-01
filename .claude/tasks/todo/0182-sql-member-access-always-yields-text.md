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
