## Problem to solve

Our stdlib currently force us to register all type combinations for a given
operator, like `+`. Since Ruby/SQL support `+` overloading, the emitted code
is actually the same for all combinations.

We don't want to use the fallback mechanism too early though, since it might
be too general.

We are looking for a intermediate mechanism to apply a given code emission
logic for all `+`, without having to register all combinations nor using the
fallback.

## Idea

When loooking an emit for a given `add(int, int)`, let's try `add(int, int)`,
`add(int, any)` and `add(any, any)` before using the fallback.

That should help us simplifying the stdlib of Ruby and SQL, and possible the
one of Javascript.

## Method

- The language does not change, so integration & acceptance tests should not
  change
- Start by adding necessary support in Stdlib and complete unit tests there.
- Then simplify Ruby's compiler under full testing.
- Then simplify SQL's compiler under full testing.
- Then check whether Javascript's compile can be simplified as well.
