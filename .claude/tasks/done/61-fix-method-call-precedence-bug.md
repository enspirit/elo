# Fix method call precedence bug in JavaScript compiler

## Problem

When compiling function calls like `upper('a' + 'b')` to JavaScript, the compiler generates:

```javascript
"a" + "b".toUpperCase()
```

Due to JavaScript operator precedence, `.toUpperCase()` binds only to `"b"`, resulting in `"aB"` instead of `"AB"`.

## Expected behavior

The compiler should wrap the expression in parentheses:

```javascript
("a" + "b").toUpperCase()
```

## Affected functions

Any stdlib function that compiles to a method call on a binary expression argument:
- `upper(expr)` → `expr.toUpperCase()`
- `lower(expr)` → `expr.toLowerCase()`
- `trim(expr)` → `expr.trim()`
- And potentially others

## Fix approach

In the JavaScript compiler, when emitting a method call on an expression that is a binary operation, wrap the expression in parentheses.
