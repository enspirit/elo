## Problem to solve

We do have a few language constructs where commas are used : let, tuples, lists,
constraints (in constrained types and guards), tuple type defs.

Allowing the last item to be followed by a trailing comma is often more
friendly.

## Idea

Let's maybe try to allow these:

```elo
Arrays: [1, 2, 3,]
Tuples: { name: 'Bernard', age: 45, }
Type defs: { name: String, age: Int, }
lets: let x=2, y=3, in x*y
guards: guard age > 0, length(name) > 0, in age
pipe guards: 12 |> guard( i | i>0, i<0, ) |> double
```

Let's only add those that won't make it a parsing hell, ask /grammarian if needed.
