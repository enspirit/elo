# The playground depends on three private names

> Found while enforcing 0221. Not a defect — a thing to know.

## Symptom

`web/src/scripts/controllers/playground_controller.ts` imports from
`@enspirit/elo`:

```ts
import {
  parse, compileToRuby, compileToJavaScript, compileToJavaScriptWithMeta,
  compileToSQL, compileToPython, getPrelude, isPreludePrependable,
  defaultFormats, getFormat
} from '@enspirit/elo';
```

Three of those are classified **private** by 0221: `compileToJavaScriptWithMeta`,
`defaultFormats`, `getFormat`. Private means no promise — so our own flagship
host is written against names a patch release may move.

## Why it is not simply a bug

Private is the right classification for all three. `getFormat` and
`defaultFormats` are the format registry, whose *names* carry no promise while
the formats themselves stay public through the binaries;
`compileToJavaScriptWithMeta` exposes emission metadata, which is private by
the same rule that makes the generated code private.

And the playground is ours. It ships from this repository, is built in CI, and
moves in the same commit as the compiler. Depending on a private name is
exactly what being inside the repository licenses.

## What to decide

Either is defensible, and the choice is about what the playground is *for*:

1. **Leave it, and say so.** The playground is a first-party consumer, not an
   example of how to integrate. A comment at the import, pointing at the tier
   list, stops the next reader from copying it as good practice.
2. **Promote what a real host would need.** If a third-party playground would
   want the same three, that is evidence they belong in a public tier — most
   plausibly `getFormat` / `defaultFormats`, since choosing an input format is
   an ordinary host concern. `compileToJavaScriptWithMeta` is harder to argue:
   its metadata is about emission.

Worth noting for (2): the playground is the best available evidence of what a
host actually needs, which is how this was found at all. If we ever write a
second host, compare its imports against the public tier before deciding.

## Tests

If anything is promoted, move it in `test/unit/public-surface.unit.test.ts` and
the README's tier list — the test already fails if those two disagree. If it
stays private, no test changes; add the comment.
