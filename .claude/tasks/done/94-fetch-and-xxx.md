## Problem to solve

We can easily extract a value from a data structure with `fetch`.
It should be as easy to set/replace a value somewhere in that datastructure
with a datapath and a replacement value.

## Idea

- Find a name for that function (`set` or find something better)
- Provide an implementation/compilation such that whatever the path, the
  value is set, creating necessary tuples/list in the structure (and only
  failing if a conflict occurs)

## Example

```elo
assert({} |> set(.foo.0.bar, 12) == { foo: [{ bar: 12 }] })
```

```elo
assertFails([] |> set(.foo.0.bar, 12))
```

## Todo

- Find a name
- Implement
- Complete Learn (?) / Reference (?) / Stdlib (!)
- If you modify examples on website, maintain tracking unit/acceptance tests
  accordingly
- If you modify the table of contents on the website, make sure burger menu is
  kept in sync
