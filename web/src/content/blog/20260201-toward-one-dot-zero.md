---
title: "Toward 1.0: Summary Functions, Intervals, and Polish"
date: 2026-02-01
author: "Bernard Lambeau & Claude"
lead: "Three releases in a week bring Elo closer to replacing LiveScript in Klaro Cards, with summary functions, date boundaries, intervals, and important bug fixes."
---
With Python support shipped and four compilation targets humming, the question
becomes: what does Elo still need before it can replace LiveScript inside Klaro
Cards? The answer, it turns out, is a lot of small, practical things. This week
we knocked out three releases worth of them.

## The Klaro Cards horizon

Klaro Cards relies heavily on data summarization — counting records, summing
amounts, averaging scores, finding extremes, grouping by date periods. These
operations are currently written in LiveScript. For Elo to take over, it needs
to express the same computations, portably across JS, Ruby, Python, and SQL.

That's what 0.9.8 through 0.9.10 (and the current unreleased batch) are about:
filling the gaps methodically rather than chasing new language features.

## What landed

### Bug fixes and community contributions (0.9.8)

Before adding anything new, we fixed what was broken. A precedence bug in the
alternative operator (`|`) was generating incorrect JavaScript and Python when
combined with other operators. We also fixed `let` bindings to accept pipe
expressions without requiring parentheses — a small ergonomic win that removes
friction from real code.

This release also included contributions from
[cyberpsychoz](https://github.com/cyberpsychoz): Python compiler unit tests
and Windows compatibility fixes for test scripts. Open-source contributions to
a young language always feel like a milestone.

### Date boundaries and min/max (0.9.9–0.9.10)

Klaro Cards dashboards need to filter and bucket data by time periods. We added
`startOfDay`, `endOfDay`, `startOfWeek`, `endOfWeek`, `startOfMonth`,
`endOfMonth`, `startOfQuarter`, `endOfQuarter`, `startOfYear`, and `endOfYear`
— all working on both `Date` and `DateTime` values across all four targets.

We also added `min(list)` and `max(list)`, which return `null` on empty lists
rather than crashing. This matches the SQL convention and makes them safe to use
in aggregation pipelines.

### Intervals

A new `Interval` type was introduced, created via the `..` selector syntax and
exposing `.start` and `.end` accessors. This is a building block for range
queries and date filtering — common operations in Klaro Cards views.

### Summary functions

This is the big batch. We added a family of functions designed for data
summarization:

- **`count(list)`** — alias for `length`, but reads better in aggregation contexts
- **`sum(list)`** and **`sum(list, initial)`** — numeric summation with an optional initial value for type-aware addition
- **`avg(list)`** — arithmetic mean, returning `null` on empty lists
- **`firstBy(list, fn)`** and **`lastBy(list, fn)`** — find the first/last element according to an ordering function or data path

All of these compile to idiomatic code in JavaScript, Ruby, and Python (SQL
support varies by function). Together with the existing `min`, `max`, `map`,
`filter`, and `select`, Elo can now express most of the summarization patterns
we need.

## What's next

We're not rushing to 1.0. Each release is a step toward the point where we can
rewrite Klaro Cards' LiveScript expressions in Elo and get the same results in
the browser, on the server, and in the database. The standard library is the
main frontier now — more functions, more type coverage, more targets.

When the Klaro Cards migration is done without compromises, that's 1.0.

[Try Elo](/try) or check the [Changelog](https://github.com/enspirit/elo/blob/main/CHANGELOG.md) for details.
