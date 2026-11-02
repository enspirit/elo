# A module imported twice is inlined twice

> Found while exercising 0199 (imports) on a program built out of many small
> modules. Nothing is wrong with the result; the cost is in the emission.

## Symptom

Four files. `shared` is imported by `a` and by `b`, and both are imported by
`top` — a diamond, the shape any shared helper takes the moment two modules use
it.

```elo
# shared.elo
let twice = fn( x ~> x * 2 ) in { twice: twice }

# a.elo
import './shared' as s
{ a: s.twice(1) }

# b.elo
import './shared' as s
{ b: s.twice(2) }

# top.elo
import './a' as a
import './b' as b
{ a: a.a, b: b.b }
```

`top.elo` evaluates to `{"a":2,"b":4}`, which is right. But `twice` is emitted
**twice**, on JavaScript, Ruby and Python alike: once inside `a`'s inlining and
once inside `b`'s.

That is the documented behaviour — *"Inlining duplicates: a module imported by
two others appears in both"* — and `MAX_INLINED_MODULES` exists because of it.
The question this task raises is whether it has to be that way.

## How it grows

A chain of N modules, each importing the one before it and a shared helper,
with one program at the top reading all N. Copies of the helper in the emitted
JavaScript:

| N | copies | bytes |
| --- | --- | --- |
| 2 | 3 | 800 |
| 3 | 6 | 1 264 |
| 4 | 10 | 1 889 |
| 5 | 15 | 2 675 |
| 6 | 21 | 3 622 |
| 8 | **36** | 5 999 |

Exactly N(N+1)/2. The budget of 200 is therefore reached by a graph of about
twenty honest modules, and the author has no way to see it coming.

Bytes are the smaller half. The **work** is duplicated too: a module's
expression is evaluated once per path that reaches it, so in the table above
the first module in the chain is computed eight times for one call of `top`.
For pure expressions that is merely waste; for a module whose expression
asserts something, it is eight assertions where the author wrote one.

## Why it matters

It makes the language reward the wrong thing. Today the cheapest program is the
one with the fewest, largest modules — so an author who splits a long
computation into named steps, which is the reason to want modules, pays
quadratically for it. A module system should make small modules free.

It is also the cause of 0200: *"a module's prelude is inlined once per import
of it, which puts two definitions of the same type name in two sibling scopes
of one program."* Sharing the module removes that second definition, so this
task and 0200 are two readings of one cause. Worth deciding which one to fix;
fixing this one may retire the other.

## What it should be

One binding per distinct module, at the root of the program, in dependency
order — rather than one per importer.

Three things already in place say this is less work than it sounds:

- the `ModuleLoader` already returns an `id`, and *"two imports resolving to
  the same id are the same module"* is already the stated contract;
- that id is already what refuses a cycle, so the graph is already walked and
  known;
- `scopeProgram` already binds module values outermost, because *"a module's
  expression is inlined where it can see nothing of the importer, which is what
  makes it a module rather than a macro"*. A module is therefore already closed
  over nothing but `_`, and `_` at the root is the same `_` it sees today.

Hoisting is sound for that last reason, and nothing downstream learns anything
new: still no IR node, still no compiler change, still nothing to make portable.

The budget should stay as a guard, but it would stop being something a normal
graph can hit.

## Tests

- The diamond above emits `twice` once, on all four targets.
- The chain table collapses to one copy per module at every N.
- A module whose expression is `assert(...)` runs its assertion once, however
  many importers it has — the observable form of the duplicated-work half.
- Regenerating the fixture corpus produces no change in any value.
