# Three blocks no call can reach

## Symptom

Three pieces of the parser and the JavaScript compiler cannot run.

`src/parser.ts:1919` — `isDecimalNumberToken()` is defined and never called.
`src/parser.ts:1944` — `parsePathSegment()` is defined and never called. Both
are leftovers of the datapath lexing work: the live code splits a `NUMBER`
token itself, in `parseNumericPathSegments` and `parseAdditionalPathSegments`.

`src/compilers/javascript.ts:243-257` — the `let` flattening stops when it sees
a binding whose name is already bound, and emits a nested IIFE instead:

```ts
if (seenNames.has(b.name)) { hasShadowing = true; break; }
```

Nothing reaches it. Since 0198 the transform renames a binding that shadows
(`localName` / `unusedName`, `src/transform.ts:158-178`), so two bindings of one
name never arrive at a compiler:

```
$ eloc -t js -e "let x = 1 in let x = x + 1 in x"
(function(_) { return (() => { const x = 1; const x__2 = x + 1; return x__2; })(); })
```

Ruby, Python and SQL have no such branch, which is the tell: one target carries
a workaround for a problem that is now solved upstream, and the other three do
not.

## Why it matters

A branch that cannot run is worse than no branch: it reads as a live concern.
The next person to touch `let` emission has to work out whether shadowing is
handled here or in the transform, and the honest answer — both, once — is only
findable by experiment.

## What it should be

All three gone.

## Tests

Pure deletion, covered by what is already there: the datapath fixtures exercise
every path through `datapathParse`, and `transform.unit.test.ts:782` pins the
renaming that makes the JavaScript branch unreachable. No new test.

The one thing to check by hand is that `seenNames` can go too — it exists only
to feed the dead condition.
