## Problem to solve

The Learn page has several consistency issues identified by /rigorous review.

## Issues Found

### 1. Forward Reference Violations

**Critical**: Lesson 4 (Decisions) uses `let` before it's introduced in Lesson 5:

```
let age = 18 in if age >= 18 then 'Welcome!' else 'Sorry'
```

**Fix**: Replace with a literal-only example:

```
if 18 >= 18 then 'Welcome!' else 'Sorry'
```

### 2. Fun Facts Assessment

| Lesson           | Fun Fact                                       | Verdict                                              |
| ---------------- | ---------------------------------------------- | ---------------------------------------------------- |
| **1. Numbers**   | "Elo doesn't have variables that change..."    | **Misplaced** - mentions variables before introduced |
| **3. Booleans**  | "Real-world example: age >= 18 and hasLicense" | Good                                                 |
| **4. Decisions** | "Think spreadsheets: Excel's IF()..."          | Good                                                 |
| **5. Variables** | "Once price is 100, it's always 100"           | **Redundant** - same as Lesson 1 tip                 |
| **6. Dates**     | "P1Y2M3D means 1 year, 2 months..."            | Good                                                 |
| **7. Objects**   | "If you've seen JSON, you've seen this"        | Good                                                 |
| **9. Pipes**     | "Think Unix pipes..."                          | Narrow audience                                      |

### 3. Missing Fun Facts

- **Lesson 2 (Strings)**: No fun fact. Suggestion: "Unlike some languages, Elo only uses single quotes for strings—no double quotes needed!"
- **Lesson 8 (Functions)**: No fun fact. Suggestion: "The `~>` arrow is like a recipe: inputs on the left, result on the right."

### 4. Calculator Metaphor Missing

The intro could benefit from a calculator analogy:

> "Think of Elo like a powerful calculator. You write expressions, and Elo gives you results. No complex programs—just math, text, dates, and logic."

### 5. Lesson 9 Pipe Analogy

Current "Think Unix pipes" may confuse non-developers. Alternative:

> "Like a factory assembly line—data flows through each step, getting transformed along the way."

## Implementation Checklist

- [ ] Remove/relocate fun fact from Lesson 1 (forward reference to variables)
- [ ] Fix Lesson 4 example to not use `let`
- [ ] Consolidate immutability message to only Lesson 5
- [ ] Add calculator metaphor to introduction
- [ ] Add fun fact to Lesson 2 (Strings)
- [ ] Add fun fact to Lesson 8 (Functions)
- [ ] Rephrase Lesson 9 pipe analogy for non-Unix users
- [ ] Update learn-examples.unit.test.ts if examples change
