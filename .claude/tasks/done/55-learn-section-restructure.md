## Problem to solve

The Learn section currently covers only basic concepts (9 lessons). Recent additions like
arrays, map/filter/reduce, predicates, and type selectors are not covered. The section
needs restructuring into Basic → Intermediate → Advanced tiers to provide a progressive
learning path.

## Current State

9 lessons covering basics:
1. Playing with Numbers - arithmetic
2. Words, Words, Words - strings
3. True or False? - booleans
4. Making Decisions - if/then/else
5. Naming Things - let bindings
6. Time Flies - dates, durations
7. Bundling Data - objects
8. Building Blocks - functions/lambdas
9. Piping It Through - pipe operator

## Proposed Structure

### Basics (lessons 1-5, unchanged)
1. Playing with Numbers - arithmetic
2. Words, Words, Words - strings
3. True or False? - booleans
4. Making Decisions - if/then/else
5. Naming Things - let bindings

### Intermediate (lessons 6-10)
6. Time Flies - dates, durations, NOW/TODAY (existing, minor updates)
7. Bundling Data - objects (existing)
8. **Lists of Things** - arrays `[1, 2, 3]`, `length()`, indexing (NEW)
9. Building Blocks - functions/lambdas (existing)
10. Piping It Through - pipe operator (existing)

### Advanced (lessons 11-15, all NEW)
11. **Transforming Lists** - `map`, `filter`, `reduce` with lambdas
12. **Checking Lists** - `any`, `all` with predicates `fn(x | x > 0)`
13. **Handling Missing Values** - `null`, `isNull()`, `|` fallback operator
14. **Time Ranges** - `in` operator, `SOW...EOW` date ranges
15. **Parsing Data** - type selectors `Int()`, `Date()`, `Duration()`

## Implementation

1. Update TOC in `web/index.html`:
   - Add section headers: "Basics", "Intermediate", "Advanced"
   - Renumber lessons
   - Add new lesson links

2. Write new lesson content:
   - Lesson 8: Lists of Things (arrays)
   - Lesson 11: Transforming Lists (map, filter, reduce)
   - Lesson 12: Checking Lists (any, all, predicates)
   - Lesson 13: Handling Missing Values (null, |)
   - Lesson 14: Time Ranges (in, ranges)
   - Lesson 15: Parsing Data (type selectors)

3. Update "What's Next?" section to reference advanced topics

4. Update styles.css if needed for section headers in TOC

## Content Guidelines

Each lesson should follow existing patterns:
- Brief intro paragraph explaining the concept
- 2-4 clickable examples with `data-action="click->doc#tryExample"`
- A "lesson-tip" with practical advice or mental model
- Progressive complexity within the lesson

## Examples for New Lessons

### Lesson 8: Lists of Things
```elo
[1, 2, 3, 4, 5]
['apple', 'banana', 'cherry']
length([1, 2, 3])
```

### Lesson 11: Transforming Lists
```elo
map([1, 2, 3], fn(x ~> x * 2))
filter([1, 2, 3, 4, 5], fn(x | x > 2))
reduce([1, 2, 3, 4], 0, fn(acc, x ~> acc + x))
```

### Lesson 12: Checking Lists
```elo
any([1, 2, 3], fn(x | x > 2))
all([1, 2, 3], fn(x | x > 0))
let prices = [10, 20, 5] in all(prices, fn(p | p < 100))
```

### Lesson 13: Handling Missing Values
```elo
null
isNull(null)
null | 'default value'
let x = null in x | 0
```

### Lesson 14: Time Ranges
```elo
TODAY in SOW ... EOW
D2024-06-15 in SOM ... EOM
NOW in SOY ... EOY
```

### Lesson 15: Parsing Data
```elo
Int('42')
Date('2024-12-25')
Duration('P1D')
```

## Dependencies

- 54b, 54c, 54d (arrays and iteration functions)
- Existing stdlib documentation
- Existing lesson structure and CSS
