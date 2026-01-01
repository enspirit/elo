---
title: "Day Two: The Art of Refinement"
date: 2024-12-26
author: "Bernard Lambeau & Claude"
lead: "Day one was about building something from nothing. Day two was different—it was about refinement, rebranding, and preparing Elo for the world."
---

## The Morning Revelation

We started day two by looking at what we'd built. The compiler worked. Tests passed. But something felt off about the generated code. Take this simple Elo expression:

> `let x = 1 in x + 1`

The JavaScript output looked like this:

```js
((x) => x + 1)(1)
```

Technically correct. But when debugging generated code, this IIFE-wrapped style is nearly impossible to follow.
The new output? Clean, readable imperative code:

```js
(function() { let x = 1; return x + 1; })()
```

## Error Handling: A Finitio Inheritance

The biggest feature of day two was error handling—but not the usual try/catch kind. Elo needed something portable across Ruby, JavaScript, and SQL.
We designed an **alternative operator**. The `|` symbol means "try this, or else try that":

```elo
Date<iso8601>(input) | Date<dmy>(input) | fail("Invalid date")
```

## From K to Elo: The Rebranding

The language started as "K"—a terrible name, already taken by a famous array language. Day two brought a complete rebranding:

- **New name:** Elo (named after Elodie—a reminder that life is more than code)
- **New extension:** `.elo` files instead of `.k`
- **New CLI:** `eloc` (the Elo compiler)

---

View today's task files: [Done tasks on GitHub](https://github.com/enspirit/elo/tree/main/.claude/tasks/done).
