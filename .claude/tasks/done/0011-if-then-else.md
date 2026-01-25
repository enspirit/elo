## Problem to solve

Most real-world logic requires some conditional, such as if/then/else.

But what kind of conditional construction should we favor ?

- functional if/then/else ?
- Imperative if/then/else ?
- IIF like in Excel ?
- Pattern matching ?
- 3-logic `x ? ... : ...` ?
- other ?

## Idea

Let's explore our alternatives and find a good balance between

- simplicity : the construction must be idiomatic and understandable by users
- portability : for our 3 target languages, and beyond
- nice syntax : to fit our K language, taking into account existing constructs like `let`

Make a proposal then we'll see.
