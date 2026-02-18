# fetch with string key

## Decision

Unify path representations so these are all equivalent:
- `fetch({x:12}, .x)` - path literal
- `fetch({x:12}, 'x')` - string as single segment
- `fetch({x:12}, ['x'])` - array as path segments

## Breaking change

The old `fetch(any, array)` behavior (array of paths → array of values) is removed.
Previously: `fetch({a:1, b:2}, [.a, .b])` returned `[1, 2]`
This use case can be replaced with: `[fetch(obj, .a), fetch(obj, .b)]`

## Implementation (DONE)

1. Added `fetch(any, string)` signature in all bindings (JS, Ruby, SQL, Python)
2. Changed `fetch(any, array)` to treat array as path segments
3. Updated Ruby fetch lambda to convert string segments to symbols for hash access
4. Removed kFetchArray helper (no longer needed)
5. Updated fixtures and documentation
6. All tests pass
