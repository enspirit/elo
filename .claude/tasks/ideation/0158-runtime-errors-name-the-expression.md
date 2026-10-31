## Problem to solve

A runtime failure shows the generated code, not the expression that was
written:

```
(_.node.get_class[0] ?? null).start_date
```

Neither `[0]` nor `??` is Elo. The author reads code they never wrote, with no
line number and no field name.

## Context

Reported by Bricks (point 2). Partly relieved already: two 1.1.0-era fixes —
the `at`/`first` grouping and the integer receiver — removed cases where
generated code was the *only* thing the author saw. The underlying gap stands.

Related but separate, reported as point 9: without the luxon runtime injected,
`NOW` raises `Cannot read properties of undefined (reading 'now')`, which does
not name the runtime. They call it their own fault and still ask for a
compile-time refusal.

## Two pieces, very different sizes

**Small, and worth doing on its own.** `compileToJavaScriptWithMeta` already
reports whether the input is used; the same pass can report which runtime
dependencies an expression needs. `compile()` then refuses when one is absent,
naming it. That closes point 9 without touching the IR.

**Large.** Carrying source positions into the IR and mapping a runtime failure
back to the expression that caused it. This is a project: positions through
parser, AST, IR and four emitters, plus a decision about what the host does
with them. Worth scoping separately.
