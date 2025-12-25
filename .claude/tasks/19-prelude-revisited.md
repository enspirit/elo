## Problem to solve

I'm not a super fan of our prelude currently. The prelude is made of two parts:

1. require of necessary libraries (dayjs, active_support, etc.)
2. definition of klang helpers (mostly for js), such as generic `add` method used
   at runtime in case types are not statically known.

I have no problem with the requires (1. above), but I doubt we should keep klang
helpers as global definitions :

- Having them in a global scope is not clean
- We should only generate helpers that are actually necessary by the expression
  compiled

We should rework that, certainly for javascript.

## Idea

Compiling `x + y` currently yields `klang.add(x, y)` with the `const klang = {...}`
prelude. I would actually change that this instead :

```javascript
(function() {
  const klang = {
    add: function() { ... }
  };
  klang.add(x, y)
})()
```

Of course, we would only have one such function and klang declaration globally.

Propose a plan to track what klang functions are needed for the compiled expression,
with static analysis of the IR. Then use the info to generate the prelude dynamically
as proposed above.
