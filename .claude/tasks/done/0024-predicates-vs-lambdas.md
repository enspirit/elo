## Problem to solve

For future steps, we need to distinguish general lambdas from predicates.
Both are functions, but the latter always return a boolean. We need two
different syntaxes for them :

- `( x | x > 2 )` would be a predicate (that must always return a boolean )
- `( x ~> x * 2 )` would be a more general lambda (that could return a boolean)

Let's refactor current code and then introduce the distinction.

## Idea

- We need to extend the parser to recognize both syntaxes
- The IR need to make the difference between them, for future steps it's
  important for us to be able to distinguish them
- Fix code generation to always return booleans on predicates (e.g. use !! in
  ruby and js), and keep the existing implementation for lambdas

## Methodology

Move one step at a time, adding necessary unit tests to guide you. I would

- start by modifying the code to switch | to ~> (pure refactoring)
- then reintroduce the predicate syntax
- then add acceptance tests for predicates
- then modify the code to make them pass
- don't forget to update the documentation (README + web)
