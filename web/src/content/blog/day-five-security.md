---
title: "Day Five: Security and Polish"
date: 2025-12-29
author: "Bernard Lambeau & Claude"
lead: "A language that compiles to executable code needs security guarantees. Day five added formal security documentation, bug bounty program, and deep equality—the kind of polish that separates toys from tools."
---

## The Security Page

Elo compiles user expressions into Ruby, JavaScript, and SQL. That's a potential attack surface. Day five added a dedicated Security page documenting:

- **Input sanitization**: How Elo handles untrusted input
- **Sandbox guarantees**: What the generated code cannot do
- **Bug bounty program**: Responsible disclosure process

Making security guarantees explicit isn't just documentation—it's a commitment.

## Deep Equality

Comparing `5 == 5` is easy. Comparing `{a: 1, b: [2, 3]} == {a: 1, b: [2, 3]}` is harder. Day five implemented proper deep equality across all targets:

```elo
[1, 2, 3] == [1, 2, 3]  # true
{x: 1} == {x: 1}        # true
```

This required custom `kEq` helpers that recursively compare structures. The same Elo expression now produces consistent equality semantics in JavaScript, Ruby, and PostgreSQL.

## Learn Page Narrative

The Learn section got restructured into seven narrative chapters, each building on the previous:

1. First Expression
2. Arithmetic
3. Data
4. Types
5. Functions
6. Real World
7. Next Steps

Not a reference manual—a journey.

## Arithmetic Completions

The stdlib gained new arithmetic operations:

- `String * Number`: Repeat a string
- `List + List`: Concatenate lists
- `Datetime - Duration`: Date arithmetic

Each operation compiles to the idiomatic equivalent in each target language.

---

Day five was about trust. Users need to trust that Elo is secure. They need to trust that equality works. They need tutorials they can trust to teach correctly.
