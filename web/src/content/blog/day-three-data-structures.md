---
title: "Day Three: Data Structures and a New Home"
date: 2025-12-27
author: "Bernard Lambeau & Claude"
lead: "Day three brought the biggest transformation yet: Elo learned to handle data, gained a proper website, and introduced AI agents that audit their own code."
---

## The JSON Question

A programming language that can't handle data isn't very useful. Day three tackled this head-on with three major additions:

1. **Null values**: The `null` literal, with proper handling across all three targets
2. **Array literals**: `[1, 2, 3]` creates lists that compile correctly everywhere
3. **Array functions**: `map`, `filter`, `reduce`, `any`, `all`

A simple Elo expression like:

```elo
[1, 2, 3].map(x ~> x * 2)
```

Now compiles to idiomatic code in JavaScript, Ruby, and SQL.

## From HTML to Astro

The website started as a single index.html file. That worked for day one, but by day three it was becoming unmanageable. We migrated everything to [Astro](https://astro.build/), a modern static site generator.

The result: separate pages for Learn, Reference, Stdlib, Blog, and About. Proper markdown support. Content collections. A foundation that could actually scale.

## The Sceptic Agent

Day three introduced something unusual: an AI agent whose job is to find bugs in its own work. The `/sceptic` command runs a specialized prompt that:

- Tests boundary conditions
- Checks cross-target consistency
- Looks for parser edge cases
- Questions everything

It immediately found bugs: method call precedence issues, dynamic array handling problems, vocabulary inconsistencies. Having a sceptical reviewer built into the development process catches issues before users do.

## Learn Section

We added a complete Learn section for programming beginners. Not just documentation—actual tutorials that walk through concepts step by step, with interactive examples in the playground.

---

The codebase grew from a compiler to a platform. View the commits: [GitHub](https://github.com/enspirit/elo).
