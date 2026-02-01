## Problem to solve

We do have `fetch(Data, DataPath)`, which is fine. Now, if wants to build a
Tuple or List from input data, it's quickly cumbersome:

```elo
{
  x: fetch(_, .foo.0.bar),
  y: fetch(_, .foo.1.bar),
}
```

```elo
[.foo.0.bar, .foo.1.bar] |> map(p ~> fetch(_, p))
```

## Idea

How about have polymorphic forms for fetch ?

```elo
fetch(_, {
  x: .foo.0.bar,
  y: .foo.1.bar
})
```

```elo
fetch(_, [
  .foo.0.bar,
  .foo.1.bar
])
```
