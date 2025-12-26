# Claude Development Guide for Elo

This document provides instructions for AI assistants (like Claude) working on the Elo compiler project.

## Project Overview

Elo is a small expression language that compiles to three target languages:
- **Ruby**: Server-side scripting
- **JavaScript**: Client-side execution
- **PostgreSQL SQL**: Database queries

The compiler translates Elo expressions into semantically equivalent code in each target language.

## Design principles

Following the vision, design and implementation choices MUST target a language that stays simple, well-designed,
portable and safe, in that order. We SHOULD always restrict Elo's powerfullness if a wanted feature leads to a
violation of those principles.

## Architecture

Elo currently has the following components :

* A parser (`src/parser.ts`)
* AST types and factory (`src/ast.ts`)
* Type system (`src/types.ts`)
* Intermediate Representation with type inference (`src/ir.ts`, `src/transform.ts`)
* Standard library abstraction for type-based dispatch (`src/stdlib.ts`)
* One compiler per target language (`src/compilers/*.ts`)
* A binary command (`bin/eloc` and `src/cli.ts`)
* A try-elo website to demonstrate Elo (`web/`)

### Compilation Pipeline

1. **Parse**: Source → AST (`parser.ts`)
2. **Transform**: AST → Typed IR (`transform.ts`) - infers types and rewrites operators as function calls
3. **Emit**: IR → Target code (`compilers/*.ts`) - uses `StdLib` for type-based dispatch

## Test-Driven Development

Elo is developped in TDD. We have three levels of testing :

* `npm run test:unit` : checks the behavior of core and utility functions
* `npm run test:integration` : checks expected compilation output from sources
* `npm run test:acceptance` : checks expected semantics against `ruby`, `node` and `psql`

**CRITICAL** : the three levels of tests MUST be maintained ; all tests MUST PASS at all times.

The tests are organized as follows :

* `test/unit/**/*.ts` are unit tests without dependencies
* `test/fixtures/*` are elo expression files and their expected compilation in the target languages
* `test/integration/**/*.ts` check the compiler and cli, using fixtures
* `test/acceptance/**/*.ts` check the actual execution of generated code, using fixtures

## Tasks & agents

The list of tasks can be found in `.claude/tasks/todo` and `.claude/tasks/done`.
Done tasks provide history of my prompts. Todo tasks are the next envisionned
steps.

**CRITICAL**: You can always look the vision ahead in written todo tasks, but we
NEVER implement anything else that the very next step (first todo tasks, by
alphabetic order). Other tasks are informative and may help making future-proof
design decisions. If it leads to unnecessary complexity, we just forget about
them and act as if they were not written at all.
