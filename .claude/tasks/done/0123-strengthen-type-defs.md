## Problem to solve

1. `Null` should be a selector, that only accepts `null`
2. But we should not accept all of them. For instance the following program
   compiles while it should not :

```elo
let
   X = Int|Foo
in
   'true' |> X
```

It fails at runtime with `_p_Foo is not defined`. It should fail at compile
time with `Unknown type selector Foo`

But warn that if I do this, it should obviously work (and return true):


```elo
let
  Foo = Bool,
  X = Int|Foo
in
  'true' |> X
```
