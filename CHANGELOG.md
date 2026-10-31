# Changelog

All notable changes to Elo are documented in this file.

## [Unreleased]

## [1.0.2] - 2026-10-31

### Fixes

Eight defects that produced a wrong value rather than an error, all found by
running the same program in several targets and comparing.

- Fix Python dropping parentheses when an operand's type is not statically known: `12 * (x + y)` compiled to `12 * x + y` whenever an operand was a lambda parameter, a member access, or anything else typed `any`
- Fix Python unary operators losing their operand's grouping: `-(a + b)` compiled to `-a + b`, even for integer literals
- Keep float literals afloat: `1.0` compiled to `1`, since `1.0` and `1` are the same JavaScript number and the decimal point was lost at parse time
- Fix `/` truncating in the Ruby target: Ruby truncates `Integer / Integer`, where Elo's `/` is real division
- Fix type selectors losing their operand's grouping: `Float(10 - 8) / 4` evaluated to 0.5 in no target — Ruby emitted `10 - 8.to_f / 4`, JavaScript `10 - 8 / 4`
- Make `round` agree on half-way values across all four targets: halves now round away from zero everywhere
- Fix `elo -e` and `eloc -e` dropping a multi-line expression whose first line is a comment — it printed nothing and exited 0

**Warning**: the four fixes above that concern arithmetic change results that
were previously wrong. `7 / 2` was 3 in Ruby and is now 3.5; `round(2.5)` was
2 in Python and is now 3; `round(-2.5)` was -2 in JavaScript and is now -3;
`1.0 / 4` was 0 in Ruby and is now 0.25. Code that compensated for any of
these needs revisiting.

### Language

- Let bindings no longer consume nesting depth. `let a = …, b = …` was desugared into nested single-binding lets, so each binding cost one level and the transform depth guard — intended for deeply nested expressions — capped a program at 100 bindings. The guard is unchanged for genuine nesting.

### Standard Library

- Add `round(x, n)` to round to `n` decimal places, with the same half-away-from-zero rule
- Add the two-argument `min(a, b)` and `max(a, b)` alongside the list forms, so that `max(min(x, hi), lo)` no longer builds lists to compare two numbers

## [1.0.1] - 2026-04-20

### Security
- Fix Ruby interpolation injection vulnerability in string literals and subtype-constraint labels — reported by Atsushi Sada
- Validate identifier and numeric-literal IR nodes in all compilers to prevent AST-API injection attacks — reported by Atsushi Sada
- Forbid member access on `constructor`, `__proto__`, `prototype`, and other meta-properties to prevent JavaScript sandbox escape via the `Function` constructor chain — reported by Atsushi Sada
- Fix constraint/guard label escaping in JS and Ruby emitters: switch to JSON-style (JS) and double-quoted-with-`#`-escape (Ruby) so backslash-terminated labels no longer break out of the string literal
- Extend the meta-property denylist to `fetch()` datapath segments and string keys, closing a runtime bypass of the member-access guard

## [1.0.0] - 2026-03-25

### Language
- Add `Date` as a built-in type selector for data schemas (e.g., `let Event = { date: Date } in data |> Event`)
- Add `extract()` for mustache-style text extraction (e.g., `extract('Hello Alice', 'Hello {{name}}')`)

### Standard Library
- Add `isNotNull(value)` function as inverse of `isNull()`

### Fixes
- Fix CodeMirror duplicate instance error in website build

## [0.9.14] - 2026-02-19

### Fixes
- Fix `min` and `max` on DateTime arrays in JavaScript: preserve DateTime type instead of converting to Int

## [0.9.13] - 2026-02-18

### Fixes
- Fix `Int()` conversion on alternative expressions with any-typed first value (e.g., `Int(tuple.x|0)` now correctly converts string values)
- Unify `fetch` path semantics: `fetch(data, 'key')` now works as single-segment path, and `fetch(data, ['a', 'b'])` traverses `data.a.b` consistently with `fetch(data, .a.b)`.
  **Warning**: code using `fetch(data, [.a, .b])` to extract multiple values into an array will break; use `[fetch(data, .a), fetch(data, .b)]` instead.

## [0.9.12] - 2026-02-04

### Standard Library
- Add `union(Interval, Interval)` and `intersection(Interval, Interval)` arithmetic functions
- Add `Duration(Interval)` conversion function

### Security
- Restrict member access and method calls to data types only, preventing exposure of runtime internals

### Website
- Indent stdlib subsections in mobile menu for better readability

## [0.9.11] - 2026-02-04

### Language Features
- Add `Interval` type with selector and `start`/`end` accessors

### Standard Library
- Add `count(List)` summary function (alias for `length`)
- Add `sum(List)` and `sum(List, initial)` summary functions
- Add `avg(List)` summary function (returns `null` on empty lists)
- Add `contains`, `find`, `sort`, `sortBy`, `unique`, `flat` List functions
- Add `reverse`, `trimStart`, `trimEnd`, `isBlank` String functions

## [0.9.10] - 2026-01-31

### Standard Library
- Add `min` and `max` functions for lists (returns `null` on empty lists)
- Add `startOfDay`, `endOfDay`, `startOfWeek`, `endOfWeek`, `startOfMonth`, `endOfMonth`, `startOfQuarter`, `endOfQuarter`, `startOfYear`, `endOfYear` for Date and DateTime values

### Fixes
- Fix SQL `endOf` period boundaries: use second-level precision instead of day-level
- Fix Ruby `startOf`/`endOf` on Date inputs to return DateTime consistently

## [0.9.9] - 2026-01-31

### Language Features
- Allow pipe operator (`|>`) in `let` binding values without requiring parentheses

### Fixes
- Fix operator precedence bug in alternative expressions for JavaScript and Python compilers

## [0.9.8] - 2026-01-31

### Testing
- Add Python compiler unit tests — contributed by [cyberpsychoz](https://github.com/cyberpsychoz)
- Fix Windows compatibility in test scripts — contributed by [cyberpsychoz](https://github.com/cyberpsychoz)

## [0.9.7] - 2026-01-27

### Security
- Fix code injection vulnerability in date/datetime/duration literal emitters (all targets) — reported by [naoyashiga](https://github.com/naoyashiga)

## [0.9.6] - 2026-01-27

### Language Features
- Allow trailing commas in lists, tuples, function arguments, and type definitions

### Fixes
- Fix blog post examples and add validation tests
- Show error output when acceptance tests fail

### Testing
- Unify website example tests with full evaluation

## [0.9.5] - 2026-01-03

### Language Features
- Add guard and check expressions for runtime validation
- Add labeled subtype constraints (Finitio-style) with better error messages
- Add polymorphic fetch for extracting multiple paths into tuples or lists

### Playground
- Add fetch-to-tuple and fetch-to-list examples
- Reorganize examples dropdown to match Reference structure

### Documentation
- Document guards on home page, Try, and Learn sections
- Add blog post about guards, checks, and polymorphic fetch

### Fixes
- Fix Ruby syntax error in labeled constraint error messages

## [0.9.4] - 2026-01-03

### Language Features
- Add Null type selector for null checking in type definitions
- Add String selector for converting values to strings
- Validate type references at compile time

### Tools
- Add CSV input/output format support with pluggable adapter architecture

### Playground
- Add JSON output toggle
- Display output as Elo code instead of raw JSON
- Add input data support to clickable examples
- Improve UX for examples with input data
- Refactor layout with vertical flow

### Website
- Fix link visibility in dark mode
- Redesign home page with "What Makes Elo Different" section
- Refactor CSS into modular design system architecture

### Documentation
- Reorganize Reference documentation structure
- Clarify DataPath as syntax sugar over List
- Improve contributor documentation

## [0.9.3] - 2025-12-28

- Add Get Started section and button on website
- Fix compile API to return raw function without auto-executing
- Add blog post announcing Elo 0.9.x

## [0.9.2] - 2025-12-28

- Add `--version` flag to `elo` and `eloc` CLIs
- Add `elo` binary to npm package

## [0.9.1] - 2025-12-28

First published npm release.

### Language Features
- Expression language compiling to JavaScript, Ruby, and PostgreSQL SQL
- Data types: Number, String, Boolean, Date, Datetime, Duration, List, Tuple, Null
- Operators: arithmetic, comparison, logical, pipe, alternative
- Control flow: if/then/else, let bindings
- Functions: lambdas, closures, single-param sugar syntax
- Type definitions (Finitio-like) with constraints

### Standard Library
- String manipulation (15+ functions)
- Numeric operations
- Temporal functions and keywords (NOW, TODAY, SOD, EOD, etc.)
- List operations (map, filter, reduce, any, all, etc.)
- Data path navigation and patching

### Tools
- `eloc` compiler CLI with multiple output formats
- `elo` evaluator CLI for quick expression testing
- `compile()` API for JavaScript integration
- Try Elo web playground

### Documentation
- Comprehensive Learn section for beginners
- Language reference
- Stdlib browser with search
- Interactive exercises
