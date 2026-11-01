# SQL compares a jsonb result against a plain SQL literal

> One of five emission bugs uncovered when 0178 stopped the SQL acceptance
> runner from passing on psql errors.

## The bug

Everything in the Data family — `fetch`, `patch`, `Data`, selectors — returns
`jsonb` on SQL, and the comparison it lands in emits the other side as a
native SQL value. PostgreSQL has no operator for the pairing:

```
$ eloc -t sql -e "fetch({name: 'Alice'}, .name) == 'Alice'"
(jsonb_build_object('name', 'Alice'))::jsonb #> (ARRAY['name'])::text[] = 'Alice'
ERROR:  invalid input syntax for type json

$ eloc -t sql -e "Data('[1, 2, 3]') == [1,2,3]"
elo_data('[1, 2, 3]') = ARRAY[1, 2, 3]
ERROR:  operator does not exist: jsonb = integer[]

$ eloc -t sql -e "patch({}, .name, 'Alice')"
elo_patch(('{}'::jsonb)::jsonb, (ARRAY['name'])::text[], to_jsonb('Alice'))
ERROR:  could not determine polymorphic type because input has type unknown
```

The first is the nastiest: `jsonb = 'Alice'` makes PostgreSQL parse `'Alice'`
*as JSON*, where a bare word is not valid JSON. So the error is not a type
mismatch report but a confusing complaint about the literal.

## Quarantined fixtures

Listed under `0184` in `KNOWN_INVALID` in `test/acceptance/test-sql.sh`:
`reference/datapath`, `stdlib/data/patch`, `stdlib/data/selector`.

## What to do

Decide what a Data-typed value *is* on SQL, then make both sides of a
comparison agree. `to_jsonb(...)` on the non-jsonb side is the obvious move
(`jsonb = jsonb` compares numbers, strings and arrays alike), and it is
probably the same fix as 0182 — read that one first, since choosing `->`
there forces the same answer here.

`elo_patch`'s polymorphic complaint is a separate detail: `to_jsonb('Alice')`
needs the literal typed (`to_jsonb('Alice'::text)`), which is a local fix
inside the emitter.

Each needs an acceptance assertion comparing a fetched value against a literal
of each Elo type — String, Int, Float, Bool, List, Data — since the current
corpus only exercises the String case on the paths that work.
