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
npm run package                            # npx @vscode/vsce package
code --install-extension vscode-elo-0.1.0.vsix
```

### Publishing

**Marketplace.** `publisher` is set to `enspirit`. The publisher ID is an Azure
DevOps identity, unrelated to npm or GitHub: sign in at
<https://marketplace.visualstudio.com/manage> to check or create it, then
`npx @vscode/vsce login enspirit` and `npm run package && npx @vscode/vsce publish`.
At the time of writing neither `enspirit` nor `elo-lang` is taken.

**npm.** `vsce` refuses to combine a `.vscodeignore` with a `files` property, so
this package uses `files` — the `.vsix` and the npm tarball then ship exactly the
same 11 files. `npm publish` works as is and puts the TextMate grammar within
reach of anything else that consumes one (Shiki, for instance, which could
render the website's code blocks).

One wrinkle worth knowing: a VS Code extension name cannot be scoped, so this
package is `vscode-elo` on npm, not `@enspirit/vscode-elo` like its two
siblings. Keeping the `@enspirit` scope would mean splitting the grammar into a
separate package that the extension then embeds.

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

## Icons

Both the Marketplace icon and the `.elo` file icon are derived from
`web/public/logo.svg` — the three bars standing for the three compilation
targets, a stylised E, and the `|>` pipe. Colours come from the website's
design tokens (`web/public/styles/tokens.css`):

| File | Use | Colour |
|---|---|---|
| `icon.svg` / `icon.png` | Marketplace, 128×128 | `accent` `#6366f1` on `bg-primary` `#1a1a2e` |
| `icons/elo-dark.*` | file icon, dark themes | `accent-hover` `#818cf8`, transparent |
| `icons/elo-light.*` | file icon, light themes | `accent` `#4f46e5`, transparent |

The SVGs are the source; the PNGs are what VS Code actually loads. Regenerate
them with `npm run icons` (needs ImageMagick) after editing an SVG.

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
