## Problem to solve

I want to avoid javascript ulgy syntaxes like `x?.y?.z`. But I want to allow
the user to make a selection in a data structure (e.g. json data).

## Idea

- Introduce a `DataPath` type and literal `.x.y.z`, very much inspired by jsonpath.
- A data path could have list indexes, e.g. `.x.0.y.3`
- A `fetch(x: Any, path: DataPath) ~> Any|Null` would allow making the selection
  and returning `null` as soon as an path item is not found.

## Example

```elo
let person = { ... } in fetch(person, .hobbies.0.name)
```

```elo
let person = { ... } in person |> fetch(.hobbies.0.name)
```

## Todo

- Check that the syntax is not dangerous (/grammarian)
- Introduce the language construct with unit tests (parser, IR, etc.)
- Implement compilation under acceptance tests
- Document in README, Learn, Reference and Stdlib
