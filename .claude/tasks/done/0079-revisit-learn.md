## Problem to solve

I'm not sure I like the Learn section (I love the mechanism, but not the table
of contents), let's maybe brainstorm another structure.

## Idea

What would be the 5 main chapters =

- Introduction

  A quick overview, should be simple but appealing. It's not a big deal if the
  learner does not understand everything, but might be excited and want to keep
  learning to actually understand the example they say.

- Extended Arithmetics

  We would put the foundation : you're used to calculator on numbers, Elo can
  do that. Actually it can do that on other "data types" (to be explained)
  than numbers. Such as boolean, strings, datetimes, aned even lists (see task
  78 we did previously, but without going in full details)

- Advanced data structures

  We would cover list and tuples, and explain that this is the way to represent
  information + a link to a future section about input data and type selectors.
  Here we would also explain that some arithmetic exists on those structure too,
  such as array concatenation. And cover data paths and fetch.

- Functions

  We would explain that operators are not enough, and introduce functions as a
  generalisation. We would cover a few examples of stdlib functions on the types
  seen earlier. Then would introduce our lambda and the fact that those functions
  can be passed as any other value.

- Program structure

  An introduction to `let`, `if/then/else` and `|>` pipe and how they help
  structuring complex programs.

- Advanced data processing

  We would cover things like map/reduce, type selectors (parsing/coercion),
  possibly the null question and `|` operator.

- Where is data coming from ?

  We would finally cover the input data `_` concept and the notion of runtime
  that is supposed to provide it.

## Analysis (Claude)

### Current Structure (16 small lessons)

**Basics:** Numbers → Strings → Booleans → Conditionals → Variables
**Intermediate:** Temporal → Tuples → Input → Lists → Lambdas → Pipes
**Advanced:** map → filter/any/all → Nulls → Time Ranges → Type Selectors

### Proposed Structure (7 chapters)

| #   | Chapter              | Content                                          |
| --- | -------------------- | ------------------------------------------------ |
| 1   | Introduction         | Hook with exciting example                       |
| 2   | Extended Arithmetics | Numbers → Booleans → Strings → Dates → Durations |
| 3   | Data Structures      | Lists, Tuples, DataPaths, fetch()                |
| 4   | Functions            | Stdlib examples, lambdas as values               |
| 5   | Program Structure    | let, if/then/else, \|> pipe                      |
| 6   | Advanced Processing  | map/reduce, type selectors, null, \|             |
| 7   | Input Data           | The `_` variable, runtime concept                |

### Comparison

**Current:** Type-by-type introduction, 16 granular checkboxes
**Proposed:** Concept-by-concept narrative, 7 meaty chapters

### My Take

The proposed structure tells a better _story_:

1. "Look what Elo can do!" (excitement)
2. "It's like a calculator, but for everything" (foundation)
3. "Here's how to bundle data" (structures)
4. "Functions extend what you can do" (power)
5. "Structure complex expressions" (control)
6. "Process collections" (real work)
7. "Connect to the real world" (practical)

The current 16-lesson approach is more "checkbox-y" but less memorable.

### Questions

1. Keep the progress tracking mechanism (checkboxes)?
2. Each chapter = expandable section, or separate pages?
3. Migrate existing content or rewrite from scratch?
