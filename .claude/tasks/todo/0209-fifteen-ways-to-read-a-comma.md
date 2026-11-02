# Fifteen ways to read a comma

## Symptom

Every comma-separated list in the grammar is parsed by its own hand-written
loop, and each loop repeats the same two mistakes-in-waiting: it parses the
first element separately from the rest, and it checks for a trailing comma in
its own words.

The argument list alone is written four times — `src/parser.ts:768` (uppercase
call), `:814` (lowercase call), `:899` (apply), `:1145` (pipe) — all four
identical:

```ts
if (tok.type !== 'RPAREN') {
  args.push(this.expr());
  while ((this.currentToken as Token).type === 'COMMA') {
    this.eat('COMMA');
    args.push(this.expr());
  }
}
```

The rest: let bindings at `:1277`, and again at `:1363` where
`parseLetBindingsAfterComma` is a near-copy of the same loop for the case where
a type definition is followed by a value binding; constraints at `:1480`
(subtype), `:1679` (pipe guard), `:1708` (block guard); schema properties at
`:1577` *and* `:1587` — the first-then-loop duplication inside a single
function; object properties at `:1786`/`:1794`; array elements at
`:1824`/`:1828`; plus `lambdaParse`, `typeDefExpr` and `importDecl`.

Fifteen loops, of which about ten also duplicate the first element inside
themselves.

## Why it matters

A trailing comma is allowed by fifteen separate agreements rather than by one
rule, and they do not all say the same thing. The closers each loop accepts are
written out individually:

```ts
if (nextType === 'IN' || nextType === 'GUARD' || nextType === 'CHECK') break;   // :1295
if ((this.currentToken as Token).type === 'IN') break;                          // :1377
if ((this.currentToken as Token).type === 'RPAREN') break;                      // :1486
if ((this.currentToken as Token).type === 'RBRACE') break;                      // :1797
```

`:1295` accepts `let x = 1, in …`, `let x = 1, guard …` and `let x = 1, check
…`. Its near-copy at `:1377` accepts only the first — so `let T = Int, x = 1,
guard x > 0 in x` and `let x = 1, guard x > 0 in x` disagree about whether that
comma is allowed, for no reason anyone chose. That is the class of divergence
this shape produces, and there are fifteen chances for the next one.

It is also the bulk of the parser's length: ~2260 lines for a grammar of this
size, and list plumbing is a large slice of it.

## What it should be

One helper:

```ts
private commaSeparated<T>(parse: () => T, ...closers: TokenType[]): T[]
```

It parses nothing when the next token is a closer, parses an element, and loops
on `COMMA` — stopping before a closer so that the trailing comma is allowed by
construction, in one place, for every list in the language.

The fifteen loops become fifteen calls. `parseLetBindingsAfterComma` should
disappear entirely into `letExpr`'s call: the only thing it ever did was repeat
the binding loop, and the "type defs then value bindings" shape is one list of
bindings read with the same helper.

Schema properties are the one list where the comma is *optional* rather than
required (`src/parser.ts:1586`, "commas are optional, like Finitio"), so the
helper needs that as a mode, not as a second helper.

## Why do this before 0210 and 0211

Those two also rewrite parts of the parser. Landing the list helper first means
they rewrite the shorter version: 0211 in particular touches three of these
loops (`:1679`, `:1708`, and the one in `subtypeConstraintExpr` it shares).

## Tests

The grammar does not change, so the existing parser unit tests and the fixture
corpus cover it: `parser.unit.test.ts` pins the shape of every construct
involved, and the trailing-comma cases are already asserted per construct.

One red test is needed, for the divergence found above rather than for the
refactoring: `let T = Int, x = 1, guard x > 0 in x` should parse, and today
does not. It is a one-line fixture assertion; see it fail on all four targets
first.
