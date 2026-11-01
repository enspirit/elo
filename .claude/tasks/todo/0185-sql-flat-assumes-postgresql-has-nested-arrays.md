# `flat` assumes PostgreSQL has nested arrays, which it does not

> One of five emission bugs uncovered when 0178 stopped the SQL acceptance
> runner from passing on psql errors.

## The bug

```
$ eloc -t sql -e "flat([[1, 2], [3, 4]])"
(SELECT ARRAY_AGG(elem) FROM UNNEST(ARRAY[ARRAY[1, 2], ARRAY[3, 4]]) AS sub, UNNEST(sub) AS elem)

$ psql -c "SELECT ..."
ERROR:  function unnest(integer) does not exist
```

The emission unnests twice, once to get each sub-array and once to get its
elements. That is correct for a language with arrays of arrays. PostgreSQL has
no such thing: `ARRAY[ARRAY[1,2], ARRAY[3,4]]` is a single **two-dimensional**
`integer[]`, and `UNNEST` on it yields the four scalars directly. So `sub` is
already an integer and the inner `UNNEST(sub)` has no matching function.

In other words `flat` on SQL is already done by the time the outer `UNNEST`
runs, and the second one is what breaks it.

## Quarantined fixture

Listed under `0185` in `KNOWN_INVALID` in `test/acceptance/test-sql.sh`:
`stdlib/list/transform/flat`.

## The deeper question

The emission is a symptom. Elo's `List` of `List` has no faithful
representation in PostgreSQL:

- A 2-D array is not a list of lists — PostgreSQL requires every row to have
  the same length, so `[[1], [2, 3]]` cannot be built at all.
- `jsonb` represents it exactly, but then a nested list is a different runtime
  type from a flat one, and every list function has to accept both.

Following the design principles — simple, well-designed, portable, safe, in
that order — the honest answer may be that a nested list is **not portable**
and Elo should restrict it rather than emit something that only works for
rectangular data. That is a language decision; make it before patching the
emitter, and check what `sort`, `unique`, `contains` and `==` do with a nested
list on SQL today, since they are all in the same position.

If `flat` is kept, one `UNNEST` is the whole fix for the rectangular case —
but a fixture asserting `flat([[1], [2, 3]])` will show what is still missing.
