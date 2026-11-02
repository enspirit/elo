# `sum(xs, init)` folds with an integer zero whatever the init's type is

> Found while fixing 0181: it is the one line left failing in
> `stdlib/list/summary/sum` once the empty list is typed.

## The bug

`src/bindings/sql.ts`:

```ts
sqlLib.register('sum', [Types.array, Types.any], (args, ctx) => {
  const initType = inferType(args[1]);
  ...
  if (initType === Types.string) {
    return `(${init} || COALESCE((SELECT STRING_AGG(v, '') FROM UNNEST(${arr}) AS v), ''))`;
  }
  return `(${init} + COALESCE((SELECT SUM(v) FROM UNNEST(${arr}) AS v), 0))`;
});
```

The fallback's `COALESCE(..., 0)` hardcodes an integer zero, so the init's type
has to be numeric for it to compose:

```
$ eloc -t sql -e "sum([P1D, P2D], P0D)"
(INTERVAL 'P0D' + COALESCE((SELECT SUM(v) FROM UNNEST(ARRAY[INTERVAL 'P1D', INTERVAL 'P2D']) AS v), 0))
ERROR:  COALESCE types interval and integer cannot be matched
```

A second, smaller thing in the same four lines: `initType === Types.string`
compares `EloType` objects by **identity**. It works only because `inferType`
hands back the shared `Types.string` constant; `typeEquals` is what the rest of
the codebase uses, and the identity check is a trap waiting for any emitter
that builds a type rather than reusing the constant.

## The fix, and why it types

Move the COALESCE outside the fold, so the fallback is the init itself rather
than a literal that has to match it:

```sql
COALESCE(<init> + (SELECT SUM(v) FROM UNNEST(<xs>) v), <init>)
```

Summing zero rows is NULL, which makes the whole addition NULL, which COALESCE
answers with the init — the identity of the fold, already the right type by
construction. Same shape for the string case with `||` and `STRING_AGG`.
Verified against the container:

```
COALESCE(INTERVAL 'P0D' + (SELECT SUM(v) FROM UNNEST(ARRAY[INTERVAL 'P1D', INTERVAL 'P2D']) v), INTERVAL 'P0D') = INTERVAL 'P3D'   -> t
COALESCE('' || (SELECT STRING_AGG(v, '') FROM UNNEST('{}'::text[]) v), '')                                       = ''              -> t
```

## Test

`stdlib/list/summary/sum` is quarantined under `0186` in `KNOWN_INVALID` in
`test/acceptance/test-sql.sh`; lifting the entry is the red test, and L7
(`assert(sum([P1D, P2D], P0D) == P3D)`) is the failing line. Add an assertion
for a Float init and a Date-free non-numeric one too, since the current corpus
only covers Int and String inits on the paths that worked.

## Addendum: what was done

Red first by lifting the entry out of `KNOWN_INVALID`: 1 assertion. The
assertions the task asked for — a Float init, a Duration init, and an init with
an empty list — bring that to **5 red of 13 on SQL**, green on the other three
targets.

The fix is the one the task describes: COALESCE outside the fold rather than
inside it.

```sql
COALESCE(<init> + (SELECT SUM(v) FROM UNNEST(<xs>) v), <init>)
```

Aggregating zero rows is null, which makes the whole fold null, which COALESCE
answers with the init — the identity of the fold, already the right type by
construction. The String case is the same shape with `||` and `STRING_AGG`.

The identity comparison the task flagged alongside — `initType === Types.string`
against the shared constant — is now `typeEquals`, which is what the rest of
the codebase uses. The array argument also goes through `arrayArg` with the
init's type as its demand, so `sum([], P1D)` gives the empty list an `interval`
element rather than the default `text`.
