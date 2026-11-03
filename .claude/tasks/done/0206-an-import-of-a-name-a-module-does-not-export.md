# An import of a name a module does not export is not refused

> Found while exercising 0204 (`compile()` with a loader), looking for a
> refusal that names the module it came from.

## Symptom

A module's expression is what it exports as a value, and each property of it is
a name an importer may bring in. Importing a property that is not there is
accepted, and evaluates to nothing:

```elo
# reusable.elo — exports double and one
let double_fn = fn( x ~> x * 2 ) in { double: double_fn, one: 1 }
```

```elo
import { nope } from './reusable'
nope
```

```
$ eloc -x reference/imports-nope.elo | node
undefined
```

A typo in an import is a compile-time mistake that compiles. The type half of
the same import is refused, by name:

```elo
import { Nope } from './reusable'
# 'reusable.elo' defines no type 'Nope', imported from './reusable'
```

So the two namespaces an import reads disagree about the same mistake: the one
decided by an uppercase initial is checked, the one decided by a lowercase
initial is not.

## Why it matters

It is the one way an import can go wrong that the author does not hear about.
Everything else a module can be asked for — a module that is not there, a cycle,
a module with no expression, a type it does not define — is refused with a
message that names the module. A misspelled value name is not, and what it
produces is `undefined`, `nil`, `None` or `NULL`: the failure mode the README
already calls out as the one Elo exists to avoid.

It also gets worse the moment a module is reached through another: the name may
be spelled right against the wrong module, and nothing says so.

## What it should be

```
'reusable.elo' defines no name 'nope', imported from './reusable'
```

The information is there and in hand at the same place `exportedType` already
uses it: the module's value is parsed when the import is resolved, so an
`import { nope }` whose module ends in an object literal is checkable without
evaluating anything.

The hard part is deciding *when* it is checkable, and the answer must be
conservative:

- a module whose expression is an **object literal**, possibly under a `let` or
  a type prelude, has a known set of property names — check it;
- a module whose expression is anything else (a `|>` coercion, an `if`, a
  member access, `_`) does not — accept the import, as today.

A module written the way every module in the corpus is written is the first
case. Refusing only what is provably absent keeps this from becoming a static
type system for data, which Elo deliberately is not.

## Tests

- `import { nope } from './reusable'` is refused, naming the module and the
  name, on every target.
- `import { double }` from the same module still compiles and runs.
- A module whose expression is not an object literal accepts any name — the
  conservative half, and the one that keeps this from over-refusing.
- The refusal names a position, as every compile-time refusal now does (0203).

## Implemented

`exportedNames(value)` in `src/modules.ts` walks past the `let` and `typedef`
wrappers `scopeProgram` puts on a module's expression and returns the keys of
the object literal underneath, or `undefined` when the expression is anything
else. `assertExported` refuses a name a known set does not have, with the
message the task asked for:

```
'reusable.elo' defines no name 'nope', imported from './reusable' at line 2, column 1 of main.elo
```

The conservative half is what the task specified and is asserted: a module
ending in `_ |> T`, an `if` or a member read accepts any name, because its keys
only exist at run time. Refusing only what is provably absent is what keeps
this from becoming a static type system for data.

### The position came for free, for all five refusals

The task asked for a position on this refusal. It turned out none of the import
refusals had one — the type half did not either, so "the two namespaces
disagree about the same mistake" was true of the position as well as of the
check. One `locate(error, decl.loc)` around the body of the per-declaration
loop positions all of them at the line the author wrote, and a refusal raised
*inside* a module keeps the position it already has, since `locate` lets the
innermost frame win.

### Red first

Three new assertions in `modules.unit.test.ts` red, two green:

- red: a name the object literal does not have; the same through a type prelude
  and a `let`; the refusal on the second of two imports
- green already: the names the module does define still bind; a module whose
  expression is not an object literal accepts any name

No fixture, and no emission change: a program that is refused has nothing to
emit, so this lives in the unit tests. The corpus is unaffected —
`reference/imports.elo` imports only names its modules define.

Documented in the README and the website reference next to the cycle refusal,
since it changes what an import accepts.
