# What is Elo's public interface?

> Raised while deciding whether the changes since 1.1.1 were 1.2.0 or 2.0.0.
> The question could not be answered, because semver is a promise about a
> surface and we have never said what ours is. That is the actual blocker, and
> it will recur at every release until it is settled.

## The measurement

`@enspirit/elo` exports **66 names** at runtime. The README documents **five**
of them (`compile`, `binary`, `variable`, `literal`, and the `compileToX`
family). Nothing says which of the other sixty-one a host may depend on.

Thirty-three come from one line:

```ts
// src/index.ts
export * from './ast';
```

So every AST factory and every AST interface is public by accident rather than
by decision — `assertDistinctNames`, `locate`, `isLocated`,
`formatSourceLocation` and `withLetBindings` are compiler internals that a
`export *` published. Across 1.1.1 → 1.2.0 nothing was removed and 21 names
were added, so the surface only grows, and it grows without anyone choosing.

## What it already cost

`typeDef(name, typeExpr, body)` became `typeDef(definitions, body)` in this
release. Whether that was a breaking change was unanswerable: the factory is
reachable from the package entry, so it is published, but it is not documented,
so it was arguably never promised. It was made backward compatible — the right
call for one function, and not a policy.

The same question is open for the AST **node shapes**. A `typedef` node now
holds `definitions` where it held `name` and `typeExpr`. A host that *builds*
one is fine; a host that *reads* one is not. Nothing says whether reading an
AST node is supported, so nothing says whether that needed a shim too.

## What to decide

1. **The boundary.** Which of the 66 are supported? A defensible cut:
   - **Supported**: `compile`, `parse`, the four `compileToX`, `getPrelude` /
     `isPreludePrependable`, `toEloCode`, the typechecker entry points, the
     module loader entry points, the format adapters, and the AST *factories*.
   - **Internal**: the AST *node shapes* (so the IR and the transform can
     change freely), `locate` / `isLocated` / `formatSourceLocation` /
     `assertDistinctNames`, and anything under `src/compilers`, `src/bindings`,
     `src/ir.ts`, `src/transform.ts`, `src/stdlib.ts`.
   The hard part is the AST node shapes: `parse()` returns one, so a host
   already holds the value. Either the shape is public (and the IR work of
   0211–0214 would have been breaking), or `parse()`'s result is opaque except
   through documented accessors. Pick one and say it.

2. **How it is expressed, not just written down.** A list in the README rots.
   `export *` is what created the problem, so replace it with an explicit
   export list in `src/index.ts` — then the public surface is a file someone
   has to edit deliberately, and a test can assert the list matches the
   documentation.

3. **What a version number then means**, including whether refusing a program
   that used to compile is breaking. Three of this release's changes were
   decided ad hoc: a `.elo` file being read as one program (judged a bug fix),
   ill-typed calls being refused, and duplicate `let` bindings being refused.
   The rule we actually applied, and should write down, is that **a program the
   language never meant to accept is a bug fix, not a break** — but that rule
   needs stating, because it is doing a lot of work.

## Tests

- A unit test over `Object.keys(require('../src/index'))` pinned to the
  declared public list, failing in both directions: a new export that is not
  declared, and a declared name that is gone. That is the one test that makes
  the boundary real rather than aspirational.
- The README section documenting the surface, checked against the same list, as
  the website examples already are.

## Note

`README.md` documents a programmatic AST example that does not work and never
did — `binary('-', binary('*', variable('price'), ...))` compiled on its own
raises `Undefined variable: 'price'`, at 1.1.1 as well as now. Filed separately
as 0222; mentioned here because it is the same root cause, a surface nobody
checks.

## My Take

Public interface (breaking => upgrade major) :
- the language & stdlib, and intended semantics (still a bit unclear)
- `elo` and `eloc` binaries
- main Typescript functions allowing to parse/compile/evaluate/typecheck.

Protected interface (breaking => upgrade minor) :
- the AST structure and factory methods

Private interface: everything else.

From this, it is clear that we give few guarantees regarding generated code
in the 4 target languages and their own behavior. Users should not make too
much expectations about how Elo code translates to the target language while
relying on their dynamic behavior.

## Decided

The take above is adopted. Three tiers, and the tier a name sits in decides
what a break in it costs:

| Tier | Contents | A break means |
| --- | --- | --- |
| **Public** | the language and stdlib and their intended semantics; the `elo` and `eloc` binaries; the TypeScript entry points for parse / compile / evaluate / typecheck | major |
| **Protected** | the AST structure and its factory methods | minor |
| **Private** | everything else | nothing |

The protected tier is what makes this work. The AST is a real integration
surface — a host builds one to avoid going through Elo source text — but
pinning it to major would freeze the transform and the IR forever, since
`parse()` hands an AST node out. Minor says "depend on it, and read the
changelog at every minor", which is both honest and what actually happened:
under this rule the 1.1.1 → 1.2.0 `typeDef` change is a minor by derivation
rather than by argument.

It also settles that the `typeDef` backward-compatible overload (66d892f) was
*not required*. Keep it — it is written and tested — but it is not a precedent.
Shimming every protected-tier change would collapse the tier back into public.

### What "intended semantics" means, operationally

"Intended semantics (still a bit unclear)" carries the whole model: if intent
is the interface, then where the spec is silent there is no promise to break,
and that is the only reading under which this release is a minor. Left as prose
it means whoever writes the CHANGELOG decides intent after the fact, which is
exactly what happened three times in 1.2.0 (a `.elo` file read as one program,
ill-typed calls refused, duplicate `let` bindings refused).

So: **the acceptance corpus is the spec.** A behaviour a fixture asserts, on a
target, is promised. A behaviour no fixture asserts is unspecified, and making
the four targets agree on it is a fix. The corpus is already maintained under
"all tests MUST PASS at all times", so this costs nothing and turns intent from
an opinion into a file.

It is not a post-hoc rule. `reference/division.elo` opened with the comment
"`/` is real division in Elo, in every target" and had **no `.expected.sql` at
all** — the intent was written in prose and enforced nowhere, so SQL answering
3 for `7 / 2` was unspecified, hence a fix. The rule reaches the same verdict
the release did, for a better reason. And it classifies the open questions
correctly: 0180 (what a period boundary means off UTC) and 0220 (the nominal
length of a divided duration) are unspecified *because* no fixture asserts
them. That is their honest status rather than a defect being tolerated.

A corollary worth having: a fixture missing a target's `.expected.*` is an
unspecified cell, so spec coverage is countable. Today, over 125 fixtures:

    js 125 · ruby 125 · python 122 · sql 94

31 cells unspecified on SQL and 3 on Python. That is a better health number
than "the tests pass", and it is the number to drive down.

### Two interfaces that live inside generated code

The corollary about generated code is right — if emitted code were an
interface, the single-walk rewrite, the combinator type parsers and
`--optimize` would all have been major. But "few guarantees regarding
generated code" as written would also permit renaming `elo_int`, and two
things inside the emission are promises:

* **The failure object's `kind`, `path` and `label`.** Added in 1.2.0 precisely
  so a host can tell data that never arrived from data that was refused, with
  its own acceptance runner asserting `kind|path|label` across three targets.
  The failure **structure** is public; the `message` **prose** is explicitly
  not, which is the whole reason the kinds exist.
* **The ten `elo_*` SQL prelude functions** — `elo_fail`, `elo_int`,
  `elo_float`, `elo_date`, `elo_datetime`, `elo_duration`, `elo_string`,
  `elo_data`, `elo_patch`, `elo_deep_merge`. A host installs these in its
  database once. Renaming one breaks every deployed host at run time with no
  recompilation in between, so the names are as public as a binary's.

### Two gaps in the public tier

* **Exit codes, not output.** `eloc -p -t sql` moved from exit 0 to exit 1 in
  1.2.0 — defensible under intended semantics, since printing a false comment
  was never intended, but scripts branch on exit status. Promise the contract
  (0 = code emitted, non-zero = refused) and leave stdout *format* protected at
  best.
* **Name the entry points.** `.` and `./node` is itself a promise:
  `@enspirit/elo` must stay importable in a browser — a unit test walks what
  `src/index.ts` reaches and refuses a Node built-in — and `nodeLoader` is
  quarantined in `./node` deliberately. Moving it to the main entry would break
  the playground's bundle without changing one signature.

### The tier npm cannot see

Semver has two tiers and this model has three, so a consumer reading `1.2.0`
off npm cannot tell the AST moved. The protected tier is therefore a
**changelog** promise, which means an AST change needs a fixed, non-optional
heading every release it happens — otherwise the tier degrades into "private
with good intentions". The same test that pins the export list can require it.

### Telling a consumer what to depend on

This is the part that makes the protected tier usable, and it belongs in the
README next to the install instructions:

| If you use | Depend on | Why |
| --- | --- | --- |
| the language, the `elo` / `eloc` binaries, or `compile` / `parse` / `compileToX` — Elo as a black box | `^1.2.0` — any `1.x` | the public tier only breaks on a major, so minors are safe to take |
| the AST factories, or code that reads an AST node | `~1.2.0` — `1.2.x` only | the protected tier may break on a minor; read the AST heading in the CHANGELOG before moving to `1.3` |
| anything else | pin exactly, and expect to be broken | private; it is not an interface |

Stated the other way round, which is the sentence to put in the README: **use
`1.x` if Elo is a black box to you; pin `1.2.x` if you touch the AST.**

## Tests

- A unit test over `Object.keys(require('../src/index'))` pinned to the
  declared public and protected lists, failing in both directions: an export
  that is not declared, and a declared name that is gone. That is the one test
  that makes the boundary real rather than aspirational, and it is what
  replaces `export * from './ast'` with a list someone has to edit on purpose.
- The README section documenting the surface and the dependency table, checked
  against the same lists, as the website examples already are.
- Spec coverage per target (the `.expected.*` count above) reported by the
  acceptance runners, so an unspecified cell is visible rather than inferred.

## The three sub-questions, answered

1. **Node shapes are part of the AST, and so are protected.** "The AST
   structure" means both the shapes and the factories. That confirms rather
   than infers the 1.2.0 verdict: `TypeDef` holding `definitions` where it held
   `name`/`typeExpr` is a protected break, hence a minor. It is the case that
   prompted all of this, and it now has a rule rather than an argument.
2. **`toEloCode` is private, for now.**
3. **`DiagnosticCode` is protected**, by the same argument as the failure
   kinds: it is a closed set a host switches on, so renaming a member has to
   cost something, and adding one should not cost a major.

### Two consequences to carry into the implementation

**Private does not mean unreachable, and `toEloCode` shows why.** It stays
exported from `src/index.ts` — unexporting it buys nothing, since private
already means no promise — so the export-list test needs three buckets, not
two: public, protected, and *reachable but unsupported*. A name in the third
bucket is the normal case for a compiler, not an anomaly, and saying so in the
list is what stops the next person from reading reachability as a promise.

More to the point, the function is private while **the syntax it emits is
not**. `src/formats.ts` uses `toEloCode` as the `serialize` of its `eloAdapter`,
and the CLIs write that format, so a host can depend on the Elo data literal
syntax without ever importing the function. The function name is private; the
output format is public, by way of the binaries. Worth stating in those terms,
because "private" on its own would wrongly suggest the format can change.

**A public function can have a protected detail in its return type.**
`typecheck()` is a public entry point; the `DiagnosticCode` it reports is
protected. So the promise is "the checker keeps working and keeps reporting",
not "this diagnostic keeps this name". That changes the dependency advice: a
host that renders diagnostics **by code** needs the `1.2.x` pin even if it
never touches an AST — a formula editor is exactly that host. The one-line
guidance becomes: *use `1.x` if Elo is a black box; pin `1.2.x` if you build or
read an AST, or branch on diagnostic codes.*

## Still open

1. Where do the **format adapters** sit — `jsonAdapter`, `csvAdapter`,
   `eloAdapter`, `defaultFormats`, `getFormat`, `parseCSV`, `toCSV`,
   `FormatAdapter`, `FormatRegistry`? All exported, none documented. The
   formats themselves are public through the binaries (that is how `elo` reads
   and writes data), so this is the same split `toEloCode` has: probably
   private names over a public format. Needs saying rather than inheriting the
   ambiguity.
