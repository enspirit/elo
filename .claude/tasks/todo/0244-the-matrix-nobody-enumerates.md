# The matrix nobody enumerates

> "Analyze the attack vector (that is, target languages 'weaknesses' that yield
> the attack surface) and see how we can build a better harness to avoid
> exposing the same doors in the future. Is linting a possibility? can the
> prelude functions be checked and their use forced when emitting code? can
> tests detect something here? or some post-emission check done
> post-compilation? can CLAUDE.md be improved?"

Twelve security issues across 1.2.1–1.2.3 and `security/typed-at-sandbox-escape`
(see 0241, 0242, 0243, and `.claude/tasks/security/done/*.eml`). Not one of them
was a missing idea: in every case the correct code already existed elsewhere in
the repository. Each was a missing *application* of an existing idea, at one
cell of a matrix nobody enumerates.

This task is: enumerate it, and let a machine check the cells.

---

## Part 1 — Where the attack surface comes from

Elo's own semantics are safe. The surface is created at the seam where Elo's
semantics are **delegated to a target language that has more semantics than Elo
does**. Four such delegations, each with its own flavour of surplus.

### 1.1 Surplus syntax — a character that is data in Elo and code in the target

A value crosses from data into target *syntax*. Every target has a different
magic set, in a different syntactic context, and the sets do not overlap:

| context | magic beyond `"` and `\` | bugs |
|---|---|---|
| Ruby double-quoted string | `#` → `#{}`, `#@ivar`, `#@@cvar`, `#$gvar` | 0243 A1, subtype-constraint label |
| Ruby regex literal `/…/` | `#` (same), `/` | 0243 A1 |
| JS regex literal `/…/` | `/`, **U+2028/U+2029** (line terminators) | 0243 A2 |
| JS string | `</script>` in an HTML context (out of scope today) | — |
| SQL string constant | `'`, and `\` under `standard_conforming_strings=off` | 1.2.3 temporal literals |
| SQL identifier position | everything — no escaper exists, only a whitelist | 1.2.3 `fetch` key |
| Python string | (`JSON.stringify` happens to be adequate) | — |

**The target weakness** is that three of the four have *string interpolation or
a second escape level* that JavaScript's `JSON.stringify` does not model — and
`JSON.stringify` is the reflex a TypeScript author reaches for. Ruby is the
worst offender: `#` is invisible as a threat, and `JSON.stringify` passes it
through unchanged.

**The structural weakness on our side**: a sink is a *string concatenation*, so
"did you call the escaper" is a question nothing can ask. `escapeRubyDQ` sat
three lines above `dateLiteral` for months.

### 1.2 Surplus object model — a native accessor that reaches the host

Elo values are plain data. The targets' values are objects with a reachable
meta-level:

- **JavaScript** — the prototype chain. `x['constructor']` → `Function` → RCE.
  `obj.__proto__ = v` is a setter, not a store. Reported twice (squ11z1 `at()`,
  c0rydoras `fetch`), found twice more (`kDeepMerge`, typed `at()` under
  `--optimize`).
- **Python** — dunder protocols. `int(x)`, `len(x)`, `x[i]`, `-x` all dispatch
  to methods an object may define. Reported twice (the 42-function report, the
  bare-builtin `Int`/`Float`/`length` report).
- **Ruby** — method dispatch on whatever object arrives; `upcase`, `to_datetime`,
  coercion protocols.
- **SQL** — none. SQL has no object model and no lambdas, which is why SQL is
  absent from almost every row of this table. *The target with the least power
  has had the fewest capability bugs and the most injection bugs* — surplus
  syntax and surplus object model are independent axes.

The documented defence is the host contract: *"pass data, not host objects"*.
It holds — but it is a contract, and the next two sections are about contracts
that were silently violated.

### 1.3 Surplus arithmetic — an operator overload Elo did not ask for

| expression | Ruby / Python | JavaScript | SQL |
|---|---|---|---|
| `String * Int` | unbounded repeat | `NaN` | error |
| `String % x` | `sprintf` | `NaN` | — |
| `Int ^ Int` | exact bignum (125 MB from `2 ^ 1e9`) | `Infinity` | `double` |
| `[1] * 1e9` | unbounded array | — | — |

Elo means one thing by `*`; four targets mean five. The guard belongs in a
prelude helper, so **the bug is always "some path spelled the native operator
instead of calling the helper"** — never "the helper was wrong". 0243 B2, and
the squ11z1 array-repeat report before it.

### 1.4 A declared type is a promise, not a check

The deepest one, and the one with no target in it at all.

`--input-type '{xs: [Int], i: Int}'` tells the *checker* what the input is. It
does not coerce or validate the input at runtime: `_.i` compiles to a bare read
that returns whatever arrived. So every emitter that is chosen *because the
checker knows the type* is, on the typed path, emitting an unguarded operation
on an unvalidated value. That is 0243 B1 exactly, and `--optimize` is the flag
that turns the whole program into that situation.

**This inverts the usual intuition.** The dynamic path looks dangerous (`any`
everywhere) and so it gets the guards; the typed path looks safe and gets the
bare operator. The typed path is the one where a lie is undetectable.

### 1.5 Surplus recursion — in the compiler, not in the output

The compiler is a TypeScript program with a 1 MB stack. Any recursive walk over
an attacker-shaped AST is a compile-host DoS unless it is depth-bounded, and
the depth guard only helps if it fires *before* the walk — which it does not
for a walk launched from the outermost node (0243 C1), nor for a walk over type
expressions (reported), nor for an exponential backtrack within an allowed
depth (the `in` ambiguity).

### The matrix

Put together, every bug so far is one cell of:

```
  4 targets
× 2 dispatch paths            (types known / types any)
× 2 trust levels of a type    (checked at runtime / declared and believed)
× N value slots               (string, date, datetime, duration, object key,
                               member property, variable, binding name,
                               datapath segment, constraint label, typedef
                               name, extract template, fetch key, guardType)
× M hostile inputs            (metacharacters / meta-property names /
                               magnitudes / depths)
```

Nobody can hold that in their head, and the record shows nobody did. But every
dimension of it is enumerable from code we already have: `signatureKeys()`
lists the bindings, `Emitter` lists the value slots, `typedefs.ts` lists the
signatures. The harness below is nothing but "iterate the product, assert the
invariant".

---

## Part 2 — The harness

Answering the five questions in the prompt, cheapest and highest-leverage
first. Each item says what it would have caught, so the value is checkable
rather than asserted.

### H0. A grammar whitelist on the emitted code — **DONE, enforced by the build**

> Implemented before the rest of this task, because a harness described in a
> markdown file enforces nothing. What follows is the reasoning; the code is
> `test/support/emitted-js-grammar.ts`, `test/unit/emitted-grammar.unit.test.ts`,
> `test/integration/emitted-grammar.integration.test.ts`,
> `test/acceptance/gate-ruby.rb` and `test/acceptance/gate-grammar.sh`, all run
> by `npm test`. See `.claude/tasks/done/0245`.


> "There is no way to say, e.g., *we never use JavaScript's `[]` operator,
> except in a prelude helper*, and have a linter enforce that?"

There is, it is the strongest item here, and it is the one thing on this list
that **needs no test input at all**. Everything else in H1–H7 only fires if
somebody wrote an expression that exercises the bug. A grammar gate is a
property of the *emitter*, checked against whatever happens to be compiled —
every fixture, every unit test, and, if we want it, every user's program.

The insight is that **the emitted language is not JavaScript.** It is a tiny
sub-grammar of JavaScript, and we never wrote the grammar down. Same for Ruby
and Python. Write it down and the checker is a tree walk.

**This is cheap because the parsers are already here.** `typescript` is a build
dependency and `ts.createSourceFile(…, ScriptKind.JS)` parses JavaScript;
Ruby's `Ripper` and Python's `ast` are standard library, and the acceptance
suite already requires both interpreters.

#### Measured against the current corpus

Run over all 129 JS fixtures — 1364 emitted programs — splitting each program
into the prelude helpers (`FunctionDeclaration` nodes) and everything else:

| what | outside a helper, whole corpus |
|---|---|
| computed member access `x[k]` | **75**, in exactly **two** shapes: 68 with a numeric-literal index, and 7 of `a[a.length - 1]` |
| free identifiers (resolving to no binding in the program) | **two**: `Error`, `String` |
| distinct `.property` names read | **57**, all luxon or JS built-in methods |

So "no computed member access outside a prelude helper, except a numeric
literal index" has **one** exception in the entire corpus, and it is `last()`.
That is not a lint rule with a long allowlist; that is a grammar.

Ruby, over the same 129 fixtures (via `Ripper`): zero parse failures, 62
distinct node kinds in the whole emitted corpus, **zero** backtick literals and
**zero** `@ivar`/`$gvar` references. Interpolation does occur — 210 sites — but
every one is compiler-authored prose in an error message interpolating a local
(`#{v.inspect}`, `#{v.class}`), never a value.

#### The rules that follow

JavaScript, outside the helper region:

1. no `ElementAccessExpression` unless the index is a numeric literal
   (allowlist `a[a.length - 1]` by shape, or route `last()` through a helper
   and have no exception at all);
2. no identifier free in the program outside `{Error, String}`;
3. no `.property` outside the measured 57 — which bans `.constructor`,
   `.__proto__`, `.prototype`, `.call`, `.apply`, `.bind` by construction
   rather than by denylist;
4. no `NewExpression`, no `with`, no assignment to a computed member.

Ruby: no `xstring_literal` (backticks), no `@ivar`/`@@cvar`/`$gvar` reference,
and every `string_embexpr` must match the small allowlist of compiler-authored
shapes. Python: no `Attribute` naming a dunder, no `Name` outside the
whitelist, no `Subscript` with a non-literal index outside the helpers.

#### What it would have caught

| issue | caught | why |
|---|---|---|
| typed `at()` escape under `--optimize` (0243 B1) | **yes** | `_.xs[_.i]` is a computed access with a non-literal index |
| dynamic `at()` escape (squ11z1 #1) | **yes** | same rule |
| Ruby `#` interpolation RCE (0243 A1) | **yes** | `` Date.parse("…#{`id`}") `` contains an `xstring_literal`; `#@x` is an ivar ref |
| U+2028 in the JS regex (0243 A2) | **yes** | the emission did not parse |
| guardType AST injection | **yes** | the emission acquires a statement separator it should not have |
| constraint-label / temporal-literal injections | **yes** | same: the value stops being one literal node |
| `__proto__` in `kDeepMerge` | no | it is *inside* a helper, which the gate exempts |
| `fetch` prototype-chain | no | same |
| dynamic `*` / `%` / `^` bounds (0243 B2) | no | `v0 * v1` is perfectly good grammar — that is H1/H6a |
| Python dunder dispatch | no | `int(v0)` is perfectly good grammar |
| the two compile-host DoS reports | no | compiler-side, not emission-side — that is H4 |

Six of twelve, including **the two hardest**: B1, which H1 and H3 both miss
because it needs a lying input, and the Ruby interpolation class, which H3
would catch only if someone thought to put `` #{`id`} `` in the payload table.
The gate needs nobody to think of the payload.

#### Where to run it

Three places, increasingly strict, and they are not alternatives:

- **a unit test over every fixture** — free, immediate;
- **inside the emission test helpers**, so every unit test that compiles
  anything is also gated;
- **inside `compile()` itself**, as a final assertion before returning. This is
  the one that matters: a new emitter spelling `x[k]` would then not merely
  fail a test, it would **fail to compile**. Fail-closed, and it is the only
  proposal here that defends a user who is running a version of Elo whose tests
  we have not thought to write. Cost is one parse per compilation, which is
  small next to compiling; measure it, and if it is not, keep it behind a flag
  that CI sets and the playground sets.

The honest caveat: the gate is only as good as the helper exemption. Everything
inside a `kFoo` is trusted, so the two bugs it misses are both *in* helpers.
That is the right trade — the helper set is ~60 functions that change rarely
and can be reviewed line by line, which is exactly the review we cannot do for
an emitter that composes strings at runtime — but it should be written on the
box.

### H1. A third acceptance axis: force-dynamic

`npm test` already runs the whole acceptance corpus twice: once normally, once
as `ELO_OPTIMIZE=1`. That is a differential over dimension 3 of the matrix, and
it is the single most productive test the project has.

**Dimension 2 has no such axis.** Add one: a transform option that types every
node `any`, so every expression in the corpus emits through the *dynamic*
bindings, and the suite asserts it answers the same thing.

```
npm run test:acceptance:dynamic     # ELO_FORCE_DYNAMIC=1 ./test/acceptance/test-all.sh
```

- **Catches**: 0243 B2 on the first fixture that multiplies a string
  (`x * n` → gigabytes on Ruby, `NaN` on JS); the squ11z1 `at()` escape; any
  future dynamic/typed divergence. CLAUDE.md already *asks* authors to assert
  both paths by hand — this does it for the entire corpus, for free, and does
  not depend on remembering.
- **Cost**: a `forceDynamic` flag in `transform.ts`. The honest caveat: with
  everything `any`, SQL loses the casts it needs and some dispatches become
  ambiguous, so the axis will start JS/Ruby/Python-only and need an explicit
  exception list, in the idiom of `NOT_EMITTABLE` in
  `registry-consistency.unit.test.ts`. An exception list with reasons is the
  deliverable, not a defeat.

### H2. A syntax gate on everything emitted

Subsumed by **H0**, which parses in order to inspect and therefore gates syntax
on the way past. Kept as a heading only so the "does it at least parse?"
question has an answer: yes, and H0 is where it is answered.

### H3. A hostile-value corpus × every value slot

One table of payloads:

```
#{`id`}   #@ivar   #$gvar   #@@cvar      (Ruby interpolation)
       \n  \r  \t  \0        (line terminators, controls)
'  "  \   \\  ''  E'                     (quote and escape levels)
/  */  --  ;  $$                         (comment and delimiter openers)
${x}  `x`                                (JS template, Ruby backtick)
%30000000d                               (format strings)
__proto__  constructor  prototype        (meta-property names)
```

× every slot the `Emitter` interface and the stdlib bindings accept a raw
string in × 4 targets. For each cell, assert **one of**:

1. the compiler **refuses** it (as `assertSafeIdentifier` does), or
2. the emission passes the **H0 grammar gate** and, executed, returns the value
   *verbatim* and fires no canary.

The canary is what makes this an executable oracle rather than a regex: run
with `$CANARY`/`ELO_CANARY` set, and assert the output never contains its
value. 1.2.1's "Eval proof — injected code must not execute" block in
`security.unit.test.ts` is this idea for four hand-written cases; this
generalises it to the product.

- **Catches**: 0243 A1 and A2; both 1.2.3 SQL injections; the guardType
  injection; the constraint-label class. That is **six of the twelve** on one
  test.
- **Cost**: medium. The slot inventory is the real work; the payload table is
  twenty lines.

### H4. A hostile-shape corpus × every entry point

The sibling of H3 over dimension 5. Generate, programmatically: a 50 000-deep
member chain, the same for `and`, `+`, parentheses, list nesting, object
nesting, type expressions, lambda nesting, and the pathological
`let … in let … in …`. Push each through `parse`, `typecheck`, `transform` and
all four compilers, and assert the result is a **located Elo error** within a
time budget — never a `RangeError`, never a hang.

`test/unit/parser-termination.unit.test.ts` is this test for three shapes and
one entry point. Widen both axes.

- **Catches**: 0243 C1; the reported type-expression depth bypass; the `in`
  backtracking blowup; the Y-combinator report.
- **Cost**: small — the generators are one function each.

### H5. A lying-input corpus for `--optimize`

The only *behavioural* test that addresses §1.4: H1 and H3 both miss it,
because it needs the *checker* to be told the truth and the *runtime* to be
handed a lie. H0 catches 0243 B1 structurally — a computed access with a
non-literal index — and more cheaply, but it catches the *shape*, not the
property. H5 is what pins the property, and it generalises past `at()` to any
future emitter that trusts a declared type.

For each fixture with a declared `--input-type T`, compile with `--optimize`
and run with inputs that **violate** `T`: a string where an `Int` was promised,
`'constructor'` as an index, `{}` where a list was promised, `null` everywhere.
Assert the answer is a value or an Elo failure — never a host object, never a
function, never an exception from the host runtime.

Stated as a property, this is: **`--optimize` must not be able to turn a lie
about the input into a capability.** Worth adding to the security page in those
words, because it is the thing `--optimize` actually promises.

- **Cost**: medium. Needs a generator of type-violating inputs from an Elo
  type, which `typedefs.ts`/`types.ts` make tractable.

### H6. Forcing the prelude helper — "can their use be checked?"

Directly to the question: **partly, and the useful half is narrower than it
first looks.**

Measured on today's bindings (`signatureKeys()` filtered to `any`):

| target | `any`-bearing signatures | emit through a helper | emit a bare native construct |
|---|---|---|---|
| JavaScript | 79 | 37 | 41 |
| Ruby | 97 | 12 | 84 |
| Python | 52 | 25 | 27 |
| SQL | 45 | 0 | 42 |

So "every `any` binding must require a helper" is not a rule — it would flag
194 sites, almost all of them fine (`upper(any)` → `v0.upcase` is correct;
the host contract says the receiver is a String). Do **not** build that rule.

Two narrower rules are real:

- **H6a — a bounded primitive must be bounded on every path.** Keep a
  declarative table: `mul` with a String operand ⇒ the bounded repeat helper;
  `pow` ⇒ `kPow`; `at` with a non-literal index ⇒ `kAt`; `patch`, `repeat`,
  `padStart`, `padEnd` ⇒ their bounded helpers. Then assert, for all four
  targets and **both** paths, that the emission for those signatures names the
  required helper. This is the machine-checked version of the one sentence that
  describes every §1.3 bug: *the helper exists and a path did not call it.*
- **H6b — a helper's bound must be exercised, not merely present.** For each
  bounded helper, an acceptance assertion that the bound actually fires on each
  target. `sql-prelude-consistency.unit.test.ts` already checks the SQL helpers
  *exist*; nothing checks they *bite*.

### H9. Dispatch coverage: what does the corpus never compile?

Added after H0 shipped, because building H0 kept running into the same wall
from a different direction each time.

**Every gate and every acceptance assertion only sees code that something
compiled.** Three times on this branch a check was green not because the
emitter was right but because nothing reached it:

- the typed `at()` escape — no fixture indexed a list with anything but a
  literal, so the emitter holding it was unreachable (0245);
- the `__proto__` object-literal key — no fixture ever built such an object
  (0245);
- `#` in an `extract()` template — no fixture had one (0246).

Each was found by accident, one at a time. The set of them is enumerable.

**Measured.** Instrumenting `StdLib.emit` to record signature keys while
compiling every fixture line, plain and annotated, against the JavaScript
binding's `signatureKeys()`:

| | |
|---|---|
| signatures the JS binding declares | **314** |
| signatures the corpus reaches | 212 |
| **never compiled by any fixture** | **102** |

A third of the emitted surface is never compiled. And the unreached list is
not a tail of exotica — it contains

```
fetch:any,array   fetch:any,fn   fetch:any,object   fetch:any,string
deepMerge:any,any
```

that is, the **dynamic paths of the functions that have produced CVEs**.
`fetch`'s dynamic forms, where the c0rydoras prototype-chain escape lived, are
reached by no fixture at all.

**The item**: record the signature keys dispatched while compiling the corpus,
diff against `signatureKeys()`, and fail on anything unreached that is not on
an explicit exception list with a reason. Same idiom as
`registry-consistency.unit.test.ts`, which already pins *declared* against
*emittable*; this adds the third direction, *exercised*. Some of the 102 are
genuinely unreachable (`String:null`, `Interval:interval`) and belong on the
list with a sentence; the rest are fixtures someone has to write.

- **Catches**: nothing directly — it is a meta-check. What it does is make
  every *other* item in this list actually apply to the whole stdlib, which on
  today's numbers means a third more of it.
- **Cost**: small to build, and the triage of 102 entries is the real work.
- **Compounds with H1.** 30 of the 102 are `any`-bearing signatures, which the
  force-dynamic axis reaches by construction. Sequence them: measure with H9,
  build H1, re-measure, and whatever is left is a genuine fixture gap rather
  than a mode gap.

The reason to put it near the front is method rather than coverage. Both bugs
in 0246 were found by *enumerating what the harness must allow* and reading
the list — not by running anything. That method has now paid twice, and H9 is
the next list nobody has read.

### H7. Linting the *compiler source* — "is it a possibility?"

The question had two readings and they land very differently. Linting the
**emitted output** is H0, and it is the best item on this list. Linting the
**compiler source** is this one, and it is the weakest — kept because it is
nearly free and it fails *earlier*, at the line someone is writing rather than
at the emission it eventually produces.

It should not be ESLint: the project has no config, and adding one for three
rules is a poor trade. Use the idiom already in the repo — a source-scanning
unit test, like `sql-prelude-consistency.unit.test.ts`, which greps
`src/bindings/sql.ts` today.

`test/unit/emission-sinks.unit.test.ts`, three rules:

1. `JSON.stringify` must not appear in `src/compilers/ruby.ts` or
   `src/bindings/ruby.ts` — Ruby has `escapeRubyDQ`, and this one rule is
   exactly 0243 A1.
2. In the SQL files, a template literal must not contain `'${` — a hand-rolled
   string constant that is not `sqlStringConstant`. Exactly 1.2.3 #2 and #3.
3. Every `Emitter` field whose parameter is a raw `string` must mention its
   target's escaper or a validator in its body.

Each rule is five lines and pins a bug that actually happened. That is the test
for whether a lint rule is worth writing.

**The stronger version, worth considering on its own merits.** Make the sink
impossible to spell wrong with a branded type:

```ts
type Code = string & { readonly __code: unique symbol };
```

`Emitter.stringLiteral` returns `Code`; `Code` is constructible only through
`rubyString()`, `sqlStringConstant()`, `assertSafeIdentifier()`, … and one
greppable `unsafeCode()` escape hatch. Then "forgot the escaper" is a *type
error*, not a test failure.

It is the nicest thing to *write against* — the error arrives in the editor —
but H0 largely eats its value, and for a reason worth stating: the brand
constrains how the emitter is *written*, while H0 constrains what the emitter
*produces*. The second is the property we actually want, it holds for emitters
written before the brand existed, and it cannot be defeated by an
`unsafeCode()` call that looked fine at the time. Build H0 first; revisit the
brand only if H0 keeps firing on the same two or three files, which would mean
the problem really is authoring ergonomics.

### What this does not cover

Say it out loud so the harness is not mistaken for a proof:

- **Semantic divergence with no security consequence** — H1 catches it only
  where a fixture already exercises the expression.
- **Anything inside a prelude helper.** H0 exempts the helper region by
  construction, which is why it misses `kDeepMerge` and `kFetch`. The helpers
  are the trusted base and must be read as such: ~60 functions, reviewed line
  by line, changed rarely. If that set starts growing fast, the trade behind H0
  needs revisiting.
- **The host contract** (§1.2). If a host passes a live object into Ruby or
  Python, its methods run. No compiler-side test can detect that; it is
  documented on the security page and stays a contract.
- **Total cost.** Bounding every primitive does not bound an expression, and
  the security page is already explicit that this is the host's resource
  sandbox to provide.

---

## Part 3 — CLAUDE.md

Added in the same commit as this task: a **Security invariants** section, which
is the only part of this analysis that changes behaviour today rather than
after the harness is built. It states the five surplus-semantics classes as a
checklist keyed to *the moment they apply* — adding an emitter sink, adding a
binding, adding a prelude helper, adding a recursive walk — because a checklist
filed under "security" is read by someone already doing security, which is
never the person who introduces one of these.

---

## Suggested order

| | item | catches | cost |
|---|---|---|---|
| ~~1~~ | ~~H0 (JS grammar gate)~~ | **done** — 3 of this branch's 6, seen red | small |
| ~~2~~ | ~~H0 extended: Ruby `Ripper`~~ | **done** — the interpolation class, seen red | small |
| ~~3~~ | ~~H0 extended: Python `ast`~~ | **done** — the dunder vocabulary, seen red | small |
| ~~4~~ | ~~H8 (audit the exempt helper region)~~ | **done once** — found the `pSchema` bug | small |
| **5** | **H9 (dispatch coverage)** | nothing directly — makes every other item apply to 102 more signatures | small + triage |
| 6 | H1 (force-dynamic axis) | B2 + the whole class, and ~30 of H9's 102 | medium |
| 7 | H6a (bounded-primitive table) | §1.3 permanently | medium |
| 8 | H8b (keep the helper region audited) | the rest of §1.2, continuously | medium |
| 9 | H4 (hostile shapes) | C1 + 3 reports | small |
| 10 | H7 rules 1–2 (grep test) | A1, 1.2.3 #2/#3, *earlier* than H0 does | tiny |
| 11 | H0 moved inside `compile()` | the same, fail-closed, for users too | medium |
| 12 | H3 (hostile values, gated by H0) | the residue of §1.1 | medium |
| 13 | H5 (lying inputs) | §1.4 as a property, not a shape | medium |
| 14 | H0 extended: SQL | the two SQL injections — no parser in reach | unknown |
| 15 | branded `Code` type | authoring ergonomics only | large, probably skip |

H9 moved to the front after the measurement above: it is the cheapest item
that increases what every other item can see, and the three coverage holes
found by accident on this branch are all instances of what it enumerates.

### H8. The exempt helper region has to be audited, because the gate cannot

All three gates exempt the prelude helpers: they are *where* the guarded
bracket reads and the `defineProperty` writes are supposed to live, so they
cannot obey the rules the rest of the emission does. The coverage audit put a
number on that exemption — six of the eighteen uncovered issues are inside a
helper — which made it the largest single gap rather than a footnote.

Auditing it by hand once, by listing every computed write in `JS_HELPERS`,
took one query and found **six writes across four helpers**, of which five
were guarded and one was not: `pSchema` built its result with a bare
`o[key] = r.value` over schema-supplied keys, so `__proto__` ran the prototype
setter. Fixed; see `.claude/tasks/done/0246`.

That is the method, and it should not depend on anyone remembering to repeat
it. **H8b** is to make the helper region a *reviewed* region rather than an
unexamined one — the cheapest version being to pin the helper set the way
`public-surface.unit.test.ts` pins the exports: a list of names and content
hashes that a change to a helper has to update on purpose. A stronger version
would assert the invariant structurally (every computed write in a helper
either has a numeric index or is guarded by a `__proto__` check), which is
feasible but needs a dataflow argument the three gates deliberately avoid.

Worth noting for whoever does it: `kFetchObject`, `kPatch`, `kDeepMerge` and
now `pSet` each carry their own copy of the "keep `__proto__` a data key"
logic. One invariant, four sites, which is the exact shape 0243 named as the
cause of this whole class. Consolidating them onto `pSet` is the structural
fix and was left out of 0246 only to keep that fix's blast radius readable.

The shape of this order is the finding: **four of the first five are one
idea** — write down the grammar the emitters are allowed to produce, and check
it. It is first because it is the only item that does not depend on anyone
having imagined the right test input, and because moving it inside `compile()`
turns it from a test into a property of the compiler.

H1 and H6a stay essential: a grammar gate cannot tell `v0 * v1` on two numbers
from `v0 * v1` on a string, and that is a whole class (§1.3) it will never see.
H5 is last of the real items and still worth it — H0 catches B1's *shape*,
but only H5 states the *property*, and the next §1.4 bug may have a different
shape.
