# What the corpus never compiles

> "go for H9 then"

H9 from `0244`: every gate and every acceptance assertion only sees code that
something handed it, so the set of stdlib implementations nothing ever
compiles is the set nothing can check. Three security holes on this branch
were instances of it, each found by accident. This makes the set a list.

## A correction to the number I quoted first

The figure in 0244 — 314 declared, 102 unreached — was measured by recording
the signature key each call *asked for*. That is the wrong key. `lookup`
generalizes, so `at(array, int)` can be answered by the `at(any, any)`
implementation, and it is the **answering** one whose code gets emitted.

Recording the implementation that actually ran, via a new `StdLib.keyOf`:

| target | declares | reaches | unreached |
|---|---|---|---|
| javascript | 314 | 236 | **78** |
| ruby | 267 | 211 | 56 |
| python | 262 | 218 | 44 |
| sql | 185 | 167 | 18 |

So I also have to withdraw the headline I gave with it. I said `fetch:any,*`
and `deepMerge:any,any` were reached by no fixture, and that the c0rydoras
escape therefore sat in untested code. Under the correct measure they *are*
reached. The item still stands on 78 — a quarter of the JavaScript surface —
but not on that example.

## What was built

`test/integration/dispatch-coverage.integration.test.ts`. It wraps
`StdLib.prototype.emit` for the length of the run, compiles every fixture line
on all four targets in **both** compile modes, and records which registered
implementation answered. `--optimize` is included because it selects different
implementations — that is the whole mechanism of the typed `at()` escape.

Two directions, as in `registry-consistency.unit.test.ts`:

- an unreached implementation must be listed in `UNREACHED` with a reason, so
  a **new** gap fails rather than joining a silent pile;
- a listed implementation the corpus now reaches must be deleted, so the list
  shrinks as fixtures are written rather than rotting.

Both seen red: removing one entry fails the first, adding a reached signature
fails the second.

`src/stdlib.ts` gains `keyOf()` — the inverse of `lookup`, introspection only,
alongside the `signatureKeys()` that already exists for the registry test.

## The payoff: 78 → 50 on JavaScript

The point of a list is to work through it, not to file it. The largest group
was `dynamic` — the `any`-typed form of a function whose typed form is
covered — and it is the group that matters, because the dynamic emitters are a
separate body of code and most of the sandbox escapes to date have been in
one. CLAUDE.md already asks for both paths to be asserted; this was the list of
places where that had not been done.

`test/fixtures/reference/dynamic-stdlib-dispatch.elo` closes it: 29 dynamic
assertions over strings, lists and operators, each with its typed twin.

| target | before | after |
|---|---|---|
| javascript | 78 | **50** |
| ruby | 56 | **29** |
| python | 44 | **41** |
| sql | 18 | 18 (no lambdas) |

## What is left, and why

| | dynamic | cross-type | widening |
|---|---|---|---|
| javascript | 4 | 27 | 19 |
| ruby | 11 | 0 | 18 |
| python | 10 | 9 | 22 |
| sql | 10 | 0 | 8 |

- **cross-type** (36) — comparisons between two different types: `1 == 'a'`,
  `eq:date,datetime`. Legal Elo that compiles and answers false, but nothing
  asserts what it answers. Worth a fixture; worth deciding the semantics
  first, which is `0225-division-by-zero`-shaped work rather than coverage
  work.
- **widening** (67) — numeric and temporal operand combinations the typed path
  handles and no fixture writes: `Float * Float`, `min(Float, Int)`,
  `ceil:int`, `month:datetime`. Mechanical, low risk, a good first task for
  someone learning the corpus.
- **dynamic** (35, down from 63) — what remains is mostly `min`/`max` with one
  unknown operand on Ruby and Python, plus `Interval:any` and `Datetime:any`.

The right long-run size of the list is zero. It is a to-do list with a test
attached, not an allowlist.

## Lesson

H9 was supposed to be a meta-check that finds nothing itself, and that is what
it was: no new defect this time. What it changes is the denominator. Every
emitted-grammar gate, every acceptance assertion and every future item in 0244
now applies to a quarter more of the JavaScript stdlib than it did this
morning, and the part it does not apply to is written down instead of unknown.

The other lesson is about my own measurement. The first number I reported was
wrong in a way that happened to make the case *more* dramatic — untested
`fetch` dynamic paths — and I used it as the headline before checking it. The
corrected number is less alarming and the item is still worth doing. Measure,
then quote.
