## Problem to solve

Add `null` as a first-class literal in Elo to support JSON input processing.

## Current state

- `NoVal` type exists for null values from external sources
- `isVal()` and `orVal()` functions exist for null handling
- No way to write `null` in Elo code

## Implementation

1. Parser: add `null` keyword
2. AST: add Null node (or reuse existing pattern)
3. Type: use existing `NoVal` type
4. IR: handle null literal
5. Compilers:
   - JavaScript: `null`
   - Ruby: `nil`
   - SQL: `NULL`
6. Tests: unit, integration, acceptance
7. Documentation: README, website

## Examples

```elo
null
isVal(null)           // false
orVal(null, 'default') // 'default'
if isVal(x) then x else null
```
