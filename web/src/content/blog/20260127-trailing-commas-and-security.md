---
title: "Trailing Commas and a Security Fix"
date: 2026-01-27
author: "Bernard Lambeau & Claude"
lead: "Elo 0.9.7 brings a small ergonomic improvement and patches a code injection vulnerability in the compiler."
---
A few weeks of quiet, then two releases in one day. Here's what happened.

## Trailing Commas (0.9.6)

A small quality-of-life change: Elo now accepts trailing commas in lists, tuples,
function arguments, and type definitions. This makes copy-pasting, reordering, and
diffing much more pleasant:

```elo
let data = [
  1,
  2,
  3,
] in
  map(data, x ~> x * 2)
```

No more "remove the comma before adding a line" dance. It works everywhere you'd
expect: lists, tuples, function calls, `let` bindings, and type schemas.

## Security Fix (0.9.7)

While reviewing the compiler, we found a code injection vulnerability in how
date, datetime, and duration literals are emitted.

The Elo parser is strict — it only accepts well-formed temporal values like
`D2024-01-15` or `P1D`. But the programmatic AST API (used when embedding Elo
as a library) accepts arbitrary strings. A crafted value could break out of the
generated string literal and inject code in the target language.

For example, passing `'+process.exit(1)+'` as a date value would produce:

```javascript
DateTime.fromISO(''+process.exit(1)+'')
```

That's valid JavaScript that executes `process.exit(1)`.

The fix is straightforward: all emitters now sanitize literal values using
`JSON.stringify` (JavaScript and Ruby) or single-quote doubling (SQL), consistent
with how string literals were already handled. We added regression tests that
eval the compiled output with a mock `process.exit` to prove the injection
cannot execute.

Thanks to [naoyashiga](https://github.com/naoyashiga) for reporting this vulnerability.

If you use Elo's compiler API with untrusted input, upgrade to 0.9.7.

## What's Next

We keep chipping away at the [vision](/about): a simple, safe, portable
expression language. Safety is a core design principle — finding and fixing
this vulnerability reinforces why we take it seriously, even in a small language.

[Try Elo](/try) or check the [Changelog](https://github.com/enspirit/elo/blob/main/CHANGELOG.md) for details.
