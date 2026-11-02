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

## Addendum: what was done

Red first by lifting the 0184 group out of `KNOWN_INVALID`: 3 fixtures, 15
assertions. The new fixture written for it,
`stdlib/data/fetch-types.elo`, is **17 red of 19 on SQL** against the reverted
compiler and green on the other three targets.

The task was right that this is the same fix as 0182: the two sit either side
of one question — *SQL has two data models in play and Elo's `Object`/`Any`
cannot tell them apart.*

- The input `_` is a **row**. `_.person.age` is a field reference and compiles
  to the SQL dot, which is what a host passing a record expects.
- Everything in Elo's data family is **jsonb**: an object literal, `fetch`,
  `patch`, `merge`, `deepMerge`, and `Data` of anything but a list.

So the compiler tracks it from the expression's shape — `isJsonb(ir)` — rather
than from the Elo type, which cannot say. Three things follow:

- **A jsonb value compares against jsonb.** `operandOf` wraps a non-jsonb
  operand in `to_jsonb`, which also needs the cast PostgreSQL wants to resolve
  a polymorphic call on a bare literal: `to_jsonb('Alice'::text)`. That is also
  the whole of the `elo_patch` failure — `to_jsonb('Alice')` never resolved.
- **A chain of member reads resolves in one go.** `jsonb->>'user'` is *text*,
  so reading `.name` off it was not a json operation at all and fell through to
  the SQL dot — "syntax error at or near .". `jsonPath` walks the chain to its
  root and emits `#>>` with the whole path, or `->>` for a single key.
- `readsJsonField` now asks `jsonPath`, so the text reconciliation from 0182
  applies to a path read as well as to a single key.

`reference/datapath`, `stdlib/data/patch` and `stdlib/data/selector` are out of
quarantine, which leaves only 0185, 0186 and 0187 in `KNOWN_INVALID`.

What is still out of reach, and deliberately: **arithmetic** on a fetched value.
`fetch(d, .n) + 1` is `jsonb + integer`, and `to_jsonb(1)` does not help
because jsonb has no `+` either. It needs a cast to numeric, which needs the
type — so it works under `--optimize` with a declared schema and not otherwise.
Same shape as the limit 0182 documents.
