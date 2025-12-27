## Problem to solve

The following example fails :

```elo
let person = {
  name: 'Alice',
  age: 30,
  city: 'Brussels',
  hobbies: ['programming', 'AI']
} in person.hobbies |> map(fn(x ~> upper(x)))
```

Error: Unknown function map(Any, Fn)

## Idea

I think it's simply because map/filter/fold are not registered in typedefs.
