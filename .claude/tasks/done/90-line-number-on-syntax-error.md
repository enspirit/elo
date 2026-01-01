## Problem

When a syntax error is found, the error contains the character position, instead
of line and column, e.g. `Expected EOF but got IDENTIFIER at position 6`.

## Idea

Improve the parser to as to track line & column numbers.
