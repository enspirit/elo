# Changelog

All notable changes to Elo are documented in this file.

## [Unreleased]

## [1.0.3] - 2026-11-01

A conservative patch release: one security fix and one portability fix, no new
features and no behaviour changes, so projects pinned below 1.1.0 can take the
safety fix. The same two fixes ship in 1.1.1.

### Security

- Stop the parser going exponential on nested `let`, `guard` and `check`
  bindings, closing a compile-host denial of service. A 390-character
  expression such as `let a = 1 in` repeated 30 times never finished parsing;
  20 levels took a second, and each further pair of levels quadrupled it. The
  cause was the `in` keyword being overloaded between a binding and range
  membership (`x in 1..10`), told apart by a speculative parse that re-parsed
  the whole remaining expression at every level. The speculation is now skipped
  where it could never have succeeded. Parsing accepts and rejects exactly what
  it did before — verified by comparing both parsers over 1372 expressions —
  and 40 levels of nesting now parse in milliseconds

### Fixes

- Guard `process.env` access so the runtime loads in a browser, where it is
  undefined

## [1.0.2] - 2026-10-31

A conservative patch release: security and correctness fixes only, no new
features, so projects pinned below 1.1.0 can still take the safety fixes.

### Security
- Bound parser recursion depth on every self-recursive descent (prefix operators, exponentiation, guard sugar, type definitions), closing a stack-overflow denial of service — reported by uaaw
- Count type-expression nesting against the depth guard in both the parser and the transform, closing a stack-overflow denial of service — reported by Atsushi Sada
- Reject applying a value not known to be a function, closing a Y-combinator non-termination denial of service — reported by Atsushi Sada
- Validate identifier-shaped type-node fields (subtype-constraint variable, schema keys, type names) in every compiler, closing an AST-API injection gap left open after the 1.0.1 fix — reported by Atsushi Sada
- Enforce the meta-property denylist inside the `fetch()` runtime helper, closing a prototype-chain bypass via variable, array, or concatenated keys — reported by uaaw
- Reject array multiplication (`[1] * n`), closing an unbounded-allocation denial of service — reported by Atsushi Sada
- Enforce the meta-property denylist inside `patch()` as well as `fetch()`
- Bound string repetition (`'a' * n`) and padding (`padStart`/`padEnd`) to a configurable maximum length (`ELO_MAX_STRING_LENGTH`, default 10,000,000), closing an unbounded-allocation denial of service

### Fixes
- Make `/` real division in the Ruby target
- Round half-way values away from zero consistently in every target, including SQL double precision
- Fix Python parenthesisation that dropped operator precedence
- Keep float literals from collapsing to integers
- Keep a type selector's operand grouped
- Stop spending expression depth on the number of `let` bindings
- Stop dropping a `-e` expression that opens with a comment
- Group the nullish fallback of `at()` and `first()`
- Emit parseable JavaScript for a method call on an integer
- Compile `replace()`/`replaceAll()` to literal replacement instead of a regular expression on PostgreSQL, matching the JavaScript, Ruby, and Python targets and removing a ReDoS surface

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
