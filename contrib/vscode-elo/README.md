# vscode-elo

[Elo](https://elo-lang.org) language support for [Visual Studio Code](https://code.visualstudio.com/).

Syntax highlighting via a [TextMate](https://macromates.com/manual/en/language_grammars)
grammar, plus comment toggling, bracket matching and indentation for `.elo` files.

This is the third grammar in `contrib/`, because the three ecosystems need three
different formats and none of them can consume the others:

| Package | Grammar format | Used by |
|---|---|---|
| `codemirror-lang-elo` | Lezer | the playground on elo-lang.org |
| `highlightjs-elo` | highlight.js | docs, blog, markdown-it |
| **`vscode-elo`** | **TextMate** | **VS Code, and anything else TextMate-based** |

## Install

### From source, for development

Symlink the directory into your extensions folder and restart VS Code:

```bash
ln -s "$PWD" ~/.vscode/extensions/enspirit.vscode-elo-0.1.0
```

### As a `.vsix`

```bash
npx @vscode/vsce package
code --install-extension vscode-elo-0.1.0.vsix
```

### Publishing

`publisher` in `package.json` is set to `enspirit` — check it matches the real
Marketplace publisher ID before running `vsce publish`. The manifest also has
`"private": true` to avoid an accidental `npm publish`; drop it if you ever want
the grammar on npm.

## What gets highlighted

- **Keywords** — `let`, `in`, `if`, `then`, `else`, `guard`, `check`, `fn`,
  `and`, `or`, `not`
- **Types** — the built-in selectors (`Int`, `Float`, `String`, `Date`, …) get
  `support.type.builtin`, and *any* capitalised identifier gets
  `entity.name.type`, because Elo reserves capitalised identifiers for type
  names (see `codemirror-lang-elo/src/tokens.ts`). So `Person`, `PosInt` and
  `Parametres` colour as types without being listed anywhere.
- **Finitio constraints** — in `Int(i | positive: i > 0)`, `i` is a parameter
  and `positive` a constraint label
- **Lambda parameters** — both `fn(x, y ~> …)` and the `x ~> …` sugar
- **Temporal literals** — `D2024-01-15`, `D2024-01-15T10:30:00Z`, `P1Y2M3D`,
  `PT1H30M`, and the keywords `NOW`, `TODAY`, `SOW`, `EOT`, …
- **Standard library** — `map`, `filter`, `round`, `assert`, `fetch`, … get
  `support.function`; your own calls get `entity.name.function`
- **`_`** — the implicit input, scoped `variable.language.input`
- **Operators** — `|>`, `~>`, `..`, `...`, comparisons, arithmetic, `|` for
  union/alternative, `?` for optional attributes
- **Strings** with `\\`, `\n`, `\t`, `\r`, `\'` escapes; unknown escapes are
  flagged `invalid.illegal`
- **Let bindings** — the name being defined gets `variable.other.definition`

Plain variable *references* are deliberately left unscoped, so they take the
theme's default foreground — same convention as the built-in grammars.

## Tests

The grammar is tokenised with the real VS Code engine (`vscode-textmate` +
Oniguruma) and the scopes are asserted, so a regression shows up as a failing
test rather than as a colour someone notices later.

```bash
npm install
npm test                           # assert scopes on fixtures/sample.elo
node test/tokenize.test.mjs --dump # print every token and its scopes
```

`fixtures/sample.elo` is valid Elo — it parses with `@enspirit/elo` — and
exercises every construct the grammar has to colour. Besides the explicit scope
assertions, the suite fails if any token containing an operator, a digit, a
capital or punctuation ends up with no scope at all: that is how a hole in the
grammar gets caught.
