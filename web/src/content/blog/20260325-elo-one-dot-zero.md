---
title: "Elo 1.0: Now Powering Klaro Cards"
date: 2026-03-25
author: "Bernard Lambeau & Claude"
lead: "Three months, 14 releases, 150 spec-driven iterations. Elo is now the expression engine behind Klaro Cards."
---
Back in February, I wrote that [1.0 would come when the Klaro Cards migration
was done without compromises](/blog/20260201-toward-one-dot-zero). That day is
today.

[Klaro Cards](https://klaro.cards) now uses Elo's TypeScript API to compile and
evaluate user expressions — computed fields, date filters, data transformations.
The old LiveScript code is gone. Ruby, Python, and SQL compilation targets are
ready for when Klaro Cards needs server-side or database evaluation, but for now
the JavaScript target does the heavy lifting in the browser.

That's what 1.0 means: Elo is in production, and we commit to not breaking
user expressions until 2.0. The language surface is stable. If you write an Elo
expression today, it will keep working.

## What happened since 0.9.x

The 0.9 series was about building foundations. The road from 0.9.1 to 1.0 was
about filling every gap that real usage exposed. Here's the condensed tour.

### A fourth target: Python

Elo started with JavaScript, Ruby, and SQL. [Python joined in
January](/blog/20260127-python-support), bringing the target count to four.
Every language feature — dates, durations, lambdas, data schemas, guards — works
identically across all targets.

### Summary functions and date boundaries

Klaro Cards dashboards need to count, sum, average, and bucket data by time
periods. We added `count`, `sum`, `avg`, `min`, `max` for lists, plus
`startOfDay`, `endOfDay`, `startOfWeek` ... `endOfYear` for dates and
datetimes. These were the missing pieces for replacing LiveScript aggregations.

### Intervals

A new `Interval` type with `..` syntax and `start`/`end` accessors, plus
`union`, `intersection`, and `Duration` conversion. Essential for range queries
in Klaro Cards views.

### Richer standard library

The stdlib grew substantially: `contains`, `find`, `sort`, `sortBy`, `unique`,
`flat` for lists. `reverse`, `trimStart`, `trimEnd`, `isBlank` for strings.
`extract` for mustache-style text extraction. `isNotNull` as the inverse of
`isNull`. `Date` as a type selector. Each function works identically across all
four targets.

### Guards and data schemas

Guard expressions (`guard ... ensure ... else`) and labeled subtype constraints
give Elo runtime validation with clear error messages — exactly what a No-Code
platform needs to validate user input safely.

### Security hardening

A code injection vulnerability in temporal literal emitters was
[reported and fixed](/blog/20260127-trailing-commas-and-security). Member access
was restricted to data types only, closing a path to runtime internals. Elo is
designed to run untrusted expressions, and we take that seriously.

## Still an AI collaboration

Claude wrote every line of code in this project. I wrote every prompt.

That hasn't changed since [day one](/blog/20241225-building-elo-with-claude).
What has changed is my confidence in the method. 150 task files, each with a
clear spec, each producing a commit that passes unit, integration, and
acceptance tests across four runtimes. The AI proposes, the tests dispose, and
I steer.

I remain the designer: I decide what goes in, what stays out, and how things
should work. Claude is a remarkably productive implementer, but the language
reflects my opinions about simplicity, portability, and safety — not emergent
behavior from a model. When I say "no" to a feature because it would compromise
one of those principles, that's the end of it.

Is the code perfect? Certainly not. But 1149 tests across four runtimes, plus
months of production use in Klaro Cards, give me reasonable confidence that it's
correct where it matters.

## What's next

1.0 doesn't mean we stop. It means the foundation is solid enough to build on.
On my radar:

- **Static type checking** — an opt-in `--typecheck` flag for catching type
  errors at compile time.
- **Better error messages** — the parser still has rough edges for newcomers.
- **More stdlib coverage** — driven by what Klaro Cards users actually need.

Elo stays small on purpose. Every feature must justify itself against the four
design principles: simple, well-designed, portable, safe — in that order.

[Try Elo](/try), read the [Reference](/reference), or check the
[full Changelog](https://github.com/enspirit/elo/blob/main/CHANGELOG.md).

If you use Elo or have feedback, [open an issue](https://github.com/enspirit/elo/issues)
— or better yet, [try Klaro Cards](https://klaro.cards) and see Elo in action.
