## Problem to solve

`(_.x|0) - (_.y|0)` on `{ "x": 100, "y": 40 }` returned 100 instead of 60.

The JS compiler emitted `_.x ?? 0 - _.y ?? 0` which, due to `??` having lower
precedence than `-`, evaluated as `_.x ?? (0 - _.y) ?? 0` — short-circuiting
to 100 since `_.x` is not nullish.

Same issue in Python with conditional expressions.

## Solution

Wrapped alternative expressions in parentheses in both the JavaScript and
Python compilers. SQL (COALESCE) and Ruby (lambda) were already safe.

## Changes

- `src/compilers/javascript.ts`: wrap `??` chain in parens
- `src/compilers/python.ts`: wrap ternary chain in parens
- Updated expected fixtures for `reference/alternative` and `stdlib/null-handling`
