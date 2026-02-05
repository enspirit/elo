# @enspirit/codemirror-lang-elo

[Elo](https://elo-lang.org) language support for [CodeMirror 6](https://codemirror.net/).

Provides syntax highlighting, bracket matching, code folding, indentation,
comment toggling, and autocompletion for the Elo expression language via a
proper [Lezer](https://lezer.codemirror.net/) grammar (incremental parsing,
full syntax tree).

## Installation

```bash
npm install @enspirit/codemirror-lang-elo
```

## Usage

```js
import { EditorView, basicSetup } from "codemirror";
import { elo } from "@enspirit/codemirror-lang-elo";

new EditorView({
  extensions: [basicSetup, elo()],
  parent: document.querySelector("#editor"),
});
```

### What you get

- **Syntax highlighting** for all Elo constructs: keywords, strings, numbers,
  dates, durations, temporal keywords, types, operators, comments.
- **Bracket matching** for `()`, `[]`, `{}`.
- **Code folding** for objects, arrays, lambdas, and type schemas.
- **Indentation** support inside delimited blocks.
- **Comment toggling** with `#`.
- **Autocompletion** for stdlib functions, keywords, temporal keywords, and
  built-in type names.

### Advanced: accessing the language object

If you need the `LRLanguage` instance (e.g. for custom extensions):

```js
import { eloLanguage } from "@enspirit/codemirror-lang-elo";

// eloLanguage is an LRLanguage — use it to build custom LanguageSupport,
// access the parser, etc.
const parser = eloLanguage.parser;
```

### Theming

This package provides language support only, not a theme. Syntax nodes are
mapped to standard `@lezer/highlight` tags, so any CodeMirror theme will
work. The tags used are:

| Elo construct | Highlight tag |
|---|---|
| `let`, `in`, `fn` | `definitionKeyword` |
| `if`, `then`, `else`, `guard`, `check` | `controlKeyword` |
| `and`, `or`, `not` | `operatorKeyword` |
| `true`, `false` | `bool` |
| `null` | `null` |
| Numbers | `number` |
| Strings | `string` |
| Date / DateTime literals | `special(literal)` |
| Duration literals | `special(number)` |
| Temporal keywords (`NOW`, `TODAY`, ...) | `standard(variableName)` |
| Type names (`Int`, `String`, ...) | `typeName` |
| Function calls | `function(variableName)` |
| Property names | `propertyName` |
| Comments | `lineComment` |
| Operators | `compareOperator`, `arithmeticOperator`, `logicOperator`, `operator` |

## Development

### Building

```bash
npm install
npm run prepare   # compiles the Lezer grammar and bundles with Rollup
```

### Testing

```bash
npm test          # runs Lezer grammar tests (test/cases.txt)
```

### Grammar test format

Tests live in `test/cases.txt` using the
[Lezer test format](https://lezer.codemirror.net/docs/guide/#testing):

```
# Test name

source code here

==>

Expected(TreeStructure)
```

## Publishing

1. Make sure all tests pass:

   ```bash
   npm test
   ```

2. Bump the version in `package.json`.

3. Build the package:

   ```bash
   npm run prepare
   ```

4. Publish to npm:

   ```bash
   npm publish --access public
   ```

   The `--access public` flag is required for scoped packages on the first
   publish.

## License

MIT
