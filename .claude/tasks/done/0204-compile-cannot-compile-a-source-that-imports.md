# compile() cannot compile a source that imports

## Symptom

`compile()` is the entry point a host embeds. Give it a source with an import
and it refuses, correctly and clearly:

```js
compile("import './shared' as s\n{ a: s.twice(1) }")
// Cannot import './shared': reading a module needs a module loader,
//   and this host reads one source
```

The refusal is right — there is nothing for it to read from. What is missing is
the way to say what to read from: `CompileOptions` has `runtime` and nothing
else.

So a host that wants imports reassembles the tail of `compile()` by hand:

```js
const scope = loadProgram(source, { loader, file });
const ast   = scopeProgram(scope, parse(scope.body));
const code  = compileToJavaScript(ast);
new Function('DateTime, Duration, Interval', `return ${code}`)(DateTime, Duration, Interval);
```

That last line is `compile()`'s body, copied out of the library, including the
list of runtime dependencies to inject — which is internal and will drift.

And three things such a host needs are not exported from `index.ts`:

| | |
| --- | --- |
| `nodeLoader` | the filesystem loader both CLIs use |
| `readProgram` | the `--lines` reading, i.e. one expression per line |
| `splitTypePrelude` | lifting a type prelude off a source |

`typeof` is `undefined` for all three on the built package.

## Why it matters

The feature exists and the CLIs use it, so an import works from `elo` and
`eloc` but not from a program that embeds the compiler — which is the main way
Elo is used. The host either does without imports, or copies internals.

`nodeLoader` not being exported is a deliberate-looking consequence of keeping
`index.ts` free of `fs`, which is the right call: *"the web playground bundles
the compiler for a browser, where there are no files to read and an import is
simply refused."* That reason argues for a separate entry point, not for no
export.

## What it should be

1. `compile(source, { runtime, loader, file })`, doing what `elo` already does
   with the same three inputs. A host with no `loader` keeps today's refusal
   word for word.

2. `nodeLoader` exported from a **node-only** entry — `@enspirit/elo/node` or
   similar — so that `index.ts` stays importable in a browser. A host writing
   its own loader is fine and is sometimes what it wants (a map of sources, a
   database, a bundler's virtual filesystem); having to write one to read a
   file is not.

3. `readProgram` exported. A source written as one assertion per line is a
   convention Elo's own corpus relies on and that `--lines` serves; a host
   that wants to run such a file today has to split it itself, which means
   finding expression boundaries — a parser's job, badly redone outside the
   parser.

`splitTypePrelude` is lower value than the other two: with `loadProgram`
exported, a host rarely needs the prelude alone. Worth exporting only if it
turns out to be what someone reaches for.

## Tests

- `compile()` with a `loader` compiles and runs the four-file diamond from
  0201, from a host that is not a CLI.
- `compile()` without a `loader` still refuses with today's message.
- Importing the browser entry point does not pull in `fs` — a test that keeps
  the separation honest, since the whole reason for a second entry point is
  that this stays true.
- A file of per-line assertions runs from a host via `readProgram`, with the
  same results as `elo --lines`.
