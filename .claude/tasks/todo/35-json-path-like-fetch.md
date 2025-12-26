## Problem to solve

I'd like to offer a very simply way of selecting a value within an object
structure, without entering null nightmare with expresions like `x?.y?.z`
which are ugly.

## Idea

Let's brainstorm about having a `fetch` stdlib function that would take
an object and jsonpath-like literal.

* Shall we use jsonpath ?
* A simplification like $.x.1.y.z ?
* Something closer to ruby's `dig` ?
