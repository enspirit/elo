# A lambda with two parameters of the same name compiles to nothing that runs

> Found while fixing 0196 (a let that binds the same name twice), by asking
> which other constructs bind a list of names.

## Symptom

`fn( a, a ~> a )` is accepted, and every target emits code the target itself
refuses to parse:

```
$ eloc -e "let f = fn( a, a ~> a ) in f(1, 2)" -t js -p -x | node
SyntaxError: Duplicate parameter name not allowed in this context

$ eloc -e "let f = fn( a, a ~> a ) in f(1, 2)" -t ruby -p -x | ruby
syntax error found (SyntaxError)

$ eloc -e "let f = fn( a, a ~> a ) in f(1, 2)" -t python -p -x | python3
SyntaxError: duplicate argument 'a' in function definition
```

SQL refuses lambdas outright, so it has nothing to say here.

This is worse than the `let` case 0196 fixed: there, two of four targets ran
the program and disagreed on the answer. Here no target runs it at all — the
compiler emits a syntax error in three languages and calls it a day.

## Why

`lambda(params, body)` in `ast.ts` takes the parameter list as given, and the
compilers emit it verbatim: `(a, a) => a`, `->(a, a) { a }`,
`lambda a, a: a`. Nothing checks that the names are distinct. The same hole
`letExpr` and `typeDef` had.

## Shape of a fix

`assertDistinctNames` already exists in `ast.ts` for exactly this — `letExpr`
and `typeDef` call it. Have `lambda()` call it too:
`Duplicate parameter 'a'`.

Watch the two shapes a parameter list can take, and whichever other paths
build a lambda node:

```
fn( a, a ~> a )          # explicit parameters
fn( a, a ~> a )(1, 2)    # immediately applied
```

A parameter that shadows an outer binding is a different thing and stays
legal: `let a = 1 in fn( a ~> a )` is one name per scope.

The acceptance assertion is the shadowing pair that must keep working, plus a
unit test for the refusal, since a refused program has no fixture.
