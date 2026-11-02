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

## Addendum: what was done

The task asked for the language decision first and it turned out not to be
needed, because `flat` can avoid the nested array entirely.

**Concatenate the parts.** `flat([[1, 2], [3, 4]])` emits
`(ARRAY[1, 2] || ARRAY[3, 4])`, which never constructs the array of arrays. So
it is exact for the case the task said would show what is missing —
`flat([[1], [2, 3]])`, ragged, which PostgreSQL rejects outright as
"multidimensional arrays must have array expressions with matching dimensions"
— and for an empty part, which borrows its element type from a sibling:
`flat([[], [1, 2]])` is `('{}'::integer[] || ARRAY[1, 2])`.

Available whenever the outer list is written in place and its elements are
lists, which is every use `flat` exists for. Otherwise one `UNNEST`, which is
the task's own observation: `UNNEST` on a rectangular two-dimensional array
yields every scalar in a single step, and on a flat list it is a no-op. That is
the most SQL can do for a value it only sees at runtime, and it is now correct
for both.

`stdlib/list/transform/flat.elo` grew from 4 assertions to 11 — ragged both
ways round, an empty part on either side, both parts empty, a single part, a
String element, and a list that is already flat. Red before the fix: **11 of 11
on SQL**.

### A Python bug, found by the last of those

`flat([1, 2])` answers `[1, 2]` on JavaScript (`.flat()`), Ruby
(`.flatten(1)`) and now SQL, and *raised* on Python: the comprehension
iterated every element unconditionally, so a non-list element gave "'int'
object is not iterable". It now passes a non-list element through, which is
what the other three do. One line, fixed here because it is the same
assertion's other half.

### What is still out of reach

A nested list that is merely *held* rather than flattened —
`[[1], [2, 3]] == [[1], [2, 3]]` — still cannot be built on SQL. That is the
same restriction as 0187 (a PostgreSQL array needs one element type) seen from
the other side: it also needs rectangular nesting. 0187 has been widened to
cover both, since they have the same two answers — reject, or make a list
`jsonb` — and should be answered together.
