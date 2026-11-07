# The other end of the type axis

> "H1!"

H1 from `0244`: `npm test` already ran the acceptance corpus twice, once
normally and once as `ELO_OPTIMIZE=1`. That is a differential over how much
the compiler knows about types, and it is the most productive test the project
has. It had one end.

This adds the other. `--force-dynamic` compiles as though **no** operand type
were known, so every call is answered by the implementation that assumes
nothing — the one the typed path never exercises, and the one most of the
sandbox escapes have lived in: the `at()` escape, the `fetch()` prototype-chain
bypass, the unbounded `String * Int` on Ruby, the `%` that ran `sprintf`.

CLAUDE.md already asks authors to assert both paths by hand. This does it for
the whole corpus, and does not depend on remembering.

## What was built

| | |
|---|---|
| `TransformOptions.forceDynamic` | dispatch every call on `any` |
| all four compilers | the option, passed through |
| `eloc --force-dynamic` | documented in `--help` and README as the mirror of `--optimize` |
| `npm run test:acceptance:dynamic` | `ELO_FORCE_DYNAMIC=1 ./test/acceptance/test-all.sh`, in `npm test` |
| `test/acceptance/dynamic-divergences.txt` | the fixtures that do not agree yet, each with a reason |

One design point worth keeping. Only the **dispatch** is forced. Node types
are still inferred, so the static checks keep their real types — in particular
the refusal of `[1] * n`, which is a security guard and must not be switchable
off — and so do the emitters that read the shape of their operands: the
element type SQL casts an empty array to, the branch types COALESCE needs. What
changes is which implementation answers, nothing else.

The operator sites needed this explicitly: `transformBinaryOp` computes the
real operand types, uses them for the array-multiplication refusal and the
result type, and only then dispatches on `any`.

## What it found on the first run

Six diverging fixtures on JavaScript, five on Ruby, three on Python. Two
reproduce in ordinary Elo with a lambda, which makes them live bugs rather
than artefacts of the flag:

**`String(x)` returns the display form on the dynamic path.**

```
$ ./bin/elo -e "String('hello')"                              → "hello"
$ ./bin/elo -e "(let f = fn( x ~> String(x) ) in f('hello'))" → "'hello'"
```

`String:any` routes to `kString`, which is the *inspect* helper and quotes
strings. The selector means convert-to-string. Two different functions; the
dynamic path picked the wrong one.

**`fetch(d, p)` with an object path raises a host TypeError.**

```
$ ./bin/elo -e "(let f = fn( d, p ~> fetch(d, p) ) in f({a: 1}, {x: .a}))"
Error: TypeError: path is not iterable
```

`fetch` has a path form and a mapping form, told apart by the *type* of the
second argument. With the type unknown the path form is chosen and the object
is iterated. This one breaks a stated promise — *"Bad input yields a typed Elo
error, not an uncaught native exception"* — from ordinary source text, so it is
a (low) violation of a documented property rather than only a divergence.

Both are written up in `.claude/tasks/todo/0248`, with the four remaining ones
that only the all-`any` compilation reaches. Fixing them is that task; this one
is the axis, with the list making it green and enforcing in the meantime.

## SQL is excluded, and not as a concession

PostgreSQL resolves operators by the static types of their operands, so an
all-`any` compilation leaves it nothing to resolve on: 19 fixtures fail with
*"could not choose a best candidate operator"*. That is PostgreSQL refusing an
under-specified query, not Elo's dynamic path disagreeing with its typed one.
And SQL has no lambdas, so no Elo program can reach an `any` operand there in
the first place — the axis asks a question SQL cannot be asked. 0244 predicted
this; the reason is written into `test-all.sh` next to the skip.

## State

- `test:acceptance:dynamic` — Ruby 122, JavaScript 122, Python 122, all green,
  12/12/9 skipped (3 pre-existing + the divergence list).
- Unit 2016, integration 4196, plain and `ELO_OPTIMIZE` acceptance unchanged.
- `npm test` still exits 1 on the two JavaScript `startOf` timezone failures,
  which fail identically on `main` and predate this branch.

## Lesson

The axis is the cheapest item in 0244 that found real bugs, and the reason is
structural: it does not need a corpus of its own. H3 and H4 need hostile inputs
somebody invents; H9 needed 102 entries triaged. H1 reuses 122 fixtures that
already exist and asks one question of them that nobody had asked.

That is the pattern worth noticing across 0245–0249. The gates needed an
enumeration written down; H9 needed one read; H1 needed an existing corpus
pointed at a different compilation. In every case the leverage came from
re-using something already in the repository rather than from building a new
generator, and the two most expensive items on the list — hostile-value and
hostile-shape corpora — are still unbuilt and have found nothing.
