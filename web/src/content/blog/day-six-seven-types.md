---
title: "Days Six and Seven: Teaching and Typing"
date: 2025-12-31
author: "Bernard Lambeau & Claude"
lead: "The final days of 2025 brought two major additions: interactive exercises for learning Elo, and a powerful type definition system inspired by Finitio."
---

## Learning by Doing

Reading documentation only goes so far. Day six added interactive exercises embedded directly in the Learn section:

- Each chapter ends with hands-on challenges
- Write Elo expressions in the playground
- Immediate feedback on correctness
- Progress tracking with "Mark as complete"

The exercises range from simple arithmetic to complex data transformations. They're not tests—they're practice.

## Finitio-Style Type Definitions

Day seven introduced something powerful: user-defined types. Inspired by [Finitio](https://finitio.io/), Elo now supports:

**Subtype constraints:**
```elo
type Positive = Int(x ~> x > 0)
```

**Union types:**
```elo
type StringOrNull = String | Null
```

**Structured types:**
```elo
type Person = { name: String, age?: Int }
```

**Array types:**
```elo
type Numbers = [Int]
```

The type definitions compile to runtime validation code. A `Positive` selector will throw if given zero or negative numbers. A `Person` selector validates the structure of input data.

## Optional Attributes

Real-world data is messy. Not every field is always present. Elo now handles this gracefully:

```elo
type Config = {
  required: String,
  optional?: Int
}
```

The `?` marks attributes that can be missing. When missing, they're simply absent from the result—no null values inserted.

## Extra Attributes

Sometimes you want to validate known fields but preserve unknown ones:

```elo
type Flexible = { known: String, ... }
```

The `...` allows additional attributes to pass through unchanged.

---

A week of development. From empty directory to a language with types, exercises, security guarantees, and three compilation targets. Not bad for human-AI collaboration.
