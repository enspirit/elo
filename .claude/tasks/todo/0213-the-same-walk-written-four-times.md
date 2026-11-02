# The same walk, written four times

## Symptom

Each compiler walks the IR itself. The four walks visit the same 21 node kinds
in the same order, and most cases differ only in a delimiter.

| | IR switch | from |
|---|---|---|
| javascript | 173 lines | `src/compilers/javascript.ts:193` |
| ruby | 154 | `src/compilers/ruby.ts:209` |
| python | 172 | `src/compilers/python.ts:170` |
| sql | 178 | `src/compilers/sql.ts:210` |
| | **677** | |

Around them, each file re-declares `EmitResult`, `EmitOptions`, `needsParens`,
an `X_PRECEDENCE` table, an `OP_MAP`, `compileToX`, `compileToXWithMeta` and an
`emitX` / `emitXNode` pair whose only job is to attach `ir.loc` to a refusal —
another ~130 lines each. `compileToJavaScriptWithMeta:73-103` and its three
siblings are the same eight steps: transform, ask `usesInput`, emit, resolve
helper dependencies through `X_HELPER_DEPS`, sort, join, wrap.

The per-target knowledge is *already* factored out, into `src/bindings/*.ts`
and `StdLib.emit`. What is duplicated is the walk, which has no target in it.

## What it costs

Every feature that touches emission has to be added four times, and the record
says that does not happen:

- **Structured failures are JavaScript only.** `pRaise(kind, label, msg)`
  (`src/runtime.ts:362`) and `EloFailure.kind` (`:44`) came in with 0202.
  JavaScript's `guard` case passes all three (`javascript.ts:340-347`). Ruby
  raises a bare string — `raise "guard failed"` (`ruby.ts:344`). Python calls
  `kAssert(cond, msg)` (`python.ts:323`). A host branching on `e.kind` works on
  one target of four.
- **The same divergence in the type parsers**, which 0212 covers separately.
- Helper sets have drifted apart: 48 JavaScript helpers, 23 Ruby, 58 Python,
  all as unchecked string literals in `src/runtime.ts` (984 lines of foreign
  source inside a `.ts` file).

None of this is visible while reading one compiler. That is the whole problem:
four files that each look complete.

## What it should be

One walk, parameterised by what the target says.

```ts
interface Emitter {
  nullLiteral: string;
  stringLiteral(value: string): string;
  object(props: Array<[string, string]>): string;
  array(elements: string[]): string;
  memberAccess(object: string, property: string, parenthesise: boolean): string;
  let(bindings: Array<[string, string]>, body: string): string;
  lambda(params: string[], body: string): string;
  apply(fn: string, args: string[], fnIsLambda: boolean): string;
  alternative(alternatives: string[]): string;
  guard(checks: GuardCheck[], body: string): string;
  typedef(definitions: Array<[string, string]>, body: string): string;
  // …
}
```

The walker does the recursion, the `ctx` construction, the `locate(error,
ir.loc)` wrapping, the `assertSafeIdentifier` calls and the helper-dependency
resolution — once. A target file becomes a record of ~20 small functions plus
its precedence table, next to its existing `bindings/*.ts`.

Where a target genuinely cannot express a node it says so, and that becomes
data rather than a `throw` buried in a switch: SQL's `typedef` and `guard`
(`sql.ts:369-373`) are the only two, and they are the only ones that should
need to be.

Expected removal: ~500 of the 677 duplicated lines, plus most of the ~130×4
scaffolding.

## Order

After 0208 (a required `requireHelper` is far easier to thread through one
walker than an optional one) and after 0212 (three declarative type-parser
emitters unify; two codegenerators and a declarative one do not).

## Trade-off

Four files readable in isolation become one indirection. That is a real loss and
it is the reason to keep the `Emitter` record **flat data and plain functions** —
no inheritance, no base class with overridable hooks, no `super`. A target file
should still be readable top to bottom and answer "what does Ruby emit for a
lambda" in one line.

If a case turns out to need the IR node itself rather than its emitted
children, hand the node to that one function rather than reopening the walk.
Two or three such cases are fine; if it is ten, the abstraction is wrong and
the task should stop and say so.

## Tests

The walk's output is pinned four ways over: `compiler.integration.test.ts` and
`fixtures.integration.test.ts` compare emission byte for byte against
`.expected.{js,ruby,sql,py}` for the whole corpus, and the acceptance suite
executes all four. A walker that re-associates or drops a node cannot survive
that, so the refactoring itself needs no new test — and the corpus must
regenerate to **zero diff**.

The guard divergence is a bug and needs its red test first: a failed `guard`
carries a kind and a label on Ruby and Python as it does on JavaScript. SQL is
not a target of that test — it refuses `guard` outright (`sql.ts:372`), which
is a restriction it accepts rather than a divergence.

Per CLAUDE.md, write it as a `.elo` assertion, run it on every target that
supports the construct, and report how many are red before touching the
walker — the expected answer is two of three.
