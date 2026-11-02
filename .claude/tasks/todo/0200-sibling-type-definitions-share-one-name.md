# Two sibling type definitions of the same name share one name in Ruby and Python

> Reported while implementing 0199 (imports). Ruby warned
> `already initialized constant Doubled` while running
> `test/fixtures/reference/imports.elo`: a module's prelude is inlined once per
> import of it, which puts two definitions of the same type name in two
> *sibling* scopes of one program.

## Symptom

```elo
assert((let f = (let T = Int in fn( x ~> x |> T )) in (let T = String in f('1'))) == 1)
```

| Target | Result |
| --- | --- |
| JavaScript | passes |
| Ruby | **fails** — `Assertion failed` |
| Python | **fails** — `Assertion failed` |
| SQL | refuses type definitions altogether |

`f` is built under `T = Int` and called under `T = String`. The two `T`s are
in sibling scopes — the first is closed before the second opens — so the
transform leaves both named `T`, as 0198 says it should: *"sibling scopes still
both say x"*.

That holds for a binding, because the targets scope one. It does not hold for
a **type definition**: Ruby emits `T = ->(v) { … }`, an uppercase name, which
is a constant in the enclosing scope rather than a local; Python emits
`T := …`, which assigns in the enclosing function. So the second definition
overwrites the first, and a lambda built under the first sees the second when
it is finally called.

JavaScript is right because its type definitions emit `const` inside an
immediately-invoked arrow function, which is a scope of its own.

## Why it matters more now

Imports inline a module's type prelude into the value of the module's binding.
Two modules declaring a type of the same name — or one module imported through
two paths — put two definitions of that name in one program, as siblings.
`imports.elo` only warns today because both definitions of `Doubled` happen to
be identical and nothing calls across them. Two *different* types of the same
name would silently pick one.

## What it should be

One name stands for one thing, in every target — which is what 0199 (the
shadowing work) established for nested scopes. The fix is the same idea
applied to a wider question: a type definition needs a name that is unused in
the whole program, not merely in the scopes enclosing it. The transform
already generates `x__2` names; what it lacks is the memory that a name was
used by a sibling it has already walked and closed.

Note that this is about *type definitions* specifically. A `let` binding is a
local in all four targets, so sibling bindings of the same name are fine and
must keep their names — changing those would churn the whole fixture corpus
for nothing.

## Tests

The assertion above, on every target, in `test/fixtures/reference/`. Both
shapes are worth pinning:

- a lambda built under one definition and called under another (above);
- two sibling definitions of the same name with *different* types, each used
  in its own scope, which must each coerce their own way.
