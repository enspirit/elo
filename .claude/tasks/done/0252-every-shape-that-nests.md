# Every shape that nests

> "Do H4 then."

H4 from `0244`: a hostile-shape corpus against every entry point. The last
item on the list with a bug record behind it.

The property is the one the security page states outright — *"It always
finishes. No expression — however deeply nested or malformed — makes the
compiler hang or overflow its stack"* and *"Bad input yields a typed Elo error,
not an uncaught native exception"*. Five issues have violated it:

| release | shape | reporter |
|---|---|---|
| 1.1.0 | prefix operators, exponentiation, guard sugar, type definitions | uaaw |
| 1.1.0 | type-expression nesting not counted by parser or transform | Atsushi Sada |
| 1.1.0 | applying a value not known to be a function (Y-combinator) | Atsushi Sada |
| 1.1.1 | exponential backtracking on nested `let`/`guard`/`check` | — |
| 1.2.4 | `pathOf` / `collectNonNullPaths` run on the outermost node | — |

One shape at a time, each found by someone looking. The set of shapes is
enumerable, so `test/unit/hostile-shapes.unit.test.ts` enumerates it: 30
generators × 7 stages (parse, typecheck, transform, four compilers) at depth
50 000, asserting each stage either refuses or succeeds — never a `RangeError`,
never over a 5s budget. 207 assertions.

## Nothing was red

Worth stating first and plainly, because it is the opposite of the last five
tasks. I probed 33 shapes across every stage, at default stack size and at
depth 50 000, and **found no gap**: every nesting shape is refused with
`Maximum expression depth exceeded (100)` or `Maximum transform depth exceeded
(100)`, every flat chain is linear, and the slowest case is a 50 000-deep
member chain at ~130ms through all seven stages. The five fixes hold and the
property is genuinely met.

So this is a regression net rather than a discovery. The value is that the
sixth shape someone invents has somewhere to go, and that a new recursive walk
in `src/` is caught by a test instead of by a report. That is worth having —
but it is a different kind of value from the previous items, and the write-up
should not pretend otherwise.

## Seen red, twice

A net nobody has watched catch something is not a net.

| disabled | result |
|---|---|
| the iterative `pathOf`/`collectNonNullPaths` (1.2.4) | **6 failures** — `member chain` overflows in typecheck, transform and all four compilers |
| the parser's `checkDepth` (1.1.0) | **98 failures** across 12 shapes — parens, list, object, lambda, call, if, exponentiation, not, prefix, nested let, nested guard, mixed |

The second number is the useful one: twelve distinct constructs rely on that
one guard, and before 1.1.0 four of them had no guard at all. A single
`if (false &&)` in `checkDepth` turns 98 assertions red, which is roughly the
blast radius of the original bug.

## One thing the probe corrected

I recorded the Y-combinator as "compiles" at first, because
`transform(parse(src))` does not throw on it. It is refused — but by the
**emitter** (`Unknown function x(Any)`), not by the transform, and on SQL for a
different reason again (no lambdas). So the refusal has to be asserted per
target rather than once, which is what the test does. Had I trusted the first
probe I would have filed a bug that does not exist.

## Scope notes

- Shapes that *widen* rather than deepen are included — wide object, wide list,
  long string, many comments. Not a recursion risk, but free to ask, and
  allocation is the neighbouring class.
- `parser-termination.unit.test.ts` stays: it is the timing half for the 1.1.1
  shape specifically, with a tighter budget on fewer shapes. This file is the
  breadth.
- The budget here is 5s and deliberately loose. It exists to catch a *hang* —
  the 1.1.1 bug was superlinear within an allowed depth, which no depth guard
  sees — not to police milliseconds.

## State

Unit 2308, integration 4223. No `src/` change.

## 0244 after this

Every item with a bug record behind it is now done: three grammar gates,
dispatch coverage, the force-dynamic axis, the bounded-primitive table, the
helper region, hostile shapes.

What remains is speculative: H3 (hostile values), H0-inside-`compile()`, H5
(lying inputs), the SQL gate, the branded `Code` type.

My ranking of those has changed over the course of the work, and the reason is
this task. H3 was item 3 in the original plan and I would now put it last: the
grammar gates cover the sink side of §1.1 *structurally*, so a hostile-value
corpus would mostly re-test what a closed allowlist already refuses — and H4
has just demonstrated what it looks like to build a corpus for a class that is
already closed. Of the remainder, **H5** has the most left in it, because §1.4
(a declared type is a promise, not a check) is the one class where nothing
machine-checks the property rather than the shape.
