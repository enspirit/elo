## Problem to solve

This works:

```elo
map([1,2,3], fn(x ~> x * 2))
```

This too:

```
[1,2,3] |> map(fn(x ~> x * 2))
```

But it would be nicer to have this synactic sugar :

```
[1,2,3] |> map(x ~> x * 2)
```

Would be very handy for predicates too, because it would make this natural:

```
Int(i | i > 0 )
```

which already exists in Finitio.

## Idea

Analyze whether it's easy to support in our parser, and not too risky.
