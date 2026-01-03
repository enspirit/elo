## Problem to solve

An example you recently added makes sense...

```elo
upper(_.name) + ' is ' + String(_.age)
```

... except that it does not compile (`Unknown function String(Any)`).

The reason is, we have no String selector.

## Idea

Let's add it. We should have `String(Any) -> String` working fine in all three
languages. It's a type selector like any other.
