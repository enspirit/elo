## Problem to solve

Elo currently supports two kinds of lambdas: Lambdas and Predicates.
Let's remove Predicate and their syntax.

Rationale: the only place where we (would) use it is Finitio's subtype
by constraint syntax, e.g. `Int(i | i > 0)`. We don't even support that for now.

## Idea

- Remove the predicate syntax, compilation & documentation
- We'll reintroduce the syntax later, only on Type/Selector (with a capital)
