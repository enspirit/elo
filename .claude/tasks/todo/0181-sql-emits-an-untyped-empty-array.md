# SQL emits `ARRAY[]` for the empty list, which PostgreSQL cannot type

> One of five emission bugs uncovered when 0178 stopped the SQL acceptance
> runner from passing on psql errors. 15 of the 26 revealed fixtures are this
> one, which makes it the largest of the five.

## The bug

```
$ eloc -t sql -e "[]"
ARRAY[]

$ psql -c "SELECT ARRAY[];"
ERROR:  cannot determine type of empty array
LINE 1: SELECT ARRAY[];
HINT:  Explicitly cast to the desired type, for example ARRAY[]::integer[].
```

An `ARRAY[...]` constructor with at least one element gets its element type
from the elements. With none, PostgreSQL has nothing to infer from and refuses.
Every use of an empty list in SQL is therefore invalid, whatever is done with
it:

```
$ eloc -t sql -e "count([])"
COALESCE(CARDINALITY(ARRAY[]), 0)
$ eloc -t sql -e "join([], ',')"
array_to_string(ARRAY[], ',')
```

## Quarantined fixtures

Listed under `0181` in `KNOWN_INVALID` in `test/acceptance/test-sql.sh`:
`reference/arrays`, `stdlib/list/arithmetic/concat`,
`stdlib/list/predicates/{contains,isEmpty}`,
`stdlib/list/summary/{avg,count,join,length,max,min,sum}`,
`stdlib/list/transform/{reverse,sort,unique}`,
`stdlib/string/transform/split`. Remove the entries as they pass.

## What to decide first

The emission needs an element type, and Elo's `[]` does not carry one — the IR
types it `array` with no element type. So either:

- **Infer it from the context.** `count([])` does not need one, but
  `concat([], [1])` and `contains([], 1)` do, and the type is right there in
  the other operand. This is the principled answer and the most work: the
  element type has to reach the array literal's emitter.
- **Pick a default cast.** `ARRAY[]::text[]` compiles everywhere and is wrong
  as soon as the empty list meets a non-text array: `ARRAY[]::text[] ||
  ARRAY[1]` fails the same way the current code does. It converts a hard
  failure into a narrower one.

Note that the type checker (0171/0177) is the thing that would know the
element type. If annotating the AST with checked types lands first, this gets
much cheaper — worth checking before starting.

The other three targets are unaffected: `[]` is `[]` in JavaScript and Python
and Ruby, and needs no element type.

## Inherited from 0179

`stdlib/list/access/first` and `stdlib/list/access/last` moved into this
group when 0179 fixed the subscript parentheses. Their first line passes now;
the only line still failing in each is `assert(isNull(first([])) == true)`.
