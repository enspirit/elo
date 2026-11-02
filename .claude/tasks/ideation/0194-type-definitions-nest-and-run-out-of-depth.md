# A hundred type definitions is one too many

> Found while implementing 0193 (the type prelude), by asking what a big
> schema file would do.

## Symptom

A prelude — or a `let` — of more than about a hundred type definitions is
refused:

```
$ python3 -c "print('\n'.join('T%d = Int' % i for i in range(120))); print(\"'1' |> T0\")" > many.elo
$ eloc many.elo
Compilation error: Error: Line 121: Error: Maximum transform depth exceeded (100)
```

## Why

A type definition is one AST node wrapping the *body* it scopes, so N
definitions are N levels of nesting:

```
typedef A in typedef B in … in expression
```

The transform's depth guard — which exists so that a deeply nested expression
cannot overflow the host stack — counts each of those levels, and stops at 100.
So the limit is on the *number of types a file declares*, not on how deep any
one of them is.

Value bindings had exactly this problem and it was fixed by keeping them flat:
`letExpr` holds `bindings: LetBinding[]` in a single node rather than nesting
one `let` per binding (see the comment in `ast.ts`). `TypeDef` never got the
same treatment.

## Why it matters more now

Before the prelude, a hundred type definitions in one expression was unlikely.
A prelude is meant to collect the types a file shares — and, once `import`
lands, the types a *project* shares — so a hundred is no longer absurd. The
error message is about depth, which says nothing about the real cause.

## Shape of a fix

Give `TypeDef` a list of definitions, as `LetExpr` has a list of bindings:
`{ type: 'typedef', definitions: TypeBinding[], body: Expr }`. The IR node and
the four compilers each emit a chain today; they would emit a sequence
instead — which is what they already produce textually (`const A = …; const B =
…; return body`). `withTypeDefs` then builds one node rather than a chain, and
the prelude costs one level of depth whatever its size.

Not urgent: a program over the limit is refused, not miscompiled, and the
refusal is bounded (the guard is doing its job). It is the message and the
ceiling that are wrong.
