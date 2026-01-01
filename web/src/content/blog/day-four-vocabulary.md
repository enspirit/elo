---
title: "Day Four: Words Matter"
date: 2025-12-28
author: "Bernard Lambeau & Claude"
lead: "Naming things is one of the hardest problems in computer science. Day four was about getting the vocabulary right—and restricting the grammar to prevent future confusion."
---

## From Arrays to Lists

JavaScript calls them arrays. Ruby calls them arrays. But in Elo, we decided to call them **Lists**. Why? Because "array" implies fixed-size, indexed access. Elo's collections are more like functional lists: you `map` over them, `filter` them, `reduce` them.

Similarly, what JavaScript calls objects became **Tuples** in Elo. Not because they're immutable (they're not), but because the term better reflects their use as structured records with named fields.

The rename rippled through everything: documentation, error messages, type names, stdlib functions.

## Grammar Restrictions

Day four also locked down the grammar. Capital letters now have meaning:

- **Uppercase names**: Reserved for Types and Selectors (`String`, `Date<iso8601>`)
- **Lowercase names**: For everything else (variables, functions)

This isn't just style—it's enforced by the parser. Writing `let Date = 5 in Date` is now a syntax error. The restriction makes code self-documenting: you can tell at a glance whether something is a type or a value.

## The Underscore Convention

Every Elo program now implicitly receives its input as `_`. This simple convention enables powerful patterns:

```elo
_.name | "Anonymous"
```

The input is always there, waiting to be accessed. No need to declare parameters for the common case.

## Lambda Sugar

Writing `fn(x ~> x * 2)` is fine, but for single-parameter lambdas, `(x ~> x * 2)` is cleaner. Day four added this syntactic sugar—a small change that makes functional code more pleasant to write and read.

---

Good vocabulary reduces cognitive load. Good grammar prevents mistakes. Both make the language more approachable.
