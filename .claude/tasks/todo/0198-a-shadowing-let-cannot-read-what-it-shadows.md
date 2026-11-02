# A shadowing let cannot read what it shadows, on JavaScript only

> Found while fixing 0196 (a let that binds the same name twice), by asking
> what the nesting it recommends instead actually does.

## Symptom

`let x = 1 in let x = x + 1 in x` is a nested shadowing — the inner binding's
*value* reads the outer `x`. Three targets say 2; JavaScript throws:

```
$ eloc -e "assert((let x = 1 in let x = x + 1 in x) == 2)" -t js -p -x | node
ReferenceError: Cannot access 'x' before initialization

$ eloc -e "assert((let x = 1 in let x = x + 1 in x) == 2)" -t ruby -p -x | ruby      # passes
$ eloc -e "assert((let x = 1 in let x = x + 1 in x) == 2)" -t python -p -x | python3 # passes
$ eloc -e "let x = 1 in let x = x + 1 in x" -t sql
(SELECT (SELECT x FROM (SELECT x + 1 AS x) AS _let) FROM (SELECT 1 AS x) AS _let)   -- 2
```

Plain shadowing that does *not* read the outer name works everywhere:
`let x = 1 in let x = 2 in x` is 2 on all four targets, and
`test/fixtures/reference/let-expressions.elo` asserts it.

## Why

The JS compiler emits a `const` inside an arrow IIFE:

```
(() => { const x = 1; return (() => { const x = x + 1; return x; })(); })()
```

The inner `const x` hoists over the whole inner arrow body, so the `x` in
`x + 1` resolves to the inner binding, not the outer one, and reads it in its
temporal dead zone. Ruby and Python evaluate the value before rebinding the
name, and SQL puts each binding in its own subquery, so all three read the
outer `x`.

Elo's semantics are the ones three targets agree on, and they are the ones a
reader expects: the value of a binding is evaluated in the scope *around* the
binding, before the name is bound.

## Why it matters more now

0196 refuses `let x = 1, x = x + 1 in x` and the documented way to say it is
to nest — which is exactly the program that does not run on JavaScript. The
workaround the reference now recommends has a hole on one target.

## Shape of a fix

The JS emission has to keep the value out of the scope the name is bound in.
Two candidates, in order of preference:

- Pass the values as arguments: `((x) => body)(value)` per `let` node, which
  evaluates every value outside the new scope by construction. Watch what this
  does to a multi-binding `let`, where later values read earlier names —
  `((x) => ((y) => body)(valueOfY))(valueOfX)` keeps that working and nests one
  arrow per binding, which 0194's depth lesson says to think about.
- Or rename the bound identifier to something unique and emit the value
  against the outer name. Cheap, but it makes the emitted code harder to read
  and every `let` pays for a case that is rare.

Prove it with an assertion that reads the shadowed name, on every target:

```
assert((let x = 1 in let x = x + 1 in x) == 2)
assert((let x = 1 in let x = x * 2, y = x in y) == 2)
```

and keep the dynamic counterpart, since lambda parameters are typed `any`:

```
assert((let f = fn( x ~> let x = x + 1 in x ) in f(1)) == 2)
```
