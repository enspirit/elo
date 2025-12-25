## Problem to solve

What the latest problems we solve have shown is that we need clean ways to reason
about types at runtime, and possibly within K itself.

* The kAdd, kSub, kMul, etc. functions have some runtime logic that aim at discovering
  the runtime of a value (whether its an int, a date, a duration, etc.)

* I discover compilation errors in the web app, typically when some evaluations
  return an int instead of a duration. This shows that we lack acceptance tests
  that assert that the result of an expression has the expected type.

## Idea

How about adding better support to type checking at runtime, both in the
implementation and in the language itself ?

* We could introduce a `typenameOf(...)` function in `K`, backed by some
  `kTypenameOf` in the stdlib.
* Or alternatively introduce `isInt`, `isFloat`, `isDuration` functions,
  implemented by `kIsInt`, etc. in the helper methods.

What do you think ? Apply an acceptance-driven methodology, where you start
by writing one or two acceptance tests before moving to the implementation.

## Post implementation discussion

* Document typeOf in web. Also add additional acceptance tests that prove that various date(time) arithmetic expressions return an
value of the expected type
