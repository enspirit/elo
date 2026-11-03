# Changelog

All notable changes to Elo are documented in this file.

## [Unreleased]

## [1.1.2] - 2026-11-03

A security patch backported from 1.2.0, no behaviour changes. The same fix
ships in the conservative 1.0.4 patch for projects pinned below 1.1.0.

### Security

- Close a sandbox escape in the **JavaScript** target that reached arbitrary
  code execution, reported by Arthur Deierlein (c0rydoras) under coordinated
  disclosure. Chained, the proof of concept was
  `fetch({__proto__: [].map}, [['constructor']])('alert(1)')()`. Two
  independent holes: the `kFetch` runtime denylist compared a path segment
  against the forbidden meta-property names with `===`, which a non-string key
  slips past — `['constructor']` and an object with a `toString` both coerce to
  `"constructor"` only when the property read happens, after the check; and an
  object literal emitted `{__proto__: v}` with the bare key, running the
  `[[Prototype]]` setter rather than defining a data property, so
  `{__proto__: [].map}` produced an object whose prototype was a Function while
  still passing a `typeof 'object'` guard. `kFetch` and `kPatch` now coerce a
  segment to a string before the denylist, and the emitter writes `__proto__`
  as a computed key. Either fix alone closes the chain; both ship. Ruby and
  Python were never affected

## [1.1.1] - 2026-11-01

A patch release: one security fix and one portability fix, no behaviour
changes. The same two fixes ship in the conservative 1.0.3 patch for projects
pinned below 1.1.0.

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

## [1.1.0] - 2026-10-31

### Security

Hardening of the parser, transform, and runtime against denial-of-service and
sandbox-escape vectors, most reported under coordinated disclosure. All of
these also ship in the conservative 1.0.2 patch release.

- Bound parser recursion depth on every self-recursive descent (prefix operators, exponentiation, guard sugar, type definitions), closing a stack-overflow denial of service — reported by uaaw
- Count type-expression nesting against the depth guard in both the parser and the transform, closing a stack-overflow denial of service — reported by Atsushi Sada
- Reject applying a value not known to be a function, closing a Y-combinator non-termination denial of service — reported by Atsushi Sada
- Validate identifier-shaped type-node fields (subtype-constraint variable, schema keys, type names) in every compiler, closing an AST-API injection gap left open after the 1.0.1 fix — reported by Atsushi Sada
- Enforce the meta-property denylist inside the `fetch()` runtime helper, closing a prototype-chain bypass via variable, array, or concatenated keys — reported by uaaw
- Reject array multiplication (`[1] * n`), closing an unbounded-allocation denial of service — reported by Atsushi Sada
- Enforce the meta-property denylist inside `patch()` as well as `fetch()`
- Bound string repetition (`'a' * n`) and padding (`padStart`/`padEnd`) to a configurable maximum length (`ELO_MAX_STRING_LENGTH`, default 10,000,000), closing an unbounded-allocation denial of service
- Document the data contract for the `_` input: Elo operates on plain data, and passing host-language objects can run their own methods on the Ruby and Python targets

### Fixes

Nine defects that produced a wrong value rather than an error. Seven were
found by running the same program in several targets and comparing; the last
two were reported from production by Bricks, where the documented way to read
a key containing a dash was the thing that introduced the defect.

- Fix Python dropping parentheses when an operand's type is not statically known: `12 * (x + y)` compiled to `12 * x + y` whenever an operand was a lambda parameter, a member access, or anything else typed `any`
- Fix Python unary operators losing their operand's grouping: `-(a + b)` compiled to `-a + b`, even for integer literals
- Keep float literals afloat: `1.0` compiled to `1`, since `1.0` and `1` are the same JavaScript number and the decimal point was lost at parse time
- Fix `/` truncating in the Ruby target: Ruby truncates `Integer / Integer`, where Elo's `/` is real division
- Fix type selectors losing their operand's grouping: `Float(10 - 8) / 4` evaluated to 0.5 in no target — Ruby emitted `10 - 8.to_f / 4`, JavaScript `10 - 8 / 4`
- Make `round` agree on half-way values across all four targets: halves now round away from zero everywhere
- Fix `elo -e` and `eloc -e` dropping a multi-line expression whose first line is a comment — it printed nothing and exited 0
- Fix `at()` and `first()` leaking their nullish fallback into the caller in the JavaScript target: `count(first(list))` returned the element instead of its size, and `count(at(obj, 'a-key'))` returned the value — reported from production by Bricks
- Fix string functions emitting unparseable JavaScript on an integer literal: `upper(42)` compiled to `42.toUpperCase()`, where the dot reads as a decimal point
- Fix `replace()`/`replaceAll()` treating the search string as a regular expression on PostgreSQL while every other target matched it literally: `replace('a.b.c', '.', 'X')` now gives `aXb.c` on SQL too, and the ReDoS surface is gone

**Warning**: the four fixes above that concern arithmetic change results that
were previously wrong. `7 / 2` was 3 in Ruby and is now 3.5; `round(2.5)` was
2 in Python and is now 3; `round(-2.5)` was -2 in JavaScript and is now -3;
`1.0 / 4` was 0 in Ruby and is now 0.25. Code that compensated for any of
these needs revisiting.

### Diagnostics

- Distinguish a function name that does not exist from one whose signatures do not match: `concat('a','b','c')` now reports `No signature of concat accepts concat(String, String, String). Known: concat(String, String), concat(Array, Array)` instead of `Unknown function`

### Language

- Let bindings no longer consume nesting depth. `let a = …, b = …` was desugared into nested single-binding lets, so each binding cost one level and the transform depth guard — intended for deeply nested expressions — capped a program at 100 bindings. The guard is unchanged for genuine nesting.

### Standard Library

- Add `round(x, n)` to round to `n` decimal places, with the same half-away-from-zero rule
- Add the two-argument `min(a, b)` and `max(a, b)` alongside the list forms, so that `max(min(x, hi), lo)` no longer builds lists to compare two numbers. They compare rather than coerce, so they reach beyond numbers as the list forms do
- Add `slice(s, start, end)` for extracting a substring by start and (exclusive) end index — the pair to `substring(s, position, length)`
- Add `chr(n)` to write the character for a Unicode code point, so invisible characters such as a non-breaking space need not travel literally in source

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
