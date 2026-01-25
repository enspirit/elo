## Problem to solve

I'd like to offer a very simply way of selecting a value within an object
structure, without entering null nightmare with expresions like `x?.y?.z`
which are ugly.

## Idea

Let's brainstorm about having a `fetch` stdlib function that would take
an object and jsonpath-like literal.

- Shall we use jsonpath ?
- A simplification like $.x.1.y.z ?
- Something closer to ruby's `dig` ?

## Brainstorming notes

Three options explored:

1. **dig-style (variadic)**: `fetch(obj, 'x', 'y', 'z')`
2. **Path string**: `fetch(obj, 'x.y.z')`
3. **Path literal**: `fetch(obj, $.x.y.z)` ← preferred direction

Option 3 would require a new literal type in the grammar but feels most
native to the language. Deferred for later implementation.
