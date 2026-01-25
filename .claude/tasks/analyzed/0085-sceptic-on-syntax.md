## Problem to solve

- Our parser could be super buggy
- A newcomer could also make syntax errors and never find how to solve them

## Idea

- Let's have the /sceptic check that valid but a bit strange expressions work
  as expected
- Let's also see whether error messages are clear enough for typical errors a
  newcomer could make.

How about adding a section listing typical errors one might encounter and
provide a likely clause and suggested fix ? Where ? Learn or Reference ?

## Analysis

Ran /sceptic agent and found the following:

### Critical Bug Found

- **Unclosed single quote string**: `'hello` compiles to `"hello"` without error!
  The lexer's `readSingleQuotedString` doesn't check for EOF before closing quote.

### Semantic Edge Cases

1. **Chained comparisons misleading**: `5 < 3 < 10` evaluates to `true` (not mathematical interpretation)
2. **Float equality precision**: `0.1 + 0.2 == 0.3` returns `false`

### Error Message Improvements Suggested

| Expression        | Current Error                     | Suggested                                               |
| ----------------- | --------------------------------- | ------------------------------------------------------- |
| `lett x = 1 in x` | "Expected EOF but got IDENTIFIER" | "Unknown keyword 'lett'. Did you mean 'let'?"           |
| `(1, 2, 3)`       | "Expected RPAREN but got COMMA"   | "Unexpected comma. For function calls use: fn(1, 2, 3)" |

### Proposed New Test Files

1. `parser-edge-cases.elo` - deep nesting, unicode, comments, escapes
2. `boundary-values.elo` - empty collections, out of bounds, edge indices
3. `numeric-edge-cases.elo` - large numbers, float ops, power edge cases

### Documentation Recommendation

Add a "Common Pitfalls" section to Learn or Reference covering:

- Chained comparisons behavior
- Float precision issues
- String escape sequences
