# What the dynamic axis found

The force-dynamic acceptance axis (0249) runs the whole corpus with every call
dispatched as though no operand type were known. On its first run it reported
six diverging fixtures on JavaScript, five on Ruby, three on Python. They are
listed in `test/acceptance/dynamic-divergences.txt` so the axis is green and
enforcing; this task is the fixes.

Two reproduce in ordinary Elo with a lambda, which makes them live bugs rather
than artefacts of the flag. Those two come first.

## REAL 1 — `String(x)` returns the display form on the dynamic path

```
$ ./bin/elo -e "String('hello')"
"hello"
$ ./bin/elo -e "(let f = fn( x ~> String(x) ) in f('hello'))"
"'hello'"
```

The `String:any` implementation is `kString`, which is the **inspect** helper:
it quotes strings, so that `[1, 'a']` renders as `[1, 'a']`. `String(x)` the
selector means *convert to string*, and on a string that is the identity. The
two are different functions and the dynamic path picked the wrong one.

Affects every target that routes `String:any` through its inspect helper.
Check `kString`/`k_string` and whether the display form is wanted anywhere
else before changing it — `typeOf`-style rendering may depend on it, in which
case the fix is a second helper rather than a change to this one.

A correctness bug, not a security one. Red-first fixture: the pair above, on
every target.

## REAL 2 — `fetch(d, p)` with an object path raises a host TypeError

```
$ ./bin/elo -e "fetch({a: 1, b: 2}, {x: .a, y: .b})"
{"x":1,"y":2}
$ ./bin/elo -e "(let f = fn( d, p ~> fetch(d, p) ) in f({a: 1, b: 2}, {x: .a, y: .b}))"
Error: TypeError: path is not iterable
```

`fetch` has two forms — a path (`fetch(d, .a.b)`) and a mapping
(`fetch(d, {x: .a})`) — told apart by the *type* of the second argument.
With the type unknown, the path form is chosen and the object is iterated.

This one is worse than wrong. The security page promises *"It never crashes
uncontrollably. Bad input yields a typed Elo error, not an uncaught native
exception"*, and this is an uncaught native exception from ordinary source.
It should be scored as a (low) violation of a stated property, not merely as a
semantic divergence.

The fix is for the dynamic `fetch` to dispatch on the **runtime shape** of the
path — a plain object means the mapping form, an array or string the path
form — the way `kMul` dispatches on whether its operand is a String. Four
targets.

## FORCED — only the all-`any` compilation reaches these

Not reproducible with a lambda today, so not reachable from source. They are
still worth closing: each is an `any` implementation that has never run, which
is exactly what `dispatch-coverage` lists, and "unreachable today" is a
property of the current type inference rather than a guarantee.

- **`Interval:any`** (`interval-arithmetic`, all three targets) — on the
  dispatch-coverage unreached list for all four targets, so the axis is the
  first thing ever to run it.
- **`concat:any,any`** (`concat`, JavaScript) — `concat(Array, Array)` is a
  *type error* on the typed path and succeeds on the dynamic one. So "it
  compiles" does not mean the same thing on the two paths, which is the same
  class `registry-consistency` was written for. Decide which is right: either
  the typed path should accept list concatenation, or the dynamic one should
  refuse it.
- **`typeOf-arithmetic`, `temporal-duration`** (Ruby) — not yet
  characterised.

## Not a divergence

`temporal-startof-endof` and `dynamic-ambiguous-dispatch` fail identically on
`main` under every axis. That is the `startOf`/`endOf` timezone bug, which is
`0240`'s neighbourhood, not this one.

## How to work this list

Each entry gets a fixture asserting the typed and dynamic forms agree — which
CLAUDE.md asks for anyway — and then its line comes out of
`dynamic-divergences.txt`. The axis turns the file red if a fix is incomplete
and red if a line is stale, so the list can only shrink.
