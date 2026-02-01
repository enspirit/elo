# List stdlib revisited & completed

The List stdlib page has been reorganized into subsections by user intent:

- **Arithmetic** (`+`) — "I need to combine lists."
- **Element Access** (`at`, `first`, `last`, `firstBy`, `lastBy`) — "I need to get a specific element."
- **Predicates** (`isEmpty`, `any`, `all`) — "I need to check something about a list."
- **Transform** (`map`, `filter`, `reverse`) — "I need to reshape my list."
- **Summary** (`join`, `length`, `count`, `sum`, `avg`, `min`, `max`, `reduce`) — "I need a single aggregate value from a list."

## TODO

- [x] Reorganize List stdlib page into subsections
- [ ] Add `contains(List, element) → Bool` — predicate, check if element is in list
- [ ] Add `find(List, predicate) → Any | Null` — element access, first element matching condition
- [ ] Add `sort(List) → List` — transform, sort elements in natural order
- [ ] Add `sortBy(List, fn|DataPath) → List` — transform, sort by derived value
