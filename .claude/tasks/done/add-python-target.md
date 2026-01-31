# Add Python as a target language

## Summary

Add Python as a fourth compilation target alongside JavaScript, Ruby, and PostgreSQL SQL.

## Key design decisions

- **Wrapper**: `(lambda _: CODE)(None)` — mirrors Ruby's lambda pattern
- **Oneliners**: All Elo constructs can be expressed as Python expressions:
  - Ternary: `x if cond else y`
  - Let-bindings: walrus operator `(x := val, body)[-1]` (requires Python 3.8+)
  - Lambdas: `lambda x: expr`
  - Functional: `list(map(fn, arr))`, `list(filter(fn, arr))`, `functools.reduce(fn, arr, init)`
  - Null-coalescing: `a if a is not None else b`
- **`raise` as expression**: Use prelude helper `def kFail(msg): raise Exception(msg)` — callable inline
- **Output readability**: Will be less idiomatic than JS/Ruby but correct and executable

## Steps

1. Create `src/compilers/python.ts` and `src/bindings/python.ts` following existing patterns
2. Add Python runtime helpers/prelude
3. Update CLI to support `-t python`
4. Create all `.expected.py` fixture files
5. Create `test/acceptance/test-py.sh`
6. Add integration tests for Python compilation
7. Document in README and website
8. Run all tests
