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

## Post plan discussion

* Yep. One more thing though: I think we can see those old `klang.{add,sub,mul,...}` functions as special cases in the stdlib. I would
 register kAdd, kSub, kMul, etc. to the stdlib and reuse the emit mechanism of the Stdlib class helper. This would help us remove
KLANG_ARITHMETIC_HELPERS completely.
