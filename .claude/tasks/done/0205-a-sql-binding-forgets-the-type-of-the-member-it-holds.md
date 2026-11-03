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

## Closed

Fixed, but not by this task: the 0214 family (`902ad8f` *EloType carries the
shape the author wrote*, `0322e9f` *A declared type carries its shape through
the transform*) gave the transform field types that survive a binding, and the
SQL compiler now emits the cast *at* the binding — `(m->>'one')::numeric AS
one` — which is one of the two shapes "What it should be" asked for.

What this task actually did was add the coverage, because there was none: no
fixture bound a member read to a name and ran on SQL, so nothing would have
caught it coming back.

- `reference/object-member-types.elo` gains nine assertions for the bound
  member read, over Int, Float, Bool, Date and String, through a second
  binding and through a nested `let`. **8 of the 9 were red on SQL** at
  `16bfa14`, the commit before the 0214 family, and 0 of 9 on JavaScript, Ruby
  and Python — SQL-only, as described above. The ninth, `s < t` on two bound
  string fields, was already green: text ordering is one of the things that
  happened to work, and it is kept to pin that the fix did not break it.
- `reference/imports-sharing.elo` gains the numeric assertions it had to drop,
  and `modules/shared-helper.elo` the `count`, `ratio` and `shared` fields they
  need. **7 of 7 red** at `16bfa14`. That covers the import half, since an
  import *is* a let of a member: the emission is now
  `(_module_0->>'count')::numeric AS count`.

Not done, and not about this: `reference/imports.elo` still has no `.sql`
expected file, and cannot have one yet. It is refused for an unrelated reason —
`Type definitions are not yet supported in SQL compilation` — and it also uses
lambdas, `map` and `assertFails`. Nothing in it is blocked by the binding any
more; it is blocked by the type prelude. `imports-sharing` covers what this
task needed from it.

One incidental fix: `test/unit/host-api.unit.test.ts` asserted a hardcoded
count of 6 assertions in `imports-sharing.elo`. It now counts them from the
file, so a fixture the corpus keeps growing does not have to come back and edit
a number.
