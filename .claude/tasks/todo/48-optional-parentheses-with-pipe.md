## Problem to solve

Currently, `'hello' |> upcase`, one has to use `'hello' |> upcase()`.

It's not super annoying, but with type selectors, it would be much more idiomatic
to do `'2025-12-12' |> Date` than `'2025-12-12' |> Date`.

## Idea

If not too complex, let's have optional `()` when using the pipe operator.
