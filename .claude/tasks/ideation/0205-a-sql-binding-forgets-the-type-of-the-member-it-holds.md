# A SQL binding forgets the type of the member it holds

> Found while exercising 0201 (a shared module is bound once). Not caused by it:
> the same expression fails without an import anywhere in it.

## Symptom

On the SQL target, a `let` that binds a member of an object loses the member's
type, and the next use of the name is emitted as text:

```elo
let m = { one: 1 }, one = m.one in assert(one == 1)
```

```sql
(SELECT (SELECT CASE WHEN one = 1 THEN TRUE ELSE … END
         FROM (SELECT m->>'one' AS one) AS _let)
 FROM (SELECT jsonb_build_object('one', 1) AS m) AS _let)
```

Postgres refuses it:

```
ERROR:  operator does not exist: text = integer
```

Written without the intermediate binding, the same member access is cast:

```elo
let m = { one: 1 } in assert(m.one == 1)
```

```sql
… CASE WHEN (m->>'one')::numeric = 1 THEN …
```

So the cast is decided at the member access, from the object's type, and
survives only when the access is *in* the expression that needs the number. A
`let` in between drops it: `m->>'one' AS one` is bound as text, and `one` is
typed text from there on.

`+` is the same story — `let m = { l: 'x' }, l = m.l in l + '-a'` emits
`l + '-a'`, and Postgres has no `+` on text either, where a known-String
operand would have given `||`.

## Why it matters

It is the one place where naming a subexpression changes what a program means.
Everywhere else in Elo a `let` is a name for a value; here it is a name for a
value of a forgotten type, and only on one target. The two forms are the same
program, so a divergence between them is a portability bug, not a limitation.

It also hits imports hard, because an import *is* a let of a member: `import
{ one } from './m'` binds `one = <module>.one`, so every numeric or boolean
name a module exports is unusable on SQL. That is why
`reference/imports-sharing.elo` exports strings — equality on text is the one
thing that happens to work — and why `reference/imports.elo` has no `.sql`
expected file at all.

## What it should be

A `let` binding carries the type the checker gave its value, so `one` is Int
wherever it is read, and the SQL compiler emits `(m->>'one')::numeric` at the
binding — or emits the comparison with the cast, which is the same thing one
level up. The IR already infers the type of a member access when the object's
type is known (that is what decides the cast today); what is missing is
threading it through the binding.

## Tests

- `assert((let m = { one: 1 }, one = m.one in one) == 1)` on all four targets —
  red on SQL today.
- The same through one more binding, and through a nested `let`.
- `let m = { l: 'x' }, l = m.l in l + '-a' == 'x-a'`, for the `||` half.
- `reference/imports.elo` and `reference/imports-sharing.elo` gain `.sql`
  expected files, with the numeric assertions `imports-sharing` had to drop —
  lambdas aside, which SQL refuses for its own stated reason.
