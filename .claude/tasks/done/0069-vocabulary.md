## Problem to solve

I'd like the vocabulary to be perfect for 1.0. Let's improve.

## Idea

What I have in mind :

- Avoid `Object` and `Array` and favor `Tuple` and `List` instead
- Avoid `Lambda` terminology, use `Function` everywhere. Btw `typeOf(fn(...))`
  should not return `Fn` (because of the `fn`) syntax, but `Function` as of
  the type name.
- I'm not even sure that `Variable` is a good term, since variables in Elo do
  never change, and are thus not variables per se.
