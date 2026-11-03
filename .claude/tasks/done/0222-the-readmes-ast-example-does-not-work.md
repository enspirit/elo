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

## Implemented

`test/unit/readme-examples.unit.test.ts` is the test this needed, and writing
it found more than the task recorded.

Three checks, over every ```typescript block in the README:

1. every import resolves to a module a host can install — `@enspirit/elo`,
   `@enspirit/elo/node` or `luxon`;
2. every imported name is actually exported by that module;
3. every name a block *uses* that the package exports must be imported.

Then the self-contained blocks are executed. A block is self-contained when
every free identifier is imported or declared in it; the others are fragments
on purpose — `compile(source, …)` over a `source` the prose describes — and
padding them to run would make them worse documentation. String and template
literals are stripped before that analysis, since Elo code travels inside them
and `parse('assert(1 == 1)')` uses no JS binding called `assert`.

### What it found

The task recorded one bug. There were four.

- `from './src'` — a contributor's path. Caught by check 1.
- The example never compiled anything, so `Undefined variable: 'price'` was
  invisible. **This is the one worth remembering**: fixing the import path
  alone made the test pass, because building an AST throws nothing. The example
  had to start calling `compileToJavaScript` before any test could see the
  defect. A documentation example that does not reach a result cannot be
  checked, and that is what let this survive two releases.
- The `EloFailure` block calls `compile()` and imports only
  `type { EloFailure }`. Caught by check 3, pre-existing.
- The `loadProgram` block calls `nodeLoader()` and never imports it. Caught by
  check 3, pre-existing.

Check 3 was itself written red: the first version of the fixed example used
`memberAccess` without importing it, and the fragment rule happily classified
it as prose context. A name the package exports but the block does not import
is a missing import; a name nothing exports is context. That distinction is
what separates the two, and it caught my own mistake plus the two above.

### The section now

It says what the AST API is *for* — a host building a formula without going
through Elo source text — reads values off `_` as Elo source does, and
compiles. It also says the thing that was the actual trap: a bare
`variable('price')` is not a free variable awaiting a value; Elo has no such
thing, so the transform refuses it. The `letExpr` form is shown for a local.
Both examples are executed by the test.

Left undone deliberately: the examples are not moved to `examples/`. The test
runs the README's own text, which is stronger — a file under `examples/` can
drift from the block that quotes it.
