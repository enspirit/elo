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

## Addendum: what was done

Red first by lifting the 0181 group out of `KNOWN_INVALID`: **17 fixtures, 22
assertions**, every one of them SQL-only.

The decision the task asked for is the first of the two it offered — infer the
element type — with a twist that made it much cheaper than feared. Two of the
three places that needed a type turned out not to need one at all:

- **`xs == []`** does not need an element type. It means "xs is an empty list",
  which `CARDINALITY` answers whatever the elements are, so `eq`/`neq` emit
  `(xs IS NOT NULL AND CARDINALITY(xs) = 0)` when either side is an empty list
  written in place. The null check is there because `null == []` is false in
  Elo while `CARDINALITY(NULL)` is null. Two empty lists compare `TRUE`
  outright.
- **`xs + []`** is the identity, so `add` on lists emits the other operand and
  never names a type. With both sides empty there is nothing to borrow and the
  default cast applies.

What is left genuinely needs a type, because PostgreSQL's polymorphic functions
(`CARDINALITY`, `UNNEST`, `= ANY`, `array_to_string`) cannot resolve an untyped
argument — the `'{}'` literal works next to a typed sibling and fails here, so
it is not a way out. One helper covers it:

```ts
function arrayArg(ir, ctx, demand = Types.string): string
```

The element type comes from the list when it has one, and otherwise from what
the consuming operation requires. `IRArrayLiteral` gained an `elementType`,
computed in `transform` by `commonElementType`, which ignores `null` elements —
`[1, null]` is a list of Int with a hole, which is how all four targets
represent it. Only two operations state a demand (`sum`/`avg` want a number,
`contains` wants the needle's type); for the rest the element type cannot change
the answer, so `text` stands in.

### A second bug in the same fixtures

`ARRAY_AGG` over zero rows is **NULL, not an empty array**, so `reverse([])`,
`sort([])` and `unique([])` answered null where Elo says `[]`. Typing the empty
array was not enough to turn those lines green. `COALESCE(<aggregate>, <input>)`
fixes it and types itself: when the aggregate is null the input *was* the empty
list. Skipped for a list written in place with elements in it, which cannot
aggregate to nothing — that keeps the common emission short.

### Result

15 of the 17 fixtures are out of quarantine. The two that are not have nothing
to do with empty lists, and both are filed:

- `stdlib/list/summary/sum` → **0186**: `sum(xs, init)` folds with
  `COALESCE(..., 0)` whatever the init's type is, so `sum([P1D, P2D], P0D)`
  cannot match interval against integer.
- `reference/arrays` → **0187**: `[1, 'two', true, null]` has no homogeneous
  PostgreSQL array. That one is a language decision — reject mixed lists on SQL,
  or represent a list as `jsonb` — and the task says so rather than guessing.

The fixture diff is confined to the empty-list sites. `flat([[], [1, 2]])`
changed shape with it but stays quarantined under 0185, where nested lists are
the actual subject.
