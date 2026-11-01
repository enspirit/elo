# Should `first`, `last`, `at`, `indexOf` and `find` be nullable?

> Renumbered from 0094, which collided with an existing task in `done/`. Commit messages written before the renumbering refer to it as 0094.

The type checker now treats an optional schema field (`:?`) as `T|Null` and
reports using it as a `T`, with narrowing on `isNull`/`isNotNull`, `&&`-chained
guards and the `|` operator. That was Bernard's call: strict on null, because
null yields tons of bugs.

The same argument applies to five stdlib functions that genuinely return null,
and this is the remaining piece of §5.3 item 5 in the analysis
(`analyzed/0091-type-checking.md`). Measured:

```
indexOf('abc', 'z')  -> null
at([1, 2], 9)        -> null
first([])            -> null
```

`find(list, fn)` returns null when nothing matches; `last` behaves like `first`.

## Why it was not done with the `:?` work

Two reasons, both worth a decision rather than a guess:

1. **Ergonomics.** `:?` is the author's own declaration, so being strict about
   it only affects code that opted in. These five are used everywhere, and
   making them nullable means `upper(first(names))` becomes a diagnostic — every
   list access would need `| fallback` or a guard. That is a real change to how
   Elo reads, and arguably the right one, but it is Bernard's call and not a
   side effect of a checker task.

2. **The refinement table.** `src/typecheck.ts` currently refines
   `first`/`last`/`at`/`min`/`max`/`sum`/`find` to the list's element type. They
   would become `nullable(element)`, and a unit test asserts that a refinement
   may only sharpen what `typedefs.ts` returned — `nullable(Int)` projects to
   `any` where the table says `any` for `first`, so that still holds, but the
   interaction wants checking rather than assuming.

## If adopted

- `first`, `last`, `at`, `find`, `indexOf` return `nullable(T)`.
- `min`/`max`/`sum` of an empty list: check what each target actually returns
  before deciding — they may raise rather than return null, in which case they
  stay non-null.
- Expect fixture and website-example churn: several documented examples do
  `upper(first(…))`-shaped things. Measure first:

  ```
  node -e "…run typecheck over test/fixtures and web/src/pages…"
  ```

  (both corpora are clean today, and the integration suite asserts the fixture
  one stays clean, so the churn will be visible immediately.)

- Consider whether `at(list, i)` with a literal index inside a literal list's
  bounds could stay non-null. Probably not worth the special case.

## Alternative

Leave them non-null and document that they may return null, on the grounds that
a list accessor returning null is understood, while a *declared* optional field
is a contract the author wrote. That is the status quo and is defensible; it
just needs to be a decision rather than an oversight.
