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
