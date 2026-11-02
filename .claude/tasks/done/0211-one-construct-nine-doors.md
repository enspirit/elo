# One construct, nine doors

## Symptom

`guard` and `check` are reachable from nine places in the parser, three of
which backtrack to work out which of the two spellings they are looking at.

The entry points:

| `src/parser.ts` | from |
|---|---|
| `:803` | `primary`, as a lowercase identifier named `guard`/`check` |
| `:851`, `:858` | `primary`, as a `GUARD`/`CHECK` token |
| `:1127` | `pipe`, after `|>` |
| `:1305`, `:1309` | `letExpr`, the `let … guard … in` sugar |
| `:1969`, `:1972` | `expr`, via `guardOrPipeGuard` |

and the resolver chain under them:

```
guardOrPipeGuard(:1984)   saveState, eat GUARD, look for LPAREN, restore on failure
  tryParsePipeGuardBody(:1651)  saveState, eat LPAREN,  → parsePipeGuardBody
  tryParsePipeGuard(:1640)      saveState, eat LPAREN,  → parsePipeGuardBody
    parsePipeGuardBody(:1662)   restoreState unless IDENTIFIER PIPE
  guardExprParse(:1703)   the block form
```

`tryParsePipeGuard` and `tryParsePipeGuardBody` have identical bodies. Both are
three lines; both save state and eat `LPAREN`; they differ in nothing at all:

```ts
private tryParsePipeGuard(guardType: 'guard' | 'check'): Expr | null {
  const savedState = this.saveState();
  this.eat('LPAREN');
  return this.parsePipeGuardBody(guardType, savedState);
}
```

(`:1640` and `:1651`, verbatim the same four lines under two names.)

## Why it matters

The two spellings are told apart by *parsing and backtracking* rather than by
looking ahead. Speculation in this parser has already cost a correctness bug:
`CANNOT_START_A_RANGE` (`src/parser.ts:573`, explained at length at `:1181-1198`)
exists because `in` was disambiguated by speculative parsing and made the
parser exponential — `let a = 1 in let a = 1 in …` reparsed the whole remaining
body at every level. That comment is a warning about the technique, and
guard/check uses it in three more places.

It is also decided differently depending on the door. `guardOrPipeGuard`
restores and falls back to the block form; `primary:803` tries the pipe form
and, if it fails, falls through to a plain function call named `guard`. So
whether `guard(…)` can mean "a call to a function called guard" depends on
which of the nine entry points saw it. Nobody chose that.

## What it should be

One resolver, no backtracking, because one token of lookahead is enough.

The pipe form is `guard` `(` IDENTIFIER `|` — and nothing else in the language
starts that way, since a parenthesised expression beginning with a bare
identifier followed by `|` would be an `alternative` whose first branch is a
variable, which `guard(x | …)` is not asking for. Peeking two tokens past the
`LPAREN` decides it outright.

So:

- One `guardOrCheck(kind)` that peeks and dispatches to `pipeGuard` or
  `blockGuard`. No `saveState`.
- `tryParsePipeGuard` and `tryParsePipeGuardBody` collapse into the one body
  they share.
- The nine doors become the two that are really different — `expr` for the
  statement position and `pipe` for the `|>` position — with `primary` and
  `letExpr` calling the same resolver instead of each reaching into the chain
  at a different depth.

The lexer currently hands `guard` over as a `GUARD` token *and* `primary:803`
re-handles it as an identifier. Decide one: it is a keyword (it is in the
`TokenType` union at `:51`), so the identifier path at `:803` should go.

That last part is a grammar change, not a refactoring — it makes `guard` and
`check` unusable as function names. They are keywords already everywhere else,
so this is making the language say one thing instead of two; worth confirming
against `grammarian` before landing.

## Tests

The guard/check forms are covered by fixtures on all four targets, and
`parser.unit.test.ts` pins both spellings. Collapsing the duplicate functions
and removing the backtracking are covered by those.

Two things need their own red test, because they are behaviour and not shape:

- A source using `guard` as a variable or function name. Today's behaviour
  depends on the entry point; after this task it is one answer. Write the
  assertion for the answer chosen, and see it fail first.
- Termination: a `parser-termination.unit.test.ts` case for deeply nested
  `guard … in guard … in …`, which is the shape `CANNOT_START_A_RANGE` had to
  be invented for. It should stay linear once the speculation is gone.
