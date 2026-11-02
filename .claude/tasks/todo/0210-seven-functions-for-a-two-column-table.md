# Seven functions for a two-column table

## Symptom

`src/parser.ts:939-1099` holds one function per precedence level, and six of
them are the same function:

```ts
private addition(): Expr {
  let node = this.term();
  while (['PLUS', 'MINUS'].includes(this.currentToken.type)) {
    const token = this.currentToken;
    if (token.type === 'PLUS') {
      this.eat('PLUS');
      node = this.at(binary('+', node, this.term()), token);
    } else if (token.type === 'MINUS') {
      this.eat('MINUS');
      node = this.at(binary('-', node, this.term()), token);
    }
  }
  return node;
}
```

`factor` (`:952`), `addition` (`:977`), `comparison` (`:995`), `equality`
(`:1039`), `logical_and` (`:1057`) and `logical_or` (`:1089`) differ only in
the token list, the operator strings and the name of the next level down.
Roughly 100 lines say one thing: *these operators, at this level, left
associative*.

`term` (`:973`) is the worst of it:

```ts
private term(): Expr {
  return this.factor();
}
```

A precedence level with no operators in it, and `factor` (`:952`) immediately
calls `power`. Three names for one rung. The grammar comment at `:505` admits
it — `factor -> power`.

## What it should be

A table and one loop:

```ts
const BINARY_LEVELS: ReadonlyArray<Partial<Record<TokenType, BinaryOp>>> = [
  { OR: '||' },
  { AND: '&&' },
  // alternative — not a binary node, keeps its own function
  { EQ: '==', NEQ: '!=' },
  { LT: '<', GT: '>', LTE: '<=', GTE: '>=' },
  { PLUS: '+', MINUS: '-' },
  { STAR: '*', SLASH: '/', PERCENT: '%' },
];
```

and `binaryLevel(i)`, which parses the level below it and loops while the
current token is in the table at `i`. The levels vanish as functions; the
ladder becomes the array's order, which is where a reader looks for it anyway.

Three rungs stay hand written, because they are not this shape:

- `power` (`:939`) is right associative.
- `alternative` (`:1073`) collects into one n-ary `alternative` node rather
  than nesting binaries.
- `comparison` (`:995`) carries the range-membership special case (`:1001-1016`)
  before its operator loop. The loop part joins the table; the `in` / `not in`
  speculation stays where it is and calls `binaryLevel` for the next level.

`term` and `factor` collapse into the table outright.

## Why it matters

Adding an operator to Elo is currently: add a token, write a function, insert
it between two other functions by editing both their bodies to call the new
name. That last part is the problem — the ladder is encoded in the call graph,
so changing it means editing unrelated functions, and getting it wrong produces
a precedence bug rather than a compile error. With the table it is one line in
one array.

It also makes the grammar comment at `src/parser.ts:491-515` checkable against
the code instead of merely adjacent to it.

## Tests

Precedence is exactly what the existing suite pins hardest:
`test/fixtures/reference/precedence*.elo` asserts it on all four targets, both
statically typed and through the dynamic dispatch path, and
`parser.unit.test.ts` pins the AST shape per operator. A re-association
mistake cannot survive that.

So: no new test, and the fixture corpus must regenerate to zero diff. If any
`.expected.*` moves, the table has a different associativity from the ladder
and the task has found a bug.
