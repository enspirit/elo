## Problem to solve

On the Security page, we say that Elo is safe to use, and that it does not
have access to JS/Ruby globals in particular.

Excepts it's not 100% true so far. For instance `window` is available when
I try Elo in a browser. I suspect other examples exist.

## Idea

- How can we make sure that JS/Ruby globals are actually out of reach ?
- Can we improve compilation to do so ?
- Or should we put the responsibility on the runtime, and if yes how ?

## Solution Implemented

Static analysis at compile time to reject undefined variables:

1. In `transform.ts`, added a check that rejects variables not in scope
2. The only allowed variables are:
   - `_` (the input variable, always available)
   - Variables bound via `let` expressions
   - Lambda parameters
   - Type definition names
3. For SQL compilation, undefined variables are allowed since they represent
   database column names (not program globals)

### Key changes:

- `src/transform.ts`: Added undefined variable check with `allowUndefinedVariables` option
- `src/compilers/sql.ts`: Uses `allowUndefinedVariables: true` since column names are valid
- Updated test fixtures to use `_.x` instead of bare `x` for external data access
- Added unit tests for undefined variable rejection

### Result:

```
$ ./bin/eloc -e "window" -t js
Compilation error: Error: Line 1: Error: Undefined variable: 'window'

$ ./bin/eloc -e "_.x + 1" -t js
(function(_) { ... kAdd(_.x, 1); })
```
