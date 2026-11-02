## Problem to solve

(follow-up of 0193). We would like a real decomposition mechanism via imports.
It must support importing types and importing logic. And preserve source
locations for tracability (e.g. error messages).

## Idea

```elo
# types.elo

Age = Int(a | a >= 0)

Person = {
  name: String,
  age: Age
}
```

```elo
# reusable.elo

let
  double_fn = fn(x ~> x*2 )
in
  {
    double: double_fn
  }
```

```elo
# main.elo
import types { Person } from './types'
import from './reusable' as r

let
  person = _ |> Person
in
  r.double(person.age)
```

## Commnts

Syntax and semantics to be discussed/chosen. Let's find something simple,
consistent, intuitive.

## Design, chosen with the author

A module is already a well-defined thing since 0193/0195: **an optional type
prelude, then one expression**. So a module needs no new concept to export
anything — its prelude is its types, its expression is its value.

And Elo compiles to one self-contained expression per target, with no runtime
to link against. So an import can only be **compile-time inlining**.

### Syntax

```
program    -> import* typePrelude expr?
import     -> 'import' '{' name (',' name)* '}' 'from' STRING
            | 'import' STRING 'as' IDENTIFIER
name       -> UPPER_IDENTIFIER | IDENTIFIER
```

- `import { Person, double } from './m'` — **case decides the namespace**, as
  it does everywhere else in Elo: `Person` comes from `./m`'s type prelude,
  `double` from a property of `./m`'s value.
- `import './m' as r` — binds `./m`'s value to `r`, reached by ordinary member
  access. It does **not** bring in `./m`'s types: there is no qualified type
  syntax, and an alias cannot make one up. Types always come through the named
  form, which may name the same path on another line.
- `import`, `from` and `as` are **contextual**, not reserved: they are only
  recognised in the import header, so no existing program changes meaning.

### Semantics

- Imports come first, before the type prelude, which may use what they bring in.
- An imported type is **expanded**: the module's own type names are substituted
  into it, so the importer gets one self-contained type and no name of the
  module's leaks into its scope. A prelude is ordered, so expansion terminates.
- A module's value is bound **once per program**, under its alias if it has
  one. Named value imports are member accesses off that binding.
- A module's expression may use `_`; inlined at the top of the program, that
  is the program's input. A module wanting an argument takes a parameter.
- Paths resolve against the importing file's directory, `.elo` appended. A path
  must be relative or absolute — a bare `'types'` is refused, to keep that
  spelling free for a future package. Cycles are refused, naming the chain.
- A source location gains the file it came from, so a diagnostic inside a
  module says which module.

## Addendum: what was done

Imports, as designed above. The one thing worth saying first is how little of
the compiler had to learn about them: `src/modules.ts` turns a header into the
**type definitions and let bindings it stands for**, and from there the tree is
one a single source could have been written as. No new IR node, no new
semantics to make portable, no compiler change.

```
import { Person, Age } from './types'    ->  typeDef([Person = <expanded>, …],
import { double } from './reusable'          let r = <reusable's expression>,
import './reusable' as r                         double = r.double in …)
```

### Red first

`test/fixtures/reference/imports.elo` — **12 assertions, red on JavaScript,
Ruby and Python**: the file did not compile at all, `Unexpected LBRACE after
the end of the expression`. It has no `.expected.sql`, like every other fixture
that defines a type: SQL refuses type definitions and lambdas, so it refuses
what an import brings in, exactly as it refuses the same thing written inline.

Three more assertions in `reference/lambda.elo` were **red on the same three
targets** (`Unknown function f(Int)`), verified by `git stash push
src/transform.ts` after the fact. They are the one language change underneath
the feature, below.

### A module is a file, not a new construct

Its type prelude is what it exports as types; its expression is what it
exports as a value. So `reusable.elo` is an ordinary program, and the alias
form is ordinary member access on it. Nothing new to write, nothing new to
learn, and `examples/` style files become importable as they are.

An imported type is **expanded** rather than renamed: the module's own type
names are substituted into it. That is both simpler (no fresh-name machinery,
no cross-module scope) and tighter — `import { Person }` cannot make `Age`
visible just because `Person` is built on it. A prelude is ordered, so
expanding always terminates. The cost is duplication in the emitted parsers,
which is the same cost inlining already pays everywhere else.

### The one language change: calling a function stored in data

`r.double(2)` has always worked — "functions stored in data may be applied".
But `import { double } from './m'` binds `double` to `r.double`, and a *name*
bound to a field read was refused: a field read is opaque, so the name is typed
`any`, and the call fell through to a stdlib lookup that found nothing.

The transform now remembers which names are bound to a field read and applies
those. The narrowness is deliberate: applying any `any` would let a lambda
parameter be applied to itself, which is how Elo's termination guarantee
breaks. A field read cannot be that, and `o.g(1)` was already allowed, so this
adds no power — `let f = o.g in f(1)` now means what `o.g(1)` means. Five unit
tests pin the boundary, and regenerating the whole corpus produced **no diff**.

### Locations across files

`SourceLocation` gained a `file`, set by the parser for each module it reads,
so a diagnostic inside a module says which module:

```
$ eloc --typecheck main.elo
broken.elo:1:24: error: No signature of operator '-' accepts sub(String, Int)…
```

`eloc` had to stop renumbering those: in `--lines` mode it rewrites a
diagnostic's line to the source line, which for an inlined module would point
into the wrong file.

### Where the filesystem is, and is not

`src/modules.ts` reads no files — it is given a `ModuleLoader`. That is what
lets the same linking run under a filesystem (`src/node-loader.ts`, used by
both CLIs), under a map of sources (every test in `modules.unit.test.ts`), or
not at all: the playground and `parse()` have no loader, so an import there is
refused rather than silently resolved. It also keeps `fs` out of the browser
bundle, which `index.ts` now exports the linker into.

The security page said compilation does "no input-driven module loading",
which is no longer true. It now says what is: an import is the one capability
compilation has, it reads an `.elo` file and only reads it, and a host that
compiles expressions it does not trust must not hand over a filesystem.

### Two guards

- **Cycles** are refused, naming the chain from where the author started.
- **Inlining is budgeted** at 200 modules. The depth guard does not bound it:
  a module imported by two others is inlined in both, so a graph that branches
  at every level doubles per level — a dozen levels of small files ask for
  thousands of copies of the leaf, and the depth limit of 32 would ask for
  billions. Both guards have tests.

### The fixture corpus learned about modules

A `.elo` under a `modules/` directory is a module a fixture imports, not a
fixture: the corpus-wide rules — an assert on every line, an expected file per
target — are not about it, and its code is covered inlined into the fixture
that imports it. Four scanners and `regenerate-fixtures.sh` skip those
directories; `CLAUDE.md` says so next to the `--lines` convention.

### Where the documentation went

Imports are a construct of their own, so they are documented as one rather
than as a footnote to types: **Learn chapter 10, "Working Across Files"**, and
a top-level **Imports** section in the Reference, under a `Files` heading in
both the sidebar and the header menu. Chapter 8 (Data Validation) now ends by
pointing at chapter 10 — a file of type definitions is worth having because
another file can import it — and the CLI section's "A file is one program"
links to the Imports section for the header it describes.

The import examples carry `data-needs-files`, a new opt-out in
`website-examples.unit.test.ts` beside `data-invalid`: an example that only
means something as one file among several cannot be compiled on its own, and
is not offered to the playground either, which has no files. They are covered
for real by `reference/imports.elo`, on every target.

### A bug found on the way

Ruby warned `already initialized constant Doubled` while running the new
fixture, because a module's prelude is inlined once per import of it. Two type
definitions of the same name in *sibling* scopes share one name in Ruby and
Python — a pre-existing defect, reachable without imports, and wrong rather
than merely noisy when the two types differ. Filed with its reproduction as
`todo/0200-sibling-type-definitions-share-one-name.md`; it is the sibling case
of the shadowing work in 0198, and needs the same fix applied more widely.
