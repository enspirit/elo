## Problem to solve

Nested function calls in infix notation can quickly become a mess. For instance,

```
restrict(
  extend(suppliers, { x: 12 }),
  ( t | t.city == 'London' )
)
```

## Idea

How about supporting elixir's `|>` pipe syntax, as syntactic sugar ?

```
suppliers |> extend({x: 12}) |> restrict((t | t.city == 'London' ))
```
