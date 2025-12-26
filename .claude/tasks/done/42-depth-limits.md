## Problem to solve

The parser and transform phases use recursive descent without depth limits.
A deeply nested expression could cause stack overflow (DoS).

## Attack vector

```bash
# Deeply nested parentheses
eloc -e "$(python -c 'print("(" * 10000 + "1" + ")" * 10000)')"
# Result: RangeError: Maximum call stack size exceeded
```

## Proposed fix

1. Add `maxDepth` option to parser (default: 1000)
2. Track current depth in recursive parsing functions
3. Throw descriptive error when depth exceeded
4. Similarly add depth tracking to `transform()` function

## Files affected

- `src/parser.ts` - add depth tracking
- `src/transform.ts` - add depth tracking
- `src/cli.ts` - optionally expose maxDepth option
