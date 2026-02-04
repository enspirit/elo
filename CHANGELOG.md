# Changelog

## 0.10.1

### Synced from upstream (enspirit/elo)

- Add String stdlib functions: `reverse`, `trimStart`, `trimEnd`, `isBlank`
- Add Array/List stdlib functions: `count`, `contains`, `sort`, `min`, `max`, `sum`, `avg`, `find`, `sortBy`, `unique`, `flat`
- Add Duration unit conversion functions: `inYears`, `inQuarters`, `inMonths`, `inWeeks`, `inDays`, `inHours`, `inMinutes`, `inSeconds`
- Add Interval type with `Interval()` constructor and `start`/`end` accessors
- Add camelCase period boundary aliases: `startOfDay`, `endOfDay`, `startOfWeek`, etc.
- Security fix: Use double quotes in `bot` and `eot` datetime literals

## 0.10.0

### Minor Changes

- feat(elo)!: fork Elo runtime for JS-only portable plugins
  - Remove Ruby/SQL compilation targets
  - Add plugin-program parser with plan/then syntax
  - Add `do` AST node for capability calls
  - Implement Strategy-1 planner/runtime driver
  - Add `compilePlugin()`, `parseWithMeta()`, `compileFromAst()`, `compileExpression()`
  - Add JSON boundary utilities (`isJsonValue`, `assertJsonValue`)
  - Add golden tests for parsing, diagnostics, and planning

All notable changes to Elo are documented in this file.

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
