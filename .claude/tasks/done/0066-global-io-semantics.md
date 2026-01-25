## Problem to solve

Where does data come from ? Currently Elo has no access to any kind of input
that is not written in the program itself. That makes its usage very limited.

We need to add a simple data input/output semantics.

## Idea

- Every Elo program has access to an input called `_`
- And the implementation has access to side effects data tracking `$` (for
  error messages to be tracked by `|`, for instance)
- An Elo program is always a function that takes `_` and `$` as parameters
  and returns a single result (the evaluation of the program itself).

### Example

The following program :

``elo
\_.budget \* 1.21

````

would be valid, and would then generate something like :

```javascript
(function(_, $){
  // implementation here
})
````

- The compiler API approach would simply return that function (it already does
  something similar, I guess)
- By default `eloc` would keep generating an invocation of that function,
  using stdin's input string as \_.
- An option of `eloc` could skip the invocation.
- The left part of the Try/Playground section would be split vertically to
  accept an input at bottom (typically a json file)

What do you think ?
