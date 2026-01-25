## Problem to solve

At least the solution of the last exercice does not parse.

```elo
let Product = { name: String, price: Int } in
  assert({ name: 'Widget', price: '99' } |> Product == { name: 'Widget', price: 99 })
```

## Idea

- Check the unit test we have that was supposed to check all examples/exercices on
  the website is up to date.
- Complete it if needed
- Fix examples that don't work (or fix parser/compilation to make them pass)
