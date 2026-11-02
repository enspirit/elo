# A let that binds the same name twice means four different things

> Found while fixing 0194 (flattening type definitions), by asking what the
> flat emission does with a repeated name.

## Symptom

`let` keeps its bindings in one flat node, so two bindings of the same name
land in one scope — and every target reads that differently:

```
$ eloc -e "let x = 1, x = 2 in x" -t js -p | node
SyntaxError: Identifier 'x' has already been declared

$ eloc -e "let x = 1, x = 2 in x" -t ruby -p | ruby     # 2
$ eloc -e "let x = 1, x = 2 in x" -t python -p | python3 # 2
$ eloc -e "let x = 1, x = 2 in x" -t sql
(SELECT (SELECT x FROM (SELECT 2 AS x) AS _let) FROM (SELECT 1 AS x) AS _let)
```

JS refuses to run, Ruby and Python answer 2, and SQL nests one subquery per
binding so the inner one wins — which is also 2, by a different mechanism.
A program that compiles must behave the same everywhere; this one does not
even run everywhere.

## Why

`letExpr` holds `bindings: LetBinding[]` in a single node (see the comment in
`ast.ts`), and the compilers emit one declaration per binding in one scope:
`const x = 1; const x = 2;` is a JavaScript `SyntaxError`, while `x = 1; x = 2`
is a plain reassignment in Ruby and Python.

0194 gave `TypeDef` the same flat shape and hit the same wall, so
`typeDef()` refuses a duplicate name:

```
$ eloc -e "let T = Int, T = String in '1' |> T" -t js
Compilation error: Error: Duplicate type definition 'T'
```

Value bindings deserve the same treatment, and the asymmetry between the two
is the only reason this is a separate task.

## Shape of a fix

Refuse a repeated name in `letExpr`, as `typeDef` does — `Duplicate binding
'x'`. Nested `let`s are untouched: `let x = 1 in let x = 2 in x` is real
shadowing, it is unambiguous, and it stays legal on every target.

The acceptance assertion is the pair that must agree:

```
assert((let x = 1 in let x = 2 in x) == 2)   # shadowing, still legal
```

plus a unit test for the refusal, since a refused program has no fixture.
