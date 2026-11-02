# Two targets write a parser by hand

## Symptom

A type definition compiles to a validating parser. Three targets emit one, and
they do it two different ways.

Python emits **combinator calls** (`src/compilers/python.ts:335-417`, 83 lines):

```ts
return `pSchema([${propEntries.join(', ')}], ${extrasMode}, ${extrasParser})`;
return `pArray(${elemParser})`;
return `pUnion([${parsers.join(', ')}])`;
return `pSubtype(${baseParser}, [${checks.join(', ')}])`;
```

JavaScript and Ruby emit **the parser body**, as a string template
(`src/compilers/javascript.ts:357-477`, 121 lines; `src/compilers/ruby.ts:366-489`,
124 lines). One line of it, for the schema case:

```ts
return `(v, p) => { if (typeof v !== 'object' || v === null) return pMiss(p, 'expected object, got ' + (v === null ? 'Null' : typeof v), v); const _o = {}; ${propChecks} ${extrasCheck} return pOk(_o, p); }`;
```

Hand-written loops, path concatenation and temporaries, written twice in two
languages the TypeScript compiler cannot check.

## What it costs

**A global mutable counter.** Ruby's inline schemas capture each other's
locals, so the emitter invents unique variable names from module state:

```ts
let typeParserVarCounter = 0;                     // src/compilers/ruby.ts:354
function nextVarSuffix(): string { return `_${typeParserVarCounter++}`; }
```

reset from inside `compileToRubyWithMeta` (`:158`). A compiler whose output
depends on how many times it has been called, kept correct by remembering to
reset it. Python needs none of this: a combinator closes over its own
arguments.

**The failure vocabulary diverged.** 0202 gave a failure a kind and a label.
The inline emitters each had to carry it by hand, and did not:

- `pMiss` — which distinguishes *nothing arrived* from *wrong type*
  (`src/runtime.ts:303`) — is JavaScript only. JavaScript calls it at
  `:428` and `:462`; Ruby emits a bare `p_fail` at `:442` and `:474`, and
  `RUBY_HELPERS` has no `p_miss` at all (`src/runtime.ts:374-392`).
- A constraint failure carries `'constraint'` and its label on JavaScript
  (`:447`), and does not on Python: `pSubtype` is handed `(message, lambda)`
  pairs only (`python.ts:399`), so the label is folded into prose and the kind
  is lost.

Both are the same mistake: a feature added to the *shared* failure model has to
be re-implemented per target, and two of three forgot. Nobody can see that
from reading one file.

## What it should be

JavaScript and Ruby emit combinator calls, as Python already does.

Each target gains `pSchema`, `pArray`, `pUnion`, `pSubtype` as runtime helpers
— Python's are the reference (`PY_HELPERS` in `src/runtime.ts:588`) — and the
three `emitTypeExprParser` functions become the same 83-line shape: build
arguments, call a combinator. ~160 lines of string-template codegen go, the
counter goes with them, and `pMiss` / `kind` / `label` become one decision made
in one place per target rather than per emission site.

This also shrinks what 0213 has to unify: three near-identical declarative
emitters are a far better candidate for a single generic walk than two
codegenerators and a declarative one.

## Trade-off to measure, not assume

Work moves from compile time into the runtime helpers: emitted code gets
shorter, the prelude gets longer. For JavaScript the helpers live in the IIFE
rather than inline, so a program using one type definition carries four
combinators it did not before.

Measure total emitted size over the fixture corpus before and after. If it
grows materially, the honest answer is still to do it — correctness per target
beats bytes — but it should be a known number, and `JS_HELPER_DEPS` should be
tightened so a program that uses no schema does not pay for `pSchema`.

## Tests

The refactoring itself is covered: `test/fixtures/**` exercises schemas, arrays,
unions, subtype constraints, optional attributes and all three `extras` modes
on every target that supports type definitions, and `schema-types.unit.test.ts`
pins the shapes.

The divergences are bugs and need red tests first. Per CLAUDE.md the assertion
that counts is the acceptance one. SQL is out of scope throughout: it refuses
type definitions outright (`sql.ts:370`), so the three targets that emit a
parser are JavaScript, Ruby and Python, and two of the three are red:

- A failed coercion against a schema missing an attribute reports kind
  `missing`, not `schema` — today JavaScript only.
- A failed subtype constraint reports kind `constraint` and its label — today
  JavaScript only; Python loses both.

Write both as `.elo` assertions, run them on JavaScript, Ruby and Python,
record which fail, then land the combinators and watch them go green. That is the real
argument for this task: the refactoring is what makes the fix possible in one
place instead of three.
