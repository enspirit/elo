## Problem to solve

Bricks asked for `sortBy` (point 7). It already exists and works:

```elo
sortBy([{a: 2}, {a: 1}], fn(r ~> r.a))   # [{a: 1}, {a: 2}]
```

They had looked. It is in the README list but has no entry on the stdlib page,
which is where the playground sends people and where every other function
lives with a signature and a runnable example.

## Context

A team running 2 007 expressions in production concluded a feature was missing
when it was shipped. That is a documentation defect with the same cost as an
absent feature, and it is the cheapest one on the list to repair.

## Proposal

Audit `web/src/pages/stdlib.astro` against the functions actually registered
in `src/bindings/*.ts` and fill the gaps. The website-examples consistency
test already executes every example on the page, so anything added is checked
— it caught a wrong result in a hand-written example during 1.1.0.

Worth doing as a sweep rather than function by function: the question is how
many others are missing, not whether `sortBy` is.

## Decision

Fix it, complete the doc.

## Audit result (2026-10-31)

Diffed every `register('name', …)` across `src/bindings/*.ts` against the
`fn-name` entries on `web/src/pages/stdlib.astro`.

- **`sortBy` is now present** with a full signature + runnable example — the
  reported gap had already been closed.
- **No registered stdlib function is missing** from the page. Every function
  entry carries a runnable example (verified by the website-examples test).
- The only registered names absent from the page are: operators (`add`, `mul`,
  `eq`, … — used through syntax, not called by name), the type selectors
  (`Int`, `Float`, `String`, … — documented in the Type Selectors section),
  the temporal keyword forms (`now`, `today`, `bot`, `eot` — exposed as the
  keywords `NOW`/`TODAY`/`BOT`/`EOT` and documented on the reference page), and
  the runtime guards (`assert`, `fail`, `assertFails` — documented in the
  reference page's Assertions section).

**One real discoverability gap fixed:** the temporal keywords had no mention on
the stdlib page (where the playground sends people). Added a note in the
DateTime section pointing to the reference page, and gave that reference section
a `#temporal` anchor. Nothing was duplicated onto the stdlib page, to avoid
end-user documentation bloat.
