# SQL emits `ARRAY[...][1]`, which PostgreSQL cannot parse

> Found while measuring the arity fallback (0176), and hidden until now by the
> harness hole in 0178.

## The bug

`first`, `last` and `at` emit the subscript directly onto the emitted receiver
(`src/bindings/sql.ts`):

```ts
sqlLib.register('at',    [Types.array, Types.int], (args, ctx) => `${ctx.emit(args[0])}[${ctx.emit(args[1])} + 1]`);
sqlLib.register('first', [Types.array],            (args, ctx) => `${ctx.emit(args[0])}[1]`);
sqlLib.register('last',  [Types.array],            (args, ctx) => `${ctx.emit(args[0])}[CARDINALITY(...)]`);
```

When the receiver is an array constructor, the result is not valid SQL:

```
$ eloc -t sql -e "first([3.7])"
ARRAY[3.7][1]

$ psql -c "SELECT ARRAY[3.7][1];"
ERROR:  syntax error at or near "["
$ psql -c "SELECT (ARRAY[3.7])[1];"
 3.7
```

PostgreSQL only allows a subscript on a parenthesised expression, not on an
`ARRAY[...]` constructor. A column reference works, which is why the existing
fixtures never caught it — they index values that reach SQL as `$1` or as a
column, never as a literal list.

## What to do

Parenthesise the receiver the way the other SQL emitters already do for
ambiguous grouping. The three registrations above are the whole surface; check
whether any other emitter subscripts `ctx.emit(...)` directly.

The acceptance assertion is a list literal indexed in place —
`assert(first([3.7]) == 3.7)`, `assert(at([1, 2, 3], 1) == 2)`,
`assert(last([1, 2, 3]) == 3)` — which is red on SQL only. **It stays green by
accident until 0178 lands**, because psql exits 0 on a syntax error. Do 0178
first, or assert the emitted string in an integration test as well.
