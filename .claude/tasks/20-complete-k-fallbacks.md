## Problem to solve

The following K code does compile properly, but shows that kMul implementation
is not complete:

```k
let x = fn( y | P1D ) in x() * 2
```

Indeed, the evauation gives `172800000` instead of `P2D`. We need to fix it.

## Idea

Complete the kXXX fallback methods to support our type system. Your kAdd is
a good start IMO.
