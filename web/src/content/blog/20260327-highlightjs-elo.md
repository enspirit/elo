---
title: "Syntax Highlighting for Your Blog"
date: 2026-03-27
author: "Bernard Lambeau & Claude"
lead: "A new highlight.js grammar brings Elo syntax highlighting to markdown-it, Hugo, Jekyll, and anywhere highlight.js runs."
---
The [Elo website](/) has had syntax highlighting since day one, thanks to a
custom tokenizer built into the site. But if you write *about* Elo on your own
blog — say, with markdown-it or Hugo — your code blocks looked plain.

Not anymore. We just published **highlightjs-elo**, a highlight.js language
grammar for Elo. It lives in the
[contrib/highlightjs-elo](https://github.com/enspirit/elo/tree/main/contrib/highlightjs-elo)
directory, alongside the existing CodeMirror grammar that powers the
[playground](/try).

## What it highlights

Keywords, literals, operators, stdlib functions, type selectors, date and
duration literals, data paths, comments — the full language surface. Here are a
few examples (click any block to try it live):

A simple conditional:

```elo
if 2 + 3 > 4 then 'yes' else 'no'
```

Let bindings with guards:

```elo
let x = 42
guard x > 0
in x * 2
```

Lambdas, pipes, and stdlib:

```elo
[3, 1, 4, 1, 5] |> sort |> unique |> map(fn(x ~> x * 10))
```

Dates, durations, and temporal keywords:

```elo
let deadline = D2026-12-31T23:59:59Z in
let remaining = deadline - NOW in
remaining |> inDays
```

Type selectors and data schemas:

```elo
let PosInt = Int(i | i > 0) in
let Person = { name: String, age: PosInt } in
{ name: 'Alice', age: '30' } |> Person
```

Data path navigation with fallback:

```elo
.user.address.city | 'Unknown'
```

## Setup with markdown-it

Install the package from the repo:

```bash
npm install @enspirit/highlightjs-elo
```

Then register the language and wire it into markdown-it:

```javascript
const hljs = require('highlight.js/lib/core');
const elo = require('@enspirit/highlightjs-elo');

hljs.registerLanguage('elo', elo);

const md = require('markdown-it')({
  highlight(str, lang) {
    if (lang === 'elo' && hljs.getLanguage('elo')) {
      return hljs.highlight(str, { language: 'elo' }).value;
    }
    return '';
  }
});
```

Then use fenced code blocks with `elo` as the language identifier in your
markdown files. That's it.

## ES module support

The package ships both CommonJS and ES module versions, so it works with
bundlers, plain Node, or browser `<script>` tags. See the
[README](https://github.com/enspirit/elo/tree/main/contrib/highlightjs-elo)
for browser usage.

## Try it

If you write about Elo — a tutorial, a comparison, a deep dive into portable
expressions — your code blocks now get proper highlighting out of the box.

[Try Elo](/try), read the [Reference](/reference), or grab the grammar from
[GitHub](https://github.com/enspirit/elo/tree/main/contrib/highlightjs-elo).
