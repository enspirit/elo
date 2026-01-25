## Problem to solve

1. Some target languages (e.g. Javascript) will force us to distinguish between
   overloaded operators, like `+`. For instance,
   - `1 + 2` in K can be translated to `1 + 2` in Javascript
   - But `P1D + P2D` in K may not be translated to `dayjs.duration('P1D') + dayjs.duration('P2D')`. We need to use dayjs's
     `add` function.

2. Possibly we would like to generate code using `luxon` instead of `dayjs`, for some reason.

3. We currently generate code with runtime redirection, like `klang.add(...)`. This works but the generated code is
   unncessary ulgy won't scale to a more complex language.

4. For testing purposes, we would like to easily mock `TODAY` instead of harcoding `dayjs()` (js) or `CURRENT_DATE` (sql).

5. We'd like to be ready for adding type checking and type-driven optimizations later.

We are looking for a compilation mechanism that avoids too much hardcoding and provides some levels of indirection.

## Idea

How about introducting an intermediate language, by analysing and modifying the AST ?

- K is purely functional. So everything, including operators like `+` are function invocations.

- Even constants like NOW or TODAY could be seen as function invocations, with no parameter though.

- With some analysis, we could distinguish between `add_any_any`, `add_int_int` and `add_duration_duration` and generate
  specific code in each case (`add_any_any` being a fallback corresponding to our current `klang.add`).

- The prelude could be generated with only the necessary redirections instead of including all of them all the time.
