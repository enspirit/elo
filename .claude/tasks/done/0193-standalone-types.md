## Problem to solve

In preparation for an `import` feature, we would like types/schemas to be more
reusable. Also, they are a bit special, and probably deserve a specific
syntactic construct.

## Idea

Let's introduce a .elo file prelude, allowing to define types.

```elo
Input = { xs: [Int] }
Output = [Int]

let
  input = _ |> Input
in
  map(input.xs, fn(x ~> x*2)) |> Output
```

Syntactic sugar for (later, another file will be allowed to import types
defined like that)

```elo
let
  Input = { xs: [Int] },
  Output = [Int]
in let
  input = _ |> Input
in
  map(input.xs, fn(x ~> x*2)) |> Output
```

## Comments

* A .elo file with type definitions only is valid (and only useful for later
  import)
* Comma is optional at end of type definition in prelude

## Addendum: what was done

A `.elo` source may now open with a **type prelude**: a run of `Name =
typeExpr` definitions, before any expression. It is exactly the sugar asked
for — `withTypeDefs` folds the definitions into the `TypeDef` nodes a
`let Name = … in` would have produced — so nothing downstream of the parser
changed: no new IR node, no compiler change, no new semantics to make portable.

Red first: `test/fixtures/reference/type-prelude.elo` was **10 assertions red
on JavaScript, Ruby and Python** (the file did not compile at all: `Unknown
uppercase identifier 'Ints'`). SQL has no `.expected.sql` here — it refuses
type definitions altogether, as the other type fixtures already record.

### The prelude is file-wide, and a file is one expression per line

This is the one design decision the idea did not spell out. `eloc` and `elo`
read a file as **one expression per line** — that is what makes a fixture of
`assert(...)` lines work — so a prelude cannot simply be part of the expression
it precedes. `splitTypePrelude(source)` lifts it off the top and returns the
rest with the prelude region blanked out, so every remaining line keeps its
line *and column* numbers and diagnostics still point where the author looks.
Each line is then parsed and scoped under the file's definitions.

A consequence worth knowing: every emitted line carries the whole prelude's
parsers, since each line is its own program. Correct, and verbose. Sharing them
would mean making a file a single program, which is a much bigger change than
this one.

`parse()` reads a prelude too, so `-e "T = Int\n'42' |> T"`, the programmatic
`compile()` and the playground all accept one without going through a file.

### A file of definitions only

Valid, as asked, and it falls out rather than being special-cased: all its
lines are blank after the split, and both CLIs already skip blank lines. So
`eloc types.elo` prints nothing and exits 0. `parse()` on its own refuses it —
*"Expected an expression after the type definitions"* — because it must return
an expression and there is none.

### The vocabulary clash

"Prelude" was already taken: `eloc --prelude-only` emits a *target's runtime
helpers*. Calling both "the prelude" would be unreadable, so the new one is a
**type prelude** everywhere — docs, test names, `splitTypePrelude`.

### Three consistency tests had to learn about it

`compiler.integration`, `typecheck.integration` and `optimize-equivalence` all
re-read the fixture corpus line by line, each with its own copy of eloc's
splitting. They now go through `splitTypePrelude` as well, otherwise they
check a line against types it cannot see. `fixtures.integration` (every line
must be an `assert`) asks the same question of the body rather than of the
whole file.

### Two edges, both graceful refusals

- A prelude of more than ~100 definitions hits the transform's depth guard,
  because N definitions are N levels of nesting. Filed as
  `ideation/0194-type-definitions-nest-and-run-out-of-depth.md` — value
  bindings were made flat for exactly this reason and type definitions never
  were.
- The grammar is newline-insensitive, so `T = Int` followed by a line opening
  on `(` is read as the subtype constraint `Int(…)`. It fails to parse rather
  than compiling to something else, which is the right failure, and making the
  prelude line-sensitive would cost more simplicity than it buys.
