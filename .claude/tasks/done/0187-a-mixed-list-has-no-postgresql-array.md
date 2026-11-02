# A list whose elements have different types has no PostgreSQL array

> Found while fixing 0181: it is the one line left failing in
> `reference/arrays` once the empty list is typed. **This is a language
> decision, not a patch** — do not start by changing the emitter.

## The bug

```
$ eloc -t sql -e "[1, 'two', true, null]"
ARRAY[1, 'two', TRUE, NULL]

$ psql -c "SELECT ARRAY[1, 'two', TRUE, NULL];"
ERROR:  ARRAY types integer and boolean cannot be matched
```

A PostgreSQL array is homogeneous: the constructor takes one element type and
coerces every element to it. `[1, 'two']` happens to compile, because
PostgreSQL will read `'two'` as text and `1` as text too; `[1, true]` does not,
because integer and boolean have no common type. So the emission is not merely
broken for mixed lists — it is *silently lossy* for the subset that compiles,
which is worse.

The other three targets have heterogeneous lists natively and are unaffected.

## The question to settle first

**Is a mixed list part of portable Elo?** Three answers, in the order the
design principles rank them:

1. **No — reject it on SQL.** The transform or the SQL compiler reports
   "a list with elements of more than one type has no PostgreSQL
   representation". Simple, honest, and consistent with *restricting Elo's
   power where portability demands it*. The cost: `[1, 'two']` compiles today
   on SQL (to something wrong), so this is a visible break, and
   `reference/arrays.elo` loses its `.expected.sql` — the mixed-list assertions
   have to move to their own fixture with no SQL target, the way the lambda
   fixtures already do.
2. **Yes — represent a list as `jsonb`.** Exact for every Elo list, including
   nested ones, which would also answer 0185. But it changes what a List *is*
   on SQL: `UNNEST`, `CARDINALITY`, `= ANY`, `ARRAY_AGG` and the subscript all
   stop applying, and every list function in `src/bindings/sql.ts` has to be
   rewritten against `jsonb_array_elements`. That is a redesign of the SQL
   target, not a bug fix, and it would regress the typed array operations that
   work well today.
3. **Yes, for the cases PostgreSQL can coerce.** Cast every element to `text`.
   Compiles more often and is wrong more quietly: `at([1, 'two'], 0) == 1`
   would compare `'1'` with `1`. Rejected.

Recommendation: **(1)**, with (2) kept in mind as the answer to 0185 if nested
lists turn out to matter more than mixed ones. Either way, say it in the docs —
"a list's elements must share a type to compile to SQL" is a language rule, and
`README` plus the website's Reference page are where it belongs.

Note that the element type is already on the IR as of 0181
(`IRArrayLiteral.elementType`, `any` when mixed or empty), so detecting the
case needs no new analysis — only the decision about what to do with it.

## Test

`reference/arrays` is quarantined under `0187` in `KNOWN_INVALID` in
`test/acceptance/test-sql.sh`. L4 (`assert(typeOf([1, 'two', true, null]) ==
'List')`) is the failing line. Whatever is decided, the mixed-list assertions
need an acceptance fixture that states it: on three targets if SQL refuses, on
four if it does not.

## Widened by 0185: nesting, not only mixing

Fixing `flat` showed that this task is one case of a larger rule: **a
PostgreSQL array is more restrictive than an Elo list in two ways, not one.**

- Its elements must share a type — this task.
- Nesting must be *rectangular*. `ARRAY[ARRAY[1], ARRAY[2, 3]]` is rejected
  with "multidimensional arrays must have array expressions with matching
  dimensions", so a ragged list of lists cannot be constructed at all:

```
$ eloc -t sql -e "[[1], [2, 3]] == [[1], [2, 3]]"
ARRAY[ARRAY[1], ARRAY[2, 3]] = ARRAY[ARRAY[1], ARRAY[2, 3]]
ERROR:  multidimensional arrays must have array expressions with matching dimensions
```

`flat` escapes it by concatenating the parts instead of building the nested
array (see `done/0185-…`), which is exact and needs no decision. Nothing else
can: a nested list that is merely *held* has to exist as a value.

Both restrictions have the same two answers — reject, or make a list `jsonb` —
and they should be answered together, which is why this is recorded here rather
than in a second task.

## Addendum: what was done

Decision: **(1), fail loudly.** Both restrictions, since 0185 showed they are
one rule — a PostgreSQL array carries one element type *and* nests only
rectangularly.

Red first with the unit tests in `test/unit/compilers/sql.unit.test.ts`:
3 of 7 failed, because the compiler emitted the array instead of refusing it.

`assertRepresentableList` in the SQL compiler refuses two shapes, each with a
message naming what it found and what to do instead:

```
$ eloc -t sql -e "[1, 'two']"
A list mixing Int and String cannot be compiled to SQL: a PostgreSQL array
carries a single element type. Use a list of one type, or carry the value as
Data — jsonb has no such restriction.

$ eloc -t sql -e "[[1], [2, 3]]"
A list of lists must be rectangular to compile to SQL, and this one mixes
lengths 1 and 2: PostgreSQL has no array of arrays, only multi-dimensional
arrays, which require every part to be the same length. flat() works on a
ragged list because it concatenates the parts.
```

What it does **not** refuse matters as much, and is asserted:

- `[1, 1.5]` and `[D2024-01-01, NOW]`. PostgreSQL unifies these exactly —
  `numeric[]` and `timestamp[]` — so refusing them would be stricter than
  PostgreSQL for no reason. `PG_ARRAY_FAMILY` groups the kinds it unifies
  rather than comparing Elo kinds for equality.
- `[1, null, 3]`. Null is a hole, not a type.
- An element of unknown type. There is nothing to object to, and if it does
  clash PostgreSQL says so at plan time.
- `flat([[1], [2, 3]])`, which never builds the nested array.

`reference/arrays.elo` lost its mixed-list line to a new fixture with no
`.expected.sql` — `reference/lists-sql-refuses.elo`, 13 assertions on the three
targets that do represent these lists, including the cases SQL *does* accept so
the line between them is visible in one place. `reference/arrays` is out of
quarantine, and **`KNOWN_INVALID` is now empty**: the SQL acceptance suite skips
only the three fixtures that need an input.

Documented in README under a new "Portability limits" bullet — which also
gathers the lambda and `Data`-schema limits that were only mentioned in passing
— and on the website's Reference page under Lists, next to the two examples that
are now SQL-unsupported.
