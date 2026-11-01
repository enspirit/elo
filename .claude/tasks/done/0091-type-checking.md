# Type checking for Elo — feasibility analysis

## Problem to solve

* Programs could be wrong. Also compiled programs are sometimes more complex
  than necessary because we need to generate kXXX functions (e.g. kMul) to cover
  all possible cases at runtime while some of them might be unnecessary.
* A type inference + checker could be much greater for end users.

## Idea

* Add an optional `--typecheck` to the elo command
* Check whether a known type inference algorithm could help us here.
* Ideally: pure AST, a separate module entirely, optionally used.

---

# Implemented (branch `type-checker`)

Stages 0 through 3b of the plan below shipped, as five commits:

| Commit | What |
|---|---|
| `cfb4584` | **Stage 0** — selector result types fixed, 32 untyped stdlib functions declared, dead `in_range_*` removed, and a two-directional consistency test holding `typedefs.ts` and the four bindings together |
| `6b2860c` | **Stage 1** — `src/typecheck.ts` + `eloc --typecheck`; unknown function, arity, argument types, operators, non-Bool conditions |
| `4a95a29` | **Stage 2** — opt-in `parse(src, { locations: true })`, diagnostics with `line:column` |
| `07c1b4a` | **Stage 3** — `src/checktypes.ts` structural lattice; schemas, element types, unions, constraint predicates, unknown fields |
| `32ebb4e` | **Stage 3b** — `--strict` and `--input-type` (+ `parseTypeExpr`) |
| `84541c0` | **Stage 3c** — strict null on `:?` fields, with narrowing |

Confirmed by measurement at each step: 910 fixture lines and all 278 Elo
examples on the website produce no diagnostic; unit 1521, integration 2516,
acceptance Ruby/JS/SQL/Python all green.

Deviations from the plan, all recorded in the commits:

- **Object literals are not treated as contracts.** `{}.budget` stays silent,
  because reading an absent key is how Elo expresses absence and a fixture
  asserts it. `unknown-field` is reserved for a *declared schema*, where the
  runtime enforces the shape. Precise field *types* are kept for literals.
- **The cross-check against the transform is one-directional** — the checker
  may know more where the transform says `any`, which is the whole point of
  Stage 3. It must never know less.
- **Element-aware list refinements** live in the checker as a second source of
  type information, held in check by a test that they may only sharpen what
  `typedefs.ts` returned.
- **Input-type inference was dropped** at Bernard's request, and is now
  `analyzed/0171-infer-the-input-type.md`.

Found along the way, recorded as separate tasks rather than fixed here:

- `todo/0172` — **the parser is exponential in nested `let … in`** (~390 chars
  hangs the compile host). Pre-existing on `main`; High severity by the
  project's own security policy. Root cause: `in` is overloaded between
  `let … in` and range membership, resolved by unbounded speculative parsing.
- `todo/0173` — `Duration` and `Data` are documented as schema types but
  rejected by `BUILTIN_TYPE_SELECTORS`.
- `todo/0174` — whether `first`/`last`/`at`/`find`/`indexOf` should be nullable
  too, which would change how all list code reads.

---

# Analysis (2026-11-01, extended)

**Verdict: yes — a pure-AST, separate, optional checker is feasible and cheap
(~450 lines total, no change to `types.ts`, `transform.ts` or any compiler). But
the checker is not the hard part.** Elo's inference is trivial and needs no
inference algorithm at all (§2). What limits static checking is that the *type
information* is imprecise, not target-independent, and — the main point —
**thrown away even when the user wrote it down**. Three findings matter more
than the checker itself:

1. **Operator type errors are never caught; stdlib type errors are caught by
   accident, per target, with results that differ between targets.** `upper(42)`
   compiles on JS and Ruby, fails on SQL. That is a portability defect, not just
   a missing feature. (§1.1–1.2)
2. **Type selectors discard what they prove.** `Int(String)` is typed `any`
   because of a `// may return null` note that is factually wrong — measured,
   they raise. (§1.3c)
3. **Schemas — the rich half of Elo's type system — are discarded entirely.**
   `let X = { foo: Int }, k = _ |> X in k.fooo` compiles fine and returns
   `undefined` at runtime, even though the runtime *validated and coerced* `_`
   against that very schema one step earlier. (§5)

Finding 3 is the one that changes the economics. The extra precision needed is
**not a type-system extension**: object schemas, `[T]`, `:?`, `T|U` and
`Int(i | …)` already exist, are documented, and are enforced at runtime. It all
fits inside the optional checker module, which carries a structural lattice and
projects down to the compiler's flat `EloType` only at signature lookup (§5.2).

So the plan is staged: make the type information honest (Stage 0, small, fixes a
real bug), add the checker walk (Stage 1), add locations (Stage 2), then
propagate schemas (Stage 3 = §5, where the value is).

---

## 1. What happens today — measured, not assumed

### 1.1 There is no type checking phase, but there *is* accidental checking

`transform.ts` infers types bottom-up and `eloTypeDefs.lookup()` returns
`Types.any` when nothing matches — silently. Rejection, when it happens,
happens much later in `StdLib.emit()` (`src/stdlib.ts:156`), which throws when
no target implementation matches the signature.

Probed with `eloc -e` on all four targets (`main` @ `f387f93`):

| Expression | js | ruby | sql |
|---|---|---|---|
| `foo(1)` | **ERR** unknown function | **ERR** | **ERR** |
| `year('hello')` | **ERR** no signature | **ERR** | **ERR** |
| `abs('x')`, `inDays(42)`, `substring('abc','x','y')` | **ERR** | **ERR** | **ERR** |
| `upper('a','b')` (arity) | **ERR** | **ERR** | **ERR** |
| `upper(42)` | OK → `(42).toUpperCase()` | OK → `42.upcase` | **ERR** |
| `length(42)` | OK → `(42).length` | OK → `42.length` | **ERR** |
| `'hello' - 5` | OK → `kSub("hello", 5)` | OK → `"hello" - 5` | OK |
| `1 + 'a'` | OK | OK | OK |
| `[1,2] + 'x'` | OK | OK | OK |
| `today() + 'str'` | OK | OK → `Date.today + "str"` | OK |
| `-'hello'`, `!42` | OK | OK | OK |

Three conclusions:

* **Named stdlib functions are already statically checked** — unknown name,
  wrong arity and wrong argument types all fail at compile time, with good
  messages (`No signature of year accepts year(String). Known: year(Date),
  year(Datetime)`). The error messages are genuinely good already.
* **Operators are never checked.** Every target registers `add(any,any)`,
  `sub(any,any)` … so signature generalization always finds a match and the
  mismatch is emitted as a runtime helper call (`kSub("hello", 5)`).
* **The accept/reject decision is per target, and the targets disagree.**
  `upper(42)` compiles for JS and Ruby and is rejected by SQL. This is the
  finding I would act on first: *"it compiles" does not currently mean the same
  thing for each target*, which is a direct hit on the **portable** design
  principle. The checker's real job is to move this decision in front of the
  compilers, once, target-independently.

### 1.2 Five signature registries, no consistency test

Signatures are declared in five independent places: `src/typedefs.ts`
(language-agnostic, result types) and `src/bindings/{javascript,ruby,sql,python}.ts`
(per-target emitters). Extracting the literal `register('name', [Types…])`
calls from each:

| registry | signatures | present here but not in `typedefs` | in `typedefs` but missing here |
|---|---|---|---|
| `typedefs.ts` | 151 | — | — |
| `bindings/javascript.ts` | 174 | 80 | 57 |
| `bindings/ruby.ts` | 163 | 75 | 63 |
| `bindings/sql.ts` | 151 | 49 | 49 |
| `bindings/python.ts` | 139 | 55 | 67 |

(Counts are approximate — the extraction skips loop-generated registrations —
but the order of magnitude is right.) Nothing keeps these five in sync, and
§1.1's divergence is the visible symptom. **A checker that consults
`typedefs.ts` is only trustworthy if `typedefs.ts` is the authority and every
binding is proven to cover it.** That proof is a cheap unit test and is worth
having with or without a checker.

### 1.3 Where `any` comes from — and why most of it is avoidable

`EloType` (`src/types.ts`) — the lattice the *compiler* dispatches on — is a
flat 13-kind enum plus `any`: no element types for arrays, no field types for
objects, no nullability. Note this is **not** Elo's whole type system: the
type-expression language (`ast.ts:339-405`) is far richer, and §5 is about the
gap between the two. `any` enters from three sources, which deserve different
treatment:

**(a) The input `_` — unknown only until it is coerced.** `transform.ts:140`
types `_` as `any`, so nothing can be said about a bare `_.price * 2`. **But
that is not how Elo is meant to be used.** The idiomatic form declares a schema
and coerces `_` through it — `let X = { foo: Int }, known = _ |> X in known.foo`
— and the runtime *validates and coerces* against that declaration. The schema
is fully present in the AST and is discarded entirely by the type system today.
That is the heart of the matter; **§5** treats it on its own.

**(b) Lambda parameters — `any` by construction** (`transform.ts:611`).
`map([1,2], fn(x ~> upper(x)))` compiles for JS and Ruby: `x` is `any`, so
`upper(any)` resolves. Recoverable from the array's element type — which a
declared schema already supplies (`[Int]`, `{ xs: [Int] }`); see §5.

**(c) Deliberately imprecise typedefs — and here one entry is simply wrong.**
`typedefs.ts` registers every type selector on a string as returning `any`,
annotated `// may return null`:

```ts
defs.register('Int',  [Types.string], Types.any); // may return null
defs.register('Date', [Types.string], Types.any); // may return null
```

**Measured: they do not return null, they raise.** Running the emitted JS:

```
Date('nope')      -> threw: .: expected Date (YYYY-MM-DD), got "nope"
Bool('nope')      -> threw: .: expected Bool, got "nope"
Float('nope')     -> threw: .: expected Float, got "nope"
Duration('nope')  -> threw: .: expected Duration (ISO 8601), got "nope"
```

So a selector is total-or-raise: `Int(String)` has result type **Int**, not
`any`. The consequence today is that Elo's *only* way to establish a known type
discards it:

```
$ eloc -t sql -e "let d = Date('2020-01-01') in upper(d)"
(SELECT UPPER(d) FROM (SELECT elo_date('2020-01-01') AS d) AS _let)   # accepted!
```

`upper` on a Date is accepted by every target. Fixing those six lines is the
highest value-per-line change in this whole analysis: it makes `_ |> Date`,
`Int(_)`, `|> Person` pipelines *informative*, which is the premise the checker
needs. Only `indexOf`, `at`, `first`, `last` genuinely return `null`
(`indexOf('abc','z') -> null`, `at([1,2],9) -> null`, `first([]) -> null`) and
so genuinely need `any` until there is a nullable type.

### 1.4 A latent correctness hazard in `any` dispatch

`StdLib.lookup()` (`src/stdlib.ts:132-148`) has a last-resort fallback: when any
argument is `any` and generalization found nothing, it returns **the first
registered implementation with a matching name and arity**. Registration order
decides semantics. `bindings/sql.ts` registers `length(array)` (line 212) before
`length(string)` (line 249), so:

```
$ eloc -t sql -e "length(_)"
COALESCE(CARDINALITY($1), 0)     # array semantics chosen for an unknown value
```

`year(Date('2020-01-01'))` also only works *by accident* of this fallback
(`Date(String)` → `any` → arity fallback → `year(date)`). This is not something
a checker mode fixes; it is a design question of its own (emit a dispatching
helper for `any`, or refuse to guess). Worth a separate task. Precise types
reduce how often the path is taken.

---

## 2. Which algorithm? (the task's open question)

**No inference algorithm is needed.** Elo has:

* no type variables and no parametric polymorphism;
* no recursion (`transform.ts:521` rejects it) and no loops;
* a flat type lattice whose only subtyping relation is `t ≤ any`;
* overloading resolved by a finite signature table.

That rules Hindley–Milner *out*, not in: HM wants principal types and
parametric polymorphism, and it handles neither ad-hoc overloading nor
`any`-as-top gracefully. The right algorithm is what `transform.ts` already
does — **a single bottom-up (synthesis-only) pass over the tree, consulting an
overloaded signature table, with a `Map<string, EloType>` environment for `let`
and lambda scopes.** Linear time, no unification, no fixpoint, termination from
the same depth guard the transform uses.

The only place a second direction would help is checking a lambda *against* an
expected parameter type (`map : [T] × (T → U) → [U]`), i.e. bidirectional
checking. That becomes relevant only after arrays carry element types (Stage 3)
and can be added then without redesign.

---

## 3. Why the `type-checking` branch stalled, and what to keep

Branch `type-checking` (3 commits on top of `9f07fef`) added `src/typecheck.ts`
with a `TypeCheckCollector`, threaded it through `transform` as an option, and
printed warnings to stderr behind `--typecheck`. 609 lines added, 129 of them
churn inside `transform.ts`.

What it got right: reuse the inference that already exists instead of writing a
second one.

What made it not worth landing:

* **Invasive.** Every one of `transform`'s already 7-parameter recursive calls
  had to grow an 8th argument. The compile path pays for a feature it does not
  use — against the "optionally used" goal.
* **No source locations**, so a warning reads `No matching signature for
  upper(int)` with no indication *where*. Fine for one-line `-e`, useless for a
  `.elo` file or the web playground.
* **An `any_type` warning category** that fires on essentially every real
  program (everything touching `_`). Shipping that would have trained users to
  ignore the output.
* **Could not report more than one problem**, because `transform` throws on the
  first hard error and the collector only saw what `lookup` happened to be
  asked.

Keep: the diagnostic-category idea and the `formatSignature` style of message
(which has since landed in `stdlib.ts:33` and is already better than the
branch's version). Discard the mechanism.

---

## 4. Proposed design

### Stage 0 — make the type information honest (prerequisite, small)

Independent of any checker, and valuable on its own:

1. **Fix selector result types** in `typedefs.ts`: `Int|Float|Bool|Date|Datetime|Duration`
   applied to any argument return their own type (evidence: §1.3). Drop the
   stale `// may return null` comments. Expect fixture churn where typed
   emitters now get selected — that churn is the improvement.
2. **Add a consistency unit test** over `typedefs` × the four bindings:
   every typedef signature must have an implementation in every target, or be
   explicitly listed as target-unsupported (SQL has no lambdas, so
   `map/filter/reduce/any/all` are legitimately absent). This is what makes
   `upper(42)` reject uniformly and makes `typedefs.ts` the single authority.
   It also pins the 49–80 signature gaps measured in §1.2.
3. **Decide the `any` arity fallback** (§1.4) — separate task, flagged here.

### Stage 1 — the checker module

`src/typecheck.ts`, importing only `ast`, `types`, `typedefs`. Imported by
`cli`/`eloc` and re-exported from `index.ts`. **No compiler or transform file
changes.**

```ts
export interface Diagnostic {
  severity: 'error' | 'warning';
  code: 'unknown-function' | 'no-matching-signature' | 'wrong-arity'
      | 'operator-type-mismatch' | 'non-bool-condition'  // Stage 1
      | 'unknown-field' | 'nullable-misuse' | 'union-member-mismatch'
      | 'unresolved-any';                                // Stage 3 (§5)
  message: string;        // reuse formatSignature() style from stdlib.ts
  loc?: SourceLocation;   // Stage 2
}

export interface TypecheckOptions {
  inputType?: TypeExpr;   // declare the type of `_` externally — Stage 3, optional
  strict?: boolean;       // report 'unresolved-any'           — Stage 3 (§5.4)
}

export function typecheck(ast: Expr, options?: TypecheckOptions): Diagnostic[];
```

Properties that matter:

* **Collects, never throws.** On a bad node it records a diagnostic, assigns
  the node `any`, and keeps going — so one pass reports every problem. This is
  precisely what `transform` cannot do, and it is the main functional reason the
  checker is its own walk rather than a hook.
* **`any` suppresses errors by default.** Only `strict: true` reports
  `unresolved-any`, for hosts that want to require fully-typed formulas.
* **Non-blocking by default** in the CLI: `--typecheck` reports diagnostics and
  exits non-zero on `severity: 'error'`; without the flag nothing changes. (Answers
  open question 1 from the earlier draft: *warn and exit non-zero, don't block
  emission* — the emitted code is unchanged either way, so there is no reason to
  withhold it.)

**The duplication question, honestly.** This gives Elo two walks that infer
types and they must agree, or the checker will bless programs the compiler
rejects. The duplicated part is small — literal typing, env threading for
`let`/`lambda`, join for `if`/`alternative`, ~150 lines — because the type
*knowledge* stays in `typedefs.ts` and is shared. The mitigation is a test, not
an abstraction: **for every one of the 107 fixtures, assert that the checker's
types — projected down to `EloType` per §5.2 — equal transform's inferred
types.** Drift then fails CI instead of shipping. The one permitted asymmetry is
that the checker may be *more* precise (§5.2); it must never be less. I prefer
that to inverting the dependency (making `transform` consume the checker's
inference), which would re-create the branch's coupling.

Two further free tests:

* The 107 fixtures must produce **zero diagnostics**. They are an unusually good
  corpus for this: only 15 `_` references across 1021 lines, so fixtures are
  almost fully typed and the checker is near-fully precise over them.
* Every `No signature of …` / `Unknown function …` that `StdLib.emit` can throw
  must be predicted by the checker first.

### Stage 2 — source locations

Needed for the diagnostics to be usable in files and in the playground. The
lexer already tracks line/column and every `Token` carries them
(`parser.ts:59-64`); the AST factories drop them. `parser.ts:573` already has
`formatLocation(token)` for parse errors — reuse the format.

The constraint: `test/unit/parser.unit.test.ts` has ~80 `deepStrictEqual`
assertions against bare AST object literals. Attaching `loc` unconditionally
breaks all of them and also perturbs `serialize.ts`.

**Recommendation: opt-in.** `parse(source, { locations: true })` attaches an
optional `loc?: SourceLocation` to each node; default off. Existing tests,
`toEloCode`, and the AST API are untouched, and the checker asks for locations
when it wants them. (Alternative considered: return locations in a side
`WeakMap<Expr, SourceLocation>` keyed on node identity, leaving AST nodes
completely pure — more elegant for the AST-as-public-API story in the security
model, less conventional. Either is fine; the opt-in flag is simpler.)

### Stage 3 — propagate declared schemas

Stages 1–2 give a checker that catches operator mistakes on literals and
reports stdlib mistakes uniformly instead of per-target. Useful, narrow. Stage 3
is what makes the checker worth having, and it is **not** a type-system
extension — it is making the checker read the types the user already wrote.
Full treatment in **§5**.

### The kXXX simplification, and why it is not a checker task

The task hoped a checker would reduce generated-code complexity. The checker
itself does not do that: `transform` *already* emits typed implementations
whenever types are known — `length('hello')` emits `LENGTH('hello')`, and `kSub`
appears only because `'hello' - 5` has no typed signature. The helpers are a
symptom of `any`, so **Stage 0 removes some automatically**, and Stage 3 could
remove most of them — but only if `transform` learns the precise types too, and
`transform` is deliberately kept out of the checker's way. §5.4 proposes the
seam (hand `transform` an optional precomputed node→type map) and argues it is a
separate optimiser task, not part of checking.

---

## 5. Schema-driven typing — Elo's type system is already rich enough

**Correction to the first draft of this analysis.** I framed Stage 3 as "add
element types, nullability and an input-type flag", i.e. as extending the type
system. That was wrong. Elo *already has* a rich type system — object schemas,
array types, union types, optional properties, subtype constraints — expressed
in `TypeExpr` (`ast.ts:339-405`), parsed, and **enforced at runtime**. What is
missing is not expressiveness; it is that **the compiler throws the declaration
away.** The idiomatic Elo program

```
let X = { foo: Int }, known = _ |> X in known.foo
```

tells us exactly what `known` is. The checker's job is to read it.

### 5.1 Measured: the declaration is enforced at runtime and ignored statically

Runtime side (emitted JS, input on the right):

| program | input | runtime result |
|---|---|---|
| `let X = { foo: Int }, k = _ \|> X in k.foo` | `{"foo":"nope"}` | **throws** `.foo: expected Int, got "nope"` |
| same | `{"foo":1,"bar":2}` | **throws** `.bar: unexpected attribute` |
| `… in k.fooo` | `{"foo":1}` | **`undefined`** — silent wrong answer |
| `… in upper(k.foo)` | `{"foo":1}` | throws `k.foo.toUpperCase is not a function` |
| `let X = { d: Date }, k = _ \|> X in upper(k.d)` | `{"d":"2020-01-01"}` | throws `k.d.toUpperCase is not a function` |
| `let X = { a :? Int }, k = _ \|> X in k.a + 1` | `{}` | `null` |

So coercion through a schema is **total-or-raise**: if evaluation proceeds past
`_ |> X`, the value provably has exactly the declared shape. The static type is
guaranteed by construction, not assumed.

Static side — every one of these compiles without complaint on JS/Ruby today:

```
let X = { foo: Int },  k = _ |> X in k.fooo            # field typo, closed schema
let X = { foo: Int },  k = _ |> X in upper(k.foo)      # Int used as String
let X = { d: Date },   k = _ |> X in upper(k.d)        # Date used as String
let X = { foo: String },k = _ |> X in k.foo * 3        # (legal: String * Int)
let X = [Int],         k = _ |> X in map(k, fn(x ~> upper(x)))
let X = Int(i | upper(i)) in 1                         # predicate itself ill-typed
let A = { x: Int }, B = { a: A }, k = _ |> B in k.a.x  # nested path, resolvable
```

The AST hands all of it over on a plate — `_ |> X` parses to
`function_call('X', [variable('_')])` inside a `typedef` node carrying the
schema, so a checker walking the AST has the name, the structure and the use
site in scope at once.

### 5.2 The design consequence: two lattices, and `src/types.ts` stays flat

The important architectural point, and the reason this fits "stays simple":

> **The checker carries its own richer type lattice and projects down to
> `EloType` only when it consults the signature table.**

```
checker lattice (internal to src/typecheck.ts)
  primitive(kind)                     // the 13 existing kinds
  schema(props, extras)               // from TypeSchema
  array(element)                      // from ArrayType
  union(members)                      // from UnionType
  nullable(inner)                     //  :? optional props, indexOf/at/first/last
  constrained(base, predicates)       // from SubtypeConstraint
  any

project(t) -> EloType                 // schema→object, array(_)→array,
                                      // nullable(T)→any, union→join or any
```

`eloTypeDefs.lookup(name, argTypes.map(project))` is unchanged, so:

* **`src/types.ts`, `src/typedefs.ts`, `src/transform.ts` and all four compilers
  need no change at all.** The compiler's dispatch lattice stays flat and
  simple; precision lives only in the optional module that uses it.
* **No new user-facing surface.** Zero new syntax, zero new concepts for the
  end user — the checker reads `{ foo: Int }`, `[Int]`, `:?`, `Int|String` and
  `Int(i | i > 0)`, all of which Elo already documents.
* The checker may legitimately **reject programs the compiler would accept**.
  That is the entire point of an optional strict mode; it is not an
  inconsistency, provided the reverse never happens (guaranteed by the
  cross-check test in §4: projected checker types must equal transform types).

This also answers the earlier worry about `any` arity-fallback ambiguity (§1.4)
in the schema-typed case: once `k.xs` is `array(int)`, `length` resolves to the
array signature *because it was declared*, not because of registration order.

**Termination is free, and must stay free.** Recursive schemas are already
rejected — `let A = { a: A } in 1` → `Unknown type selector: 'A'` — because
`transformTypeExprWithContext` only admits type names already bound. So
structural types are finite trees and the lattice cannot cycle. The checker is
nonetheless a *compile-time* component and inherits security §2.1 property 1
(always terminate, never overflow the host stack): it must carry its own
depth/size guard over deeply nested schemas, like the parser and transform do.
Worth a unit test with a pathological nested schema.

### 5.3 The diagnostics this unlocks

With schema propagation, in rough order of practical value:

1. **Unknown field on a declared schema** — `k.fooo`. The worst class today
   because it fails *silently* (`undefined` in JS, `nil` in Ruby, `NULL` in
   SQL), so a formula quietly returns the wrong answer instead of erroring.
   Provable for **closed** schemas (extras rejected at runtime) *and* for
   `{ …, ... }` "ignored" schemas — measured: extras are **stripped from the
   coerced value** (`{"foo":1,"bar":2}` → `{"foo":1}`), so the field cannot
   exist. For typed extras `{ …, ...: Int }` it is not an error and the field
   simply has the extras type (measured: `k.bar` → `2`). A complete, principled
   rule across all three schema modes — and **an `error` in both closed and
   ignored modes** (decided, Q5: `...` is strict, extras do not exist
   downstream).
2. **Declared field used at the wrong type** — `upper(k.foo)` where
   `foo: Int`; `year(k.name)` where `name: String`; `k.d + 1` where `d: Date`.
3. **Wrong path through nested schemas** — `k.a.x` resolves fully through
   `B = { a: A }`.
4. **Lambda parameters typed from element types** — `let X = [Int], k = _ |> X
   in map(k, fn(x ~> upper(x)))` becomes an error, closing source (b) of §1.3
   for the common case *without* touching `EloType`.
5. **Optional field used without null handling** — `{ a :? Int }` makes
   `k.a + 1` a `nullable(int)` misuse (measured: evaluates to `null`). This is
   also where `indexOf`/`at`/`first`/`last` belong (§1.3c), so nullability
   needs no new *user* syntax — `:?` already means it. **An `error`** (decided,
   Q6), which requires the narrowing rules tabulated with that answer — the
   checker's only piece of flow sensitivity.
6. **Union member that does not support the operation** — `{ x: Int|String }`
   with `k.x + 1`: principled rule is *type-checks iff it type-checks for every
   member* (`add(int,int)` ✓, `add(string,int)` ✗ → error).
7. **Ill-typed predicate inside a subtype constraint** — `Int(i | upper(i))`
   is accepted today; the checker can bind `i` to the base type and check the
   predicate, and require it to yield `Bool`.
8. **Non-bool conditions** — `if 42 then … else …` and `guard 42 in …` both
   compile today.

Two smaller things found while probing, worth their own small tasks:
`let A = { x: Int, x: String }` silently accepts a **duplicate schema key**;
and the runtime type errors leak host wording (`k.foo.toUpperCase is not a
function`) rather than an Elo-level message.

### 5.4 `--strict` becomes meaningful — and that answers open question 3

My earlier doubt about `strict` was that "report every `any`" is noise. With
schemas it stops being a lint and becomes a **contract**:

> `--strict` = no `any` reaches a call site = *the program must coerce `_`
> through a declared schema before using it.*

That is exactly the idiomatic style, so strict mode is a way for a host to
*require* idiomatic Elo — and a formula editor can then guarantee that a saved
formula cannot fail at evaluation for type reasons. So: **yes, ship `strict`,
but in the same stage as schema propagation, not in Stage 1** where it would be
unsatisfiable. Decided (Q8) that it should become the **default in a future
major**, with an opt-out — so the Learn page should teach the declared form as
*the* way to use Elo, and undeclared `_` as the escape hatch, not the baseline.

`--input-type` ships too (Q7): a host that already knows its columns supplies
the `TypeExpr` rather than making the author restate it. Same machinery — build
a checker type from a `TypeExpr` and bind it to `_` instead of `any` — on the
API first, and on the CLI as well. It must accept **Elo type syntax**, so there
is one spelling of a schema and not two.

### 5.5 And it reopens the kXXX benefit

Since schema propagation makes types precise for the *idiomatic* program, the
original wish — fewer `kAdd`/`kMul` helpers — becomes reachable: `k.foo + 1`
with `foo: Int` is `add(int,int)`, not `add(any,any)`. But that payoff needs
`transform` to know the precise types, and the whole point of the design is to
keep `transform` untouched.

Proposed seam, as a **later, separate optimiser task**: let the checker export
its projected results as a `Map<Expr, EloType>` keyed on node identity, and give
`transform` an optional `types?: Map<Expr, EloType>` that it consults before
falling back to its own inference. Default path unchanged, no coupling, no
`EloType` change. Measure the output-size win before committing to it — and note
it also *narrows* `member_access`'s allowed-type check (`transform.ts:167-173`)
from `any` to the declared kind, which is the concrete form of the security
tightening in §6.

## 6. On the security argument — calibrated

The security model (`.claude/tasks/analyzed/security-model-refinement.md`) is
explicit that the runtime guarantee is a **capability** sandbox, and that
guarantee does **not** rest on type precision. The structural rejections in
`transform.ts` — forbidden members (`:49-57`), member access restricted to
`any|object|array` (`:167-173`), `apply` restricted to known functions
(`:217-224`), array multiplication (`:407-412`) — are enforced regardless of how
much the checker knows. **A type checker adds no §2.2 capability guarantee, and
should not be sold as a security feature.**

What it genuinely contributes:

* **Fail at save time, not eval time.** In the canonical trust profile (B:
  untrusted formulas over your data), a host can reject a bad formula when the
  user writes it instead of discovering `(42).toUpperCase()` at evaluation. That
  is robustness and UX. Real value, not a sandbox property.
* **Removes the per-target acceptance divergence** (§1.1) — a portability
  guarantee, with a security flavour only insofar as "the SQL path rejects what
  the JS path accepted" is a surprise an integrator can get wrong.
* **One real tightening, reachable once schemas propagate (§5):** member access
  is permitted on `any` (`transform.ts:167-173`) precisely because `_` is `any`.
  After `_ |> { d: Datetime }`, the checker knows `k.d` is a Datetime and can
  reject `k.d.toMillis` statically — today that is covered only by the §2.3b
  data contract ("`_` must be data"). Defence in depth, not a new promise. Note
  it is a *checker* rejection only; it becomes a *compiler* rejection only if
  §5.5's optional type map is adopted.
* **A new obligation, not a benefit:** the checker is a compile-time component,
  so it is itself in scope for security §2.1 — it must terminate and never
  overflow the host stack on hostile input (deeply nested schemas, wide unions).
  See the depth-guard note in §5.2.

Worth being explicit about in the README/website if this ships, so nobody reads
`--typecheck` as a sandbox feature.

---

## 7. Cost and sequencing

| Stage | Work | Value |
|---|---|---|
| 0 — honest types (selector result types, `typedefs`↔bindings consistency test) | small; some fixture churn | **high** — fixes the real portability bug, unlocks everything else |
| 1 — `src/typecheck.ts` + `--typecheck` + cross-check tests | ~250 lines + tests | medium; catches operator mistakes, uniform reporting, multi-error output |
| 2 — opt-in source locations | small, touches parser + factories | medium; required for files and the playground |
| 3 — **schema propagation** (§5): structural lattice in the checker, `project()` to `EloType`, `--strict`, `--input-type` (API + CLI) | ~200 lines, **all inside `src/typecheck.ts`**; no change to types/transform/compilers; no new user syntax | **highest** — unknown-field typos, wrong-typed field use, typed lambda params, union rules, constraint predicates |
| 3b — **strict null + narrowing** (Q6): `\|`, `isNull`/`isNotNull` in `if`/`guard`, `&&`-chained guards | ~80 lines; the checker's only flow sensitivity | high; without narrowing, strict null is unusable |
| (separate) `any` arity-fallback decision (§1.4) | small-medium | correctness |
| (separate, later) `unsatisfiable-input` diagnostic — now `analyzed/0171` | small-medium, after Stage 3 | sound, needs no declarations, works on bare `_` |
| (separate, later) `--infer-input-type` scaffolding — now `analyzed/0171` | 400–600 lines, new concept | authoring UX; the on-ramp to `--strict` by default |
| (separate, later) node→type map for codegen specialisation (§5.5) | medium; touches `transform` | smaller output, fewer kXXX helpers |
| (separate, small) duplicate schema keys; Elo-level runtime type-error wording (§5.3) | small | correctness / UX |

Sequencing note, revised: Stage 0 is worth doing even if the checker is never
built. Stage 1 is worth little on its own — **Stages 1+3 are the real unit of
work**, and Stage 3 is the reason to do Stage 1 at all. Stage 2 should land
before or with Stage 3, since schema diagnostics without a position are hard to
act on. If only one thing gets done, do Stage 0.

A revised honest summary of the whole thing: the checker is small, the algorithm
is trivial, and the value comes almost entirely from *stopping the compiler from
discarding type declarations the user already wrote and the runtime already
enforces*. Framed that way it is less a new feature than closing a gap between
two halves of Elo that already exist.

Documentation, per the project rule: `--typecheck` / `--strict` in README
(brief) and Reference (CLI flags); a Learn section on typing that leans on the
idiomatic `let X = {…}, k = _ |> X in …` form and explains what the checker can
and cannot see; plus the "not a sandbox feature" note from §6. The Stdlib page
needs no change (no new functions).

## 8. Decisions and answers

1. ✅ **Stage 0 selector fix** — agreed: `Int(String) → Int`, total-or-raise;
   the `// may return null` annotations are stale and go away. Expect some
   expected-fixture churn where typed emitters now get selected.
2. ✅ **`--typecheck` exit behaviour** — agreed: report diagnostics, exit
   non-zero on errors, still print the compiled output.
3. ✅ **`strict`** — answered in §5.4: yes, ship it, but together with schema
   propagation (Stage 3), where it means "the program must coerce `_` through a
   declared schema" rather than "every `any` is a warning". Shipping it in
   Stage 1 would make it unsatisfiable noise.
4. ✅ **Scope appetite for Stage 3** — the worry is withdrawn (§5). It is not a
   type-system extension: object schemas, `[T]`, `:?`, `T|U` and
   `Int(i | …)` already exist, are already documented, and are already enforced
   at runtime. The extra precision is confined to the optional checker module;
   `src/types.ts` and the compilers stay exactly as flat and simple as they are.

### Questions raised by §5

5. ✅ **Unknown field on `{ …, ... }` is an `error`**, same as a closed schema.
   `...` is *strict*: extra fields do not exist for downstream computation or
   checks (confirmed by the measurement in §5.3 — extras are stripped from the
   coerced value). So the rule is uniform and simple: **unknown-field access is
   an error in both `closed` and `ignored` modes; only typed extras
   (`{ …, ...: T }`) make it legal, and then the field has the extras type.**
   Worth saying explicitly in the Learn page, since `...` reads like "open".
6. ✅ **Strict on null.** `{ a :? Int }` then `k.a + 1` is an **error**, not a
   warning — null is a bug factory and `:?` is the author's own declaration that
   the field may be absent. Implementation consequence, which is the first real
   one in this analysis: **strict null forces narrowing, i.e. the checker's
   first piece of flow sensitivity.** Without it, correct programs get false
   positives. All four narrowing forms are already valid Elo (verified to
   compile):

   | form | rule |
   |---|---|
   | `k.a \| 0` | `alternative(nullable(T), U) : T ∪ U` with null removed |
   | `if isNull(k.a) then … else k.a + 1` | narrow `nullable(T)` → `T` in the *else* branch |
   | `if isNotNull(k.a) then k.a + 1 else …` | narrow in the *then* branch |
   | `guard isNotNull(k.a) in k.a + 1` | narrow in the guard body |

   Scope it tightly: narrowing keyed on `isNull`/`isNotNull` applied to a
   *syntactic access path* (`k.a.b`), plus the `|` operator. No general
   path-sensitivity, no negation algebra — those are where this kind of thing
   stops being simple. `&&`-chained guards (`guard isNotNull(k.a) && isNotNull(k.b)`)
   are worth supporting since they are idiomatic; anything beyond that should be
   left to `|`.
7. ✅ **Ship `--input-type`**, on the API first (`typecheck(ast, { inputType })`,
   where a host supplies the `TypeExpr` it already knows) and on the CLI too.
   Accept it as Elo type syntax so there is one spelling of a schema, not two.
8. ✅ **`--strict` as the default in the long term** (a future major, with an
   opt-out). That makes "declare your input" the language's stated normal form,
   so §5's Learn page should be written as *the* way to use Elo from the start,
   with undeclared `_` presented as the escape hatch rather than the baseline.

---

## 9. Could we *infer* the input type that makes a program safe?

Split out into `analyzed/0171-infer-the-input-type.md`. The short version:
feasible, and Elo is unusually well suited to it, but an input type derived
*from* a program and then used to check *that* program proves nothing. The
valuable half is the opposite verdict — "no input type can make this program
safe" — which is sound, needs no declaration, and is still undetected today.
