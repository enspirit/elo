# Changelog

All notable changes to Elo are documented in this file.

## [Unreleased]

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
