# The README's programmatic AST example does not work

> Found while checking, for 0221, whether a host written against 1.1.1 still
> runs on 1.2.0. It does — but the example the README tells a host to write
> never did.

## Symptom

`README.md`, under "Programmatic AST Construction":

```typescript
import { binary, variable, literal } from './src';

// Build: (price * quantity) - discount
const ast = binary(
  '-',
  binary('*', variable('price'), variable('quantity')),
  variable('discount')
);
```

The AST builds. Compiling it does not:

```
Error: Undefined variable: 'price'
```

Reproduced at v1.1.1 as well as on main, so it is not a regression — the
example has never been run. The transform refuses a free variable, which is
right: Elo has `_` and `let`, and a bare name that is not bound is a mistake.

Three further defects in the same section:

* `from './src'` is the path a *contributor* would write from inside the repo.
  A host installs the package, so it is `from '@enspirit/elo'`.
* It shows only construction, never compilation, so a reader cannot tell the
  example is broken — and the one thing they want to know, how to get code out
  of a hand-built AST, is missing.
* `literal` is imported and not used.

## What it should be

An example that is run, as the website's are. Either bind the names:

```typescript
import { letExpr, binary, variable, literal, compileToJavaScript } from '@enspirit/elo';

const ast = letExpr(
  [{ name: 'price', value: literal(3) }, { name: 'quantity', value: literal(4) }],
  binary('*', variable('price'), variable('quantity'))
);
compileToJavaScript(ast);
```

or read the values off the input, which is what a host actually does:

```typescript
binary('*', memberAccess(variable('_'), 'price'), memberAccess(variable('_'), 'quantity'))
```

The second is the better example: it is what the AST API is *for* — a host
building a formula over its own data without going through Elo source text.

## Tests

The README's code blocks are not executed by anything, which is why this
survived. The website examples are checked
(`test/unit/website-examples.unit.test.ts`), so the pattern exists. Either
extend that to the README's TypeScript blocks, or move the example into
`examples/` where `npm run build` at least type-checks it and it can be run.

Worth doing as part of 0221 rather than alone: the reason nobody noticed is
that the programmatic surface has no owner.
