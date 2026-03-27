# highlightjs-elo

[Elo](https://elo-lang.org) language grammar for [highlight.js](https://highlightjs.org/).

## Usage with markdown-it

```js
const markdownIt = require('markdown-it');
const hljs = require('highlight.js/lib/core');
const elo = require('@enspirit/highlightjs-elo');

hljs.registerLanguage('elo', elo);

const md = markdownIt({
  highlight: function (str, lang) {
    if (lang === 'elo' && hljs.getLanguage('elo')) {
      return hljs.highlight(str, { language: 'elo' }).value;
    }
    return '';
  }
});
```

Then in your markdown files:

~~~markdown
```elo
let x = 42 in
  if x > 0 then 'positive'
  else 'negative'
```
~~~

## Usage with highlight.js (browser)

```html
<link rel="stylesheet" href="path/to/highlight.js/styles/default.min.css">
<script src="path/to/highlight.js/highlight.min.js"></script>
<script src="path/to/elo.js"></script>
<script>
  hljs.registerLanguage('elo', window.hljsDefineElo);
  hljs.highlightAll();
</script>
```

## Supported syntax

- Keywords: `let`, `in`, `if`, `then`, `else`, `fn`, `guard`, `check`, `and`, `or`, `not`
- Literals: booleans, null, numbers, strings (single-quoted)
- Date/datetime literals: `D2024-01-15`, `D2024-01-15T10:30:00Z`
- Duration literals: `P1D`, `PT1H30M`
- Temporal keywords: `NOW`, `TODAY`, `TOMORROW`, `YESTERDAY`, `BOT`, `EOT`, etc.
- Type selectors: `Int`, `Float`, `Bool`, `String`, `Date`, `Datetime`, etc.
- Standard library functions: `map`, `filter`, `upper`, `length`, `sum`, etc.
- Operators: `|>`, `~>`, `..`, `...`, comparisons, arithmetic
- Data paths: `.field.nested`
- Comments: `# line comment`
