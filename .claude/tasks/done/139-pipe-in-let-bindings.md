## Problem to solve

`let test = 'hello' |> upcase in test` was not parsing because let binding
values were parsed at `logical_or` level, while pipe (`|>`) sits above it
in the grammar.

## Solution

Changed let binding value parsing from `logical_or()` to `pipe()` in both
`letExpr()` and `parseLetBindingsAfterComma()`. This is safe because `|>`
requires a `PIPE_OP` token followed by an identifier, which cannot conflict
with `in`, `guard`, `check`, or `,` delimiters that terminate bindings.

## Changes

- `src/parser.ts`: binding values now parsed at `pipe()` level
- `test/unit/parser.unit.test.ts`: added tests for pipe in let binding values
- `test/fixtures/reference/pipe.elo` + expected files: acceptance tests
