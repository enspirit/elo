# Changelog

All notable changes to Elo are documented in this file.

## [Unreleased]

A second security pass. 1.2.3 fixed six issues; sweeping the compiler for the
*classes* those six belonged to — a value embedded in target syntax without the
target's escaper, a native operator reached on an operand whose type was a
promise rather than a check, a recursive walk with no depth bound — turned up
six more, none of them reported from outside. Each got a red-first test, seen
fail on every affected target, then verified executing on node, ruby, python
and psql. No new construct; the public API is unchanged.

### Before you upgrade

Nothing to reinstall: the SQL prelude is untouched, and the JavaScript, Ruby
and Python helpers travel with the emitted code. Three expressions that used to
answer now raise, on purpose:

- an exponentiation whose result would exceed `ELO_MAX_STRING_LENGTH` bits
  (default 10,000,000) — `2 ^ 1e9` was `Infinity` on JavaScript and a
  125 MB bignum on Ruby and Python;
- a modulo with a non-numeric operand on the dynamic path — it was `NaN` on
  JavaScript and `sprintf` on Ruby and Python, and it is a type error anyway;
- `at()` with a runtime-supplied index that is not an integer — it now answers
  null instead of reading a host member.

One expression that used to answer *wrongly* now answers: `x * n` with a string
`x` on the dynamic path repeats the string on JavaScript, as the typed path and
the other targets already did, instead of returning `NaN`.

### Security

- **JavaScript sandbox escape through the *typed* `at()` (type confusion).**
  1.2.3 hardened the dynamic `at(any, any)`; the typed `at([Int], Int)` emitter
  still spelled a bare `x[k] ?? null`. That emitter is chosen exactly when the
  checker knows the operand types — which is what `--optimize` arranges. But a
  declared input type is a promise, not a runtime check: under `--input-type`,
  `_.i` compiles to a bare read that returns the raw value uncoerced, so an
  attacker sending `{xs: [], i: 'constructor'}` against an honestly declared
  `{xs: [Int], i: Int}` got the `Array` constructor back — one hop from the
  `Function` constructor, and application is unchecked too. A bare bracket read
  is now emitted only for a compile-time integer literal index; any
  runtime-supplied index goes through `kAt`, which indexes only a real array by
  an integer. JavaScript only: Ruby bounds-checks, Python already routed
  through `kAt`, SQL casts the index to numeric.

- **Ruby code execution through `#` in temporal literals and `extract()`
  templates.** A double-quoted Ruby string interpolates `#{...}`, `#@ivar` and
  `#$global`. Every Ruby string in the emission went through `escapeRubyDQ`,
  which escapes `#` precisely for that reason — except the three temporal
  literals, which used `JSON.stringify`, so a date value carrying `#{...}`
  reached the compiler AST API as `` Date.parse("2024-01-01#{`id`}") `` and ran
  a shell command under the standard prelude. The same hole existed in the
  `extract()` regex escaper: `#{code}` was already dead (the `{` was escaped)
  but `#@ivar` needs no brace, so a template interpolated a host instance
  variable at match time. The temporal emitters now use `escapeRubyDQ` and the
  regex escaper escapes `#`; `\#` matches a literal `#` on every target, so no
  match changes. Ruby only — the other three carry the same value as inert
  data.

- **`__proto__` was not a data key in `deepMerge` (JavaScript).** `{__proto__: x}`
  is an ordinary data property in Elo, and the object-literal emitter, `kFetchObject`
  and `kPatch` all use `Object.defineProperty` to keep it one. `kDeepMerge` did a
  bare `result[key] = …`, which for `__proto__` runs the prototype setter, so
  `deepMerge({a: 1}, JSON.parse('{"__proto__": …}'))` handed back an object whose
  prototype was attacker data. No global `Object.prototype` pollution and Elo could
  not read the value back, but a host receiving the result saw an
  attacker-controlled prototype. Reads now go through `kMember` and the
  `__proto__` write through `defineProperty`, as the other three paths do.

- **Unbounded allocation through native operator overloads on the dynamic
  path.** When an operand type is not statically known — a lambda parameter, an
  untyped `_` — Ruby and Python spelled `*`, `%` and `^` with native operators
  whose String and bignum overloads bypass the `ELO_MAX_STRING_LENGTH` guards
  the typed path enforces. `x * n` on a String ran Ruby's unbounded `String#*`
  (`fn(x ~> x * 1e9)` on `'ab'` allocates gigabytes); `x % n` ran `sprintf`, so
  `'%30000000d' % 1` built a 30 M-char string; and `a ^ b` built an exact
  bignum, so `2 ^ 1e9` was ~125 MB from one literal. Dynamic `String * Int` now
  takes the same bounded repeat as the typed path, modulo refuses a non-numeric
  operand, and exponentiation refuses a result whose bit length would exceed
  the cap — on every target, including the typed path for `^`.

- **Compile-host denial of service through two unbounded checker walks.**
  `pathOf` and `collectNonNullPaths` recursed over the AST with no depth bound,
  and both run on the outermost node over the whole structure, before the
  per-node depth guard (100) can fire. A hostile-depth `_.a.a.a…` member chain
  or `isNotNull(a) and isNotNull(a) and …` condition therefore overflowed the
  native stack with a `RangeError` instead of the controlled "depth exceeded"
  rejection, so `eloc -e '_.a.a…'` crashed the compiler. Both are now iterative,
  and a chain of any length falls through to the existing guard. Well-formed
  programs are unaffected: the same dotted path is built and the same non-null
  paths collected.

- **`extract()` emitted invalid JavaScript for U+2028 / U+2029.** Both are line
  terminators inside a JavaScript regex literal, so a template carrying one
  closed the `/…/` early and the emission was a `SyntaxError` — and under
  `--execute`, or any `compile()`/`formats` path, the output is wrapped in
  `new Function(…)`, so attacker-controlled source crashed the host at parse
  time. Not injection — the closing `/` stays escaped — but it breaks the
  "always emits valid code" contract. Both are now spelled as `\u` escapes,
  which match the same character. JavaScript only; the other three carry them
  as ordinary data.

## [1.2.3] - 2026-11-07

A security release. Four issues were reported under coordinated disclosure by
Mykhailo Shushman (squ11z1); sweeping the compiler for the same bug classes
turned up two more on targets the reporter had not probed. All six are fixed,
each with a red-first test that was seen fail on every affected target and then
verified executing on node, ruby, python and psql. No new construct; the public
API is unchanged; no program that was already correct changes its answer.

### Before you upgrade

**If you run Elo on PostgreSQL, reinstall the SQL prelude.** This release adds
three `elo_*` helpers — `elo_repeat`, `elo_lpad`, `elo_rpad` — that `s * n`,
`padStart` and `padEnd` now call, and it rewrites `elo_patch`. A prelude
installed before 1.2.3 lacks the three new names, so repeat and padding on SQL
raise rather than answer:

```bash
eloc --prelude-only -t sql | psql "$DATABASE_URL"
```

Nothing else needs action.

### Security

- **JavaScript sandbox escape through `at()`.** When the operand types were not
  statically known, `at(x, k)` fell back to the typed array emitter and emitted
  a bare `x[k]`. A string key then walked the prototype chain:
  `at(at(_, 'constructor'), 'constructor')` reached the `Function` constructor,
  so an attacker-authored expression ran arbitrary host code during evaluation —
  from a plain string input, no data object. `at` now indexes only a real array
  by an integer and is null otherwise, through a `kAt` guard on JavaScript and
  an Array/Integer check on Ruby and Python (which erred rather than leaked, and
  now agree). SQL was never reachable. Reported by squ11z1.

- **SQL injection through the `fetch` object form.** `fetch(data, {key: path})`
  interpolated the mapping key into a SQL string constant without the identifier
  check the object-literal emitter already used, so a key supplied through the
  compiler AST API injected a sub-select — a single-statement read under default
  PostgreSQL settings. The key now goes through `assertSafeIdentifier`, as the
  object literal does; a parser-produced key is always an identifier, so no
  valid program is refused. Reported by squ11z1.

- **SQL injection through date, datetime and duration literals.** The three
  temporal emitters doubled the single quote but left the backslash raw, unlike
  the string emitter, so a value carrying a backslash — reachable through the
  AST API — escaped the literal when `standard_conforming_strings` is `off`
  (deprecated, non-default). The three now share one escaping helper that
  doubles the backslash and `E''`-prefixes, so the literal cannot be escaped
  under either setting. Reported by squ11z1.

- **Guard/check type injection through the AST API (Ruby).** `IRGuard.guardType`
  is `'guard' | 'check'`, but the transform copied it from the AST unchecked and
  the Ruby emitter interpolated it into a string literal, so a guard type set
  through the compiler AST API — never reachable from the parser — injected
  Ruby. The transform now rejects any value other than the two keywords, which
  closes it for every target at once. Found while auditing the reported fixes.

- **Unbounded allocation in `patch` and string repeat/padding.** `patch([], .N,
  v)` grew an array one element per step — quadratic in the SQL prelude — with
  no cap on `N`; and `s * n`, `padStart`, `padEnd` on SQL used bare
  `REPEAT`/`LPAD`/`RPAD` with no cap, where the other targets already bound them
  by `ELO_MAX_STRING_LENGTH`. A short expression could thus build a huge value
  on a shared database backend. The patch fill is now a single bounded
  concatenation (a 200k index went from minutes to milliseconds), and repeat and
  padding go through bounded prelude helpers, so every target enforces
  `ELO_MAX_STRING_LENGTH` as the security page already said. The patch half was
  reported by squ11z1; the SQL repeat/pad half was found alongside it.

- **`replace` and `replaceAll` are now literal, as documented.** A replacement
  string was passed straight to JavaScript's `String.prototype.replace` and
  Ruby's `gsub`, which interpret `$'`, `$&`, `\1`, … — so a replacement of `$'`
  expanded the output superlinearly and a replacement was not the literal text
  the documentation promised. Both targets now insert the replacement verbatim
  (a function replacement on JavaScript, a block on Ruby). Python and SQL were
  already literal. Reported by squ11z1 as the second half of the allocation
  issue; it is also a correctness fix.

### Internals

- Dependencies upgraded and security advisories cleared. The website's
  toolchain moved to Astro 7, which clears sixteen transitive advisories
  (including the two critical `@enspirit/elo` lockfile entries a scanner had
  flagged); the compiler's `pg` and `esbuild` dev-dependencies were bumped, and
  the CI workflow pins its third-party action to a commit and no longer persists
  the checkout credential.

## [1.2.2] - 2026-11-07

A patch release: seven fixes. Six are a disagreement between targets, where at
most one of them was right; the seventh is in the Node sandbox of `contrib/`.
No API change, no new construct, nothing newly refused.

### Before you upgrade

**If you run Elo on PostgreSQL, reinstall the SQL prelude.** The `split` fix
below adds an `elo_split` helper — the eleventh `elo_*` name — and a prelude
installed before this release does not have it, so `split()` on SQL raises
rather than answering:

```bash
eloc --prelude-only -t sql | psql "$DATABASE_URL"
```

Nothing else needs action. Every other fix changes what a *wrong* program
answered, never what a correct one did — so the public API is unchanged and no
program that worked stops working.

### Fixed

- A refused value's **path was empty on Ruby** where it is `.` on JavaScript
  and Python. `{a: 1} |> [{a: Int}]` — a record where a list was declared —
  reported `path: ''` there and `path: '.'` on the other two, so a host that
  reads the path to point at the input could not point at the whole of it. The
  cause is a truthiness difference the helper walked into: `err[:path] || '.'`
  is not a default in Ruby, where **an empty string is truthy**, and the same
  line in JavaScript and Python does default. Elo's own promise is that the
  same program means the same thing on every target, so the Ruby helper now
  reads `path`, `kind` and `message` through something that treats empty as
  absent. Found by the formula catalogue's new refusal checks, and pinned by
  `test/acceptance/failures/root-array-refused.elo`

- The **Node sandbox** of `contrib/sandboxes/node` could not see luxon. It
  evaluated the compiled code with an indirect `eval`, which runs in global
  scope, where the worker's own `require('luxon')` bindings are not visible —
  and the emitted helpers name `DateTime`, `Duration` and `Interval` as free
  names, `kMul` among them, so a real program died on its first multiplication
  with `Duration is not defined`. The three are now bound as parameters of a
  function built around the code, which is what `compile()` already does. The
  smoke test had missed it because its code strings are hand-written, on
  purpose, so that it needs no build; two that name luxon are now in it

- `Float()` of a string meant **two things on two Rubies**: `Kernel#Float("1.")`
  raises on Ruby 2.7 to 3.3 and answers `1.0` on 3.4 and later, so the same Elo
  program depended on the host's Ruby — where JavaScript, Python and PostgreSQL
  all answer `1.0`. Both places that asked the question were affected: the
  `Float()` selector and the schema parser behind `{ a: Float }`. Ruby now
  decides it with a `k_float` helper over Elo's own grammar — the one the
  JavaScript parser got in the entry below — so the four targets accept the same
  set, whatever Ruby is installed. The whole Ruby corpus is checked on 2.7, 3.2,
  3.3, 3.4 and 4.0. `Integer()` was checked the same way and needed nothing

- A string function whose **receiver is an expression** lost the parentheses
  around it. `startsWith('ab' + 'cd', 'abc')` raised on **Python** and
  `substring('ab' + 'cd', 1, 2)` answered `'abd'` there, because only the
  one-argument family (`upper`, `trim`, …) wrapped its receiver. And
  `contains(a + 'cd', x)` with an `x` the compiler cannot type fell through to
  the list registration, which did not wrap either: `["abfalse"]` on
  **JavaScript**, a `TypeError` on **Ruby**. PostgreSQL was right throughout

- An `if` expression used as an **operand** was mis-emitted on JavaScript, Ruby
  and Python: a conditional operator binds looser than almost everything, and
  the emission did not parenthesise itself, so the operator around it swallowed
  the condition — `1 + (if false then 10 else 20)` answered `20` on JavaScript
  and Python and raised a `TypeError` on Ruby, where the answer is `21` (and
  was, on PostgreSQL, whose `CASE … END` closes itself). Every arithmetic,
  string and unary operator was affected, with or without known operand types.
  The nine assertions the corpus already had passed by accident: `(if c then a
  else b) == x` groups as `c ? a : (b == x)`, which is truthy either way

- `split(s, '')` did not split a string into its characters, the only way Elo
  has to walk one: **Python** raised `empty separator` and **PostgreSQL**
  silently answered the whole string as a one-element list, where JavaScript and
  Ruby answer its characters. The SQL target gained an `elo_split` prelude
  helper for it — the eleventh `elo_*` name, so **reinstall the SQL prelude**
  (`eloc --prelude-only -t sql | psql "$DATABASE_URL"`) for `split` to keep
  working there

- `Int()` of a string meant three different things. **Ruby** read a leading
  zero as an octal prefix, so `Int('08')` raised and `Int('010')` was `8` where
  the other three targets answer `10` — every formula that parses a zero-padded
  identifier (a VAT number, a national register number, a postal code) was
  wrong or refused there. **JavaScript** parsed with `parseInt`/`parseFloat`,
  which stop at the first character they do not understand, so `Int('12abc')`
  was `12` and `Float('2.5abc')` was `2.5` where the other three refuse — and
  since that is the schema parser too, `{"age": "30 years"} |> { age: Int }`
  validated to `30` on JavaScript and failed on Ruby and Python. **JavaScript**
  also refused `Int(x)` on a Float it could not type statically, while its own
  typed `Int(3.7)` truncates, as all four targets do

## [1.2.1] - 2026-11-03

### Security

- Complete the fix for the JavaScript sandbox escape that 1.2.0 began. 1.2.0
  closed the reported chain (a non-string `fetch` key coercing past the
  denylist, and the `{__proto__: …}` literal), but the underlying flaw was
  broader: a JavaScript property read walks the prototype chain, so **any**
  host builtin whose name the seven-entry denylist does not list was still
  handed back as a live function — `[].map` is `Array.prototype.map`,
  `{a: 1}.toString` is `Object.prototype.toString`, and `fetch({}, 'toString')`
  the same through the runtime path. None escalated on their own, because the
  Function constructor stays denylisted at every hop, but the security model
  promises compiled code cannot reach host internals, and a leaked
  `.call`/`.bind` is the foothold a later gap would build on. Member access,
  `fetch` and `patch` on the JavaScript target now read an **own** property or
  null — a structural guard that closes every name at once, where a denylist
  could not — through a new `kMember` helper. Real data is unaffected: a key the
  author wrote is an own property and shadows any namesake on the prototype, so
  `{map: 42}.map` is `42`. Ruby and Python were never affected (both index data
  and never consult a prototype). Backported to 1.1.3 and 1.0.5.
  `{__proto__: 5}` reading as data, from the 1.2.0 note, is unchanged

## [1.2.0] - 2026-11-03

### Security

- Close a sandbox escape in the **JavaScript** target that reached arbitrary
  code execution, reported by Arthur Deierlein (c0rydoras) under coordinated
  disclosure. Two independent holes, chained as
  `fetch({__proto__: [].map}, [['constructor']])('alert(1)')()`: the `kFetch`
  runtime denylist compared a path segment against the forbidden meta-property
  names with `===`, which a non-string key slips past — `['constructor']` and
  an object with a `toString` both coerce to `"constructor"` only when the
  property read happens, after the check; and an object literal emitted
  `{__proto__: v}` with the bare key, running the `[[Prototype]]` setter rather
  than creating a data property, so `{__proto__: [].map}` produced an object
  whose prototype was a Function while still passing a `typeof 'object'` guard.
  `kFetch` and `kPatch` now coerce a segment to a string before the denylist
  (and `kFetchObject` defines a `__proto__` result key rather than assigning
  it), and the emitter writes `__proto__` as a computed key so it becomes an
  own property. Either fix alone closes the chain; both ship. The same flaw is
  patched in **1.1.2** and **1.0.4** for projects pinned below 1.2.0. Ruby and
  Python were never affected — neither coerces a non-string key nor exposes a
  prototype chain. A side benefit: `{__proto__: 5}` is now the data object
  `{"__proto__": 5}` on JavaScript, where it had silently lost the key


Three things happened in this release. Elo gained an optional static type
checker, so a mistake can be caught before the compiled code runs. A `.elo`
file became a program rather than a line — it can open with type definitions
and import other files. And the PostgreSQL target was taken seriously for the
first time: the SQL acceptance runner had been reporting psql's errors as
passes, and closing that hole uncovered twenty-six fixtures that were not valid
SQL at all.

Most of what follows was found by asking the same question of every target and
comparing the answers. Where they disagreed, one of them was wrong.

### Before you upgrade

Two kinds of program change behaviour: one that produced a wrong number, and
one the compiler used to accept and now refuses. Nothing else needs action —
the public API is unchanged, and everything newly refused is listed in Fixes.

- **An ill-typed call is refused at compile time, on every target.** `round('x')`
  compiled to `"x".round`, `floor(true)` to `true.floor`, `ceil([1])` to
  `[1].ceil` and `'hello' - 5` to `"hello" - 5` — raising at run time on Ruby
  and Python, and on JavaScript quietly answering a number instead:
  `Math.floor(true)` is 1, `Math.ceil([1])` is 1, `'hello' - 5` is `NaN`.
  `transform()` now refuses a call with no matching signature and an operator
  applied to types it does not accept, against the one signature table above
  every target's bindings. An argument the compiler cannot type still compiles,
  so `round(_.x)` on an undeclared input is unaffected; how much Elo demands to
  be typed stays `--strict`'s question
- **`let` binds each name once.** `let x = 1, x = 2 in x` answered 2 on Ruby,
  Python and SQL and was a `SyntaxError` on JavaScript, so it was a program
  that compiled and did not run everywhere. It is refused now, naming the
  duplicate and where it was first bound. A nested `let` still shadows, which
  is the unambiguous way to say it, and now shadows correctly on every target
  (see Fixes)
- **Arithmetic that was wrong is now right**, so four expressions change value:
  `7 / 2` was 3 on PostgreSQL and is now 3.5; `-7 % 3` was -1 on JavaScript and
  PostgreSQL and is now 2; `round(2 ^ -1)` was 0.5 on all four targets and is
  now 1; `2 ^ 3 / 16` was 0 on Ruby and is now 0.5. `2 ^ -1` on Ruby was a
  `Rational` rather than a Float, which `typeOf` reported as `'Tuple'`. Code
  that compensated for any of these needs revisiting

### Which version to depend on

Elo now says what it promises, in three tiers — stated here for the first time,
and written up in the README under
[Versioning](README.md#versioning-and-the-public-interface) and on the
reference page:

- **Public**, and it only breaks on a **major**: the language and stdlib and
  their intended semantics, the `elo` and `eloc` binaries, and the TypeScript
  entry points for parsing, compiling, evaluating and type-checking
- **Protected**, and it may break on a **minor**: the AST — its node shapes and
  its factory methods — and the type checker's `DiagnosticCode` set. The
  checker itself keeps working and keeps reporting; which code it uses for a
  given mistake may be renamed
- **Private**: everything else, including the shape of the generated code

So: **use `1.x` if Elo is a black box to you — the language, the CLIs,
`compile()`. Pin `1.2.x` if you build or read an AST, or branch on diagnostic
codes.** A change to either will always be called out under its own heading
here.

`src/index.ts` now lists every exported name under its tier instead of
re-exporting modules wholesale, and a test fails on an export in no tier, a
tier naming something no longer exported, a reintroduced wildcard, or a README
that puts a name in the wrong tier. The reachable surface is unchanged — 66
names before and after — so this declares what was already there.

And what to do when the behaviour you depend on is *not* promised: send an
assertion for it. One line under `test/fixtures/` turns something you observed
into something Elo owes you, and runs on all four targets on every commit —
see [Pin the behaviour you depend on](README.md#pin-the-behaviour-you-depend-on).

Two consequences worth stating. The generated code is deliberately *not* an
interface, so do not depend on how an expression translates, nor on the
target's own dynamic behaviour around it — but the two things a host genuinely
has to hold onto are promises: a failure's `kind`, `path` and `label` (its
`message` prose is not), and the ten `elo_*` SQL prelude function names, which
a host installs in its database.

In this release the only protected change is that a type definition holds
`definitions: TypeBinding[]` in one node, where it held one `name` and one
`typeExpr` — so code that *reads* a `typedef` node sees the list.
`typeDef(name, typeExpr, body)` still constructs one, so code that only
*builds* ASTs is unaffected.

### Language

- A source may open with a **type prelude** — `Person = { name: String }` on its
  own line, before any expression — scoping every expression below it. It is
  sugar for the `let Person = … in` that was previously the only way to name a
  type, so nothing downstream of the parser changed
- **Imports.** `import { Person } from './types'`, `import { double } from
  './lib'`, `import './lib' as lib`. A module is an ordinary `.elo` file: its
  type prelude is what it exports as types, its expression is what it exports
  as a value, and case decides which of the two an imported name means. Elo
  compiles to one self-contained expression with no runtime to link against, so
  an import is compile-time inlining — no new IR node, no compiler change, no
  new semantics to make portable. A module is read, parsed and bound once per
  program however many times it is imported. A name the module does not export
  is refused — for a value as well as for a type — naming the module and the
  line, so a typo is not something you meet as a `null` later. Cycles are
  refused by name, and `src/modules.ts` reads no files itself: it is given a
  loader, which is what lets the playground refuse an import rather than
  silently resolve one
- `%` is **floored on every target** — it takes the sign of the divisor, as Ruby
  and Python already did — so `x % n` stays inside `[0, n)`, which is what
  `day % 7` is written for. `/` is **real division on every target**, which
  PostgreSQL was the last to do
- `pow(Int, Int)` is declared a **Float**, because nothing tells the compiler
  the exponent's sign and `2 ^ -1` is 0.5. The declaration was simply false, and
  everything dispatching on Int versus Float picked the wrong implementation
- `Duration` and `Data` are usable as **schema types**, as the documentation
  already said: `let X = { d: Duration } in …` was refused with "Unknown type
  selector"
- A name bound to a **field read can be called**: `let f = o.g in f(1)` was
  refused because the read is opaque, though `o.g(1)` was already allowed. This
  is what an import of a module's function needs

### Added

- **`eloc --typecheck`**, an optional static type checker. It walks the AST
  before the compilers and reports unknown functions, wrong arity, arguments of
  the wrong type, operators applied to types they do not accept, and conditions
  that are not Bool, with a `line:column:` for each. It collects rather than
  throws, so one pass reports every problem. It is silent about what it cannot
  know, and it reads **declared schemas**: given `let Order = { total: Int },
  order = _ |> Order`, it reports a field the schema does not declare — the
  worst class in practice, because it fails silently at runtime as `undefined`,
  `nil` or `NULL` rather than raising — a declared field used at the wrong type
  through any depth of nesting, a lambda parameter typed from a list's element
  type, and an operation only some members of a union support. `:?` makes a
  field `T|Null` and using it as a `T` is reported, with narrowing for the four
  idiomatic ways to handle it (`|`, `if isNull`, `if isNotNull`, `guard
  isNotNull`). The guarantee: **if the checker is silent, every target compiles
  the program** — asserted by an integration test that rebuilds a corpus from
  the signature table. What it does not see is documented alongside it
- **`eloc --strict`** turns the silence about unknown types into a diagnostic,
  which in practice reads as a contract: declare your input. **`eloc
  --input-type '<type>'`** declares the input's shape from outside, for a host
  that already knows it — a formula editor that knows its columns. Both imply
  `--typecheck`
- **`eloc --optimize`** compiles with the checker's types, so a lambda
  parameter typed from a declared list's element type gets a typed operation
  rather than a runtime dispatcher. It implies `--typecheck` and refuses to
  annotate a program the checker reported on. The benefit is proportional to
  how much the program declares
- **Every compile-time refusal names a line, a column, and the file** when the
  source came from one — the transform's, the emission's and the AST factories',
  not only the parser's. On the ordinary compile path, not only under
  `--typecheck`. `parse(source)` still produces a plain AST; positions are
  recorded on request with `parse(source, { locations: true })`, and an AST with
  positions compiles to byte-identical code
- **A failure is a message and a kind.** Compiled code now raises an error
  carrying `kind` — `'schema'`, `'missing'`, `'constraint'`, `'guard'` or
  `'check'` — with the path it happened at and the label it was written under,
  on JavaScript, Ruby and Python. A host that has to tell data that never
  arrived from data that arrived and was refused had only the English to go on,
  so the wording of a diagnostic was a public interface without saying so.
  `message` is unchanged
- **`compile(source, { runtime, loader, file })`** resolves an import header the
  way `elo` does. A host with no loader keeps today's refusal word for word:
  reading a file is a capability it grants, not one the compiler takes.
  `nodeLoader` is exported from **`@enspirit/elo/node`**, a second entry point,
  so `@enspirit/elo` itself stays importable in a browser
- `eloc --prelude-only -t sql` returns **the SQL prelude from the compiler**,
  where it used to print `-- No prelude needed for SQL`, which was false. Its
  ten PL/pgSQL helpers lived only in `docker/init.sql`, so a host compiling Elo
  to SQL had no way to obtain them and nothing checked that the file and the
  emitters agreed. `eloc -p -t sql` now explains that they are installed in the
  database rather than prepended, and exits 1 rather than emitting a comment
- Also exported for hosts: `parseTypeExpr`, `formatDiagnostic`,
  `typecheckWithAnnotations`, `TypeAnnotations`, `readProgram`,
  `isPreludePrependable`

### Fixes

#### PostgreSQL

Closing the hole in the SQL acceptance runner — psql exits 0 after an error
unless `ON_ERROR_STOP` is set, so invalid SQL had been reported as a pass —
turned up twenty-six fixtures that psql rejected. Every one of these was
invisible for that reason.

- A list literal could not be indexed: `ARRAY[1, 2, 3][1]` is a syntax error
  where `(ARRAY[1, 2, 3])[1]` is 1, so `at`, `first` and `last` on a list
  written in place compiled to SQL psql refuses. The fixtures only ever indexed
  `_`, which parses either way
- An empty list compiled to `ARRAY[]`, which PostgreSQL rejects outright: an
  array constructor takes its element type from its elements. Every use of `[]`
  on SQL was invalid. The element type is now inferred from the list or from
  what the consuming operation requires, and the two places that seemed to need
  one do not — `xs == []` is `CARDINALITY(xs) = 0` and `xs + []` is `xs`
- `reverse([])`, `sort([])` and `unique([])` answered null where Elo says `[]`:
  `ARRAY_AGG` over zero rows is NULL, not an empty array
- An object field read was text whatever the field held, so
  `{ budget: 1500 }.budget = 1500` had no operator at all and arithmetic and
  ordering were as broken and more quietly — `'10' < '9'` is not an ordering.
  A field read is now cast to the type its context needs
- A jsonb value compared against a native SQL value had no operator either, and
  the worst case was not even a type error: `jsonb = 'Alice'` reads `'Alice'`
  *as json*, where a bare word is not valid json, so the complaint was about the
  literal. Everything in Elo's data family — object literals, `fetch`, `patch`,
  `merge`, `deepMerge`, `Data` — is tracked as jsonb and compared against jsonb
- A chain of member reads off a json value was not a json operation at all and
  fell through to the SQL dot: `fetch(d, .user).name` gave "syntax error at or
  near `.`". The chain now resolves in one `#>>` read
- `flat` emitted a second `UNNEST` of a scalar — "function unnest(integer) does
  not exist" — because PostgreSQL has no array of arrays, and a ragged list
  could not be built at all. It concatenates the parts instead, which never
  constructs the nested array
- `sum(xs, init)` folded against a literal zero, so the init had to be numeric:
  `sum([P1D, P2D], P0D)` could not put an interval next to an integer
- `floor(x)` and `ceil(x)` on a value of unknown type compiled to `x` —
  flooring did nothing — because `floor(Int)` is the identity and came first in
  the registration order
- A `let` binding a member read lost the member's type: `let one = { one: 1 }.one
  in one == 1` bound `->>'one'` as text and then had no operator for
  `text = integer`. It was the one place where naming a subexpression changed
  what a program meant
- `SET LOCAL search_path = ''`, which the postgres sandbox recipe recommended,
  made every helper call fail: the compiler emits them unqualified
- A list PostgreSQL cannot represent is **refused instead of emitted**. An array
  carries one element type and nests only rectangularly, so `[1, 'two']`
  compiled to `ARRAY[1, 'two']` ("invalid input syntax for type integer") and
  `[[1], [2, 3]]` to a nested array psql rejects outright. The compiler now says
  what it found and what to do instead — one type, or carry the value as `Data`.
  `[1, 1.5]`, `[D2024-01-01, NOW]` and `[1, null, 3]` are unaffected, since
  PostgreSQL unifies those

#### The CLIs

- **A `.elo` file is one program, not one expression per line.** Both CLIs split
  a source on newlines and compiled each line as its own program, so an
  expression spanning lines was handed to the parser in pieces — a type prelude
  followed by a multi-line schema was refused with "Expected IDENTIFIER but got
  EOF" — and a file of several expressions quietly produced several programs. A
  source is now an optional type prelude and one expression whose newlines mean
  nothing. The line-wise reading was only ever a test convention, for a fixture
  corpus of one-line assertions, and moved to `--lines`, which the corpus and
  the acceptance runners pass. A source holding two expressions is a parse error
  naming what was left over, with a hint pointing at `--lines`

#### Every target

- `(1 == 1) == true` was unparseable on PostgreSQL, whose comparison operators
  are non-associative, and **silently wrong on Python**, which chains
  comparisons: `1 < 2 == True` means `1 < 2 and 2 == True`, so `(1 < 2) == true`
  answered False. A comparison inside a comparison is now parenthesised
  whatever the precedence table says
- `let x = 1 in let x = x + 1 in x` is 2 and the inner binding leaves the outer
  one alone. **No target got both halves of that right**: JavaScript threw
  `ReferenceError: Cannot access 'x' before initialization`, Ruby and Python let
  the inner assignment overwrite the outer binding for the rest of the
  expression. A shadowing local is now emitted under a name of its own. With it:
  a type definition can build on the one it shadows, a lambda bound to a
  shadowing name calls the one it shadows, and a subtype constraint variable no
  longer overwrites a binding of the same name on Ruby
- `let x = 1, guard x > 0 in x` parsed while `let T = Int, x = 1, guard x > 0 in
  x` did not, because a value binding reached through a type definition was read
  by a near-copy of the binding loop that knew about `in` and not about the
  guard sugar
- `round(2 ^ -1)` answered 0.5 on all four targets rather than 1, because the
  type table declared `pow(Int, Int) -> Int` and `round` of an Int is the
  identity
- Two constructs emitted code no target could run, and are refused now:
  `fn( a, a ~> a )` compiled to `(a, a) => a`, `->(a, a) { a }` and
  `lambda a, a: a`, a syntax error in all three languages that have lambdas;
  and `{ i: Interval }` compiled to a call to an undefined `_p_Interval`, since
  `Interval` was on the schema-type allowlist with no runtime parser in any
  target. The `Interval(...)` constructor is untouched. Two type definitions of
  one name in one scope are refused too — they compiled, and the second
  silently won
- A hundred type definitions no longer hit the transform's depth guard, which is
  meant for deeply nested expressions: `let T1 = Int, … T101 = Int in 1` failed
  with "Maximum expression depth exceeded (100)", because each definition
  wrapped the body it scoped. They are one node now, and a thousand compile

#### Python

- `D2026-03-01 + P1M` landed on **31 March**: the duration was a millisecond
  count, so a month became thirty days. A plausible date, one day off, and
  wrong only for months whose length is not thirty — `D2026-04-01 + P1M` was
  right by accident. JavaScript, Ruby and SQL were all doing calendar arithmetic
- `_ + P1D` emitted a bare `+`, which raises, and `_ == P1D` answered **false
  for equal durations**, because the dynamic operators were registered as a
  fallback rather than as implementations and the arity fallback picked
  `add(Int, Int)` and `eq(Int, Int)`
- `flat([1, 2])` raised "'int' object is not iterable" where the other three
  targets pass a non-list element through

#### Ruby

- `datetime - datetime` on operands of unknown type emitted a bare `-`, and
  Ruby's DateTime difference is a `Rational` number of days rather than a
  duration — so the dynamic path answered `(1/1)` where the typed path answered
  86400 seconds
- The ten period boundaries on a value of unknown type picked `Date#end_of_week`,
  which is a Date at midnight rather than the last instant of the day
- `2 ^ -1` was `Rational(1, 2)`. It compares equal to 0.5, so only `typeOf`
  showed it — answering `'Tuple'`, the dispatcher having no case for a Rational
- `1.5 / 2.0` went through the dynamic divider with both types known, and
  `div(Float, Int)` emitted a bare `/`, which truncates: `2 ^ 3 / 16` was 0.
  Numeric division goes through `fdiv` for all four Int/Float combinations now,
  because a declared Float can still be an integer at run time
- `p_data` and `p_duration` were dead code that did not work — JSON parsed
  without `symbolize_names` never compared equal to an Elo tuple, and a `rescue`
  modifier that did not return handed invalid JSON back as the raw string.
  Wiring the helpers up is what exposed it

#### JavaScript

- `reverse([1, 2, 3])` raised `TypeError: split is not a function`: the
  registration sat inside the loop over the String functions, and `reverse` is
  the one name there whose String emission is wrong for a list

#### JavaScript and Python

- A month survived neither being **scaled** nor being **subtracted**:
  `D2026-03-01 + P1M * 2` was 30 April rather than 1 May on both, and
  `D2026-01-31 + (P1M - P10D)` was 20 February rather than 18 on JavaScript,
  where `sub(Duration, Duration)` was never registered at all and fell through
  to the millisecond-collapsing dynamic helper. An integer now scales each
  component and subtraction keeps both operands'. Ruby and PostgreSQL were
  right throughout

#### Website

- The documentation sidebars could not be scrolled to the end. The table of
  contents was capped at `max-height: 100vh` while the panel it lives in sits
  below the site header, so the bottom entries hung below their own sticky
  scroll container — the reference page simply lost everything from "Data
  Formats" down. The rule had been copied byte-identically into three
  stylesheets, which is how the same bug ended up on all three pages

### Internals

Not user-visible, but it is why the list above is as long as it is: the same
walk was written once per target, so a feature added to emission was added four
times and three of them were forgotten.

- The walk from IR to target code exists once. A target is an `Emitter` — flat
  data and plain functions, one per node kind, each handed its children already
  emitted. `src/compilers`: 1800 → 1618 lines
- All three targets build their emitted type parser from the same combinators,
  rather than two of them emitting 120 lines of hand-written loops as a string
  template in a language TypeScript cannot check
- The parser lost 263 lines: one way to read a comma-separated list instead of
  fifteen, the precedence ladder as data, and guard/check told apart by three
  tokens of lookahead rather than by three save/restore pairs
- Five registries of what a function accepts are pinned to each other by a
  test, in both directions. Thirty-two documented stdlib functions had no type
  entry at all and inferred `any`, poisoning everything downstream
- The SQL acceptance runner installs the prelude from the compiler and stops
  passing on psql errors. The acceptance corpus now executes four ways per run,
  the fourth being every fixture recompiled under `--optimize` and executed,
  which is what holds the annotations equivalent to the unannotated emission

### Known limitations

- The acceptance suite is green only under `TZ=UTC`, because a period boundary
  is an instant in the host's zone on JavaScript and Ruby and in the input's
  zone on PostgreSQL: `startOfDay(t)` does not agree across targets off UTC.
  Deciding what a boundary means is a language question and is still open
- A divided duration has three nominal lengths across the four targets:
  `inDays(P1Y / 2)` is 182.5 on JavaScript, Ruby and Python and 180 on
  PostgreSQL, which divides the calendar components. Underneath it, a month is
  30 days on three targets and 30.436875 on Ruby. Scaling and subtraction are
  fixed in this release; division needs a rule chosen between three defensible
  ones and is still open
- The acceptance suite is green only under `TZ=UTC` (see above), which is the
  same open question seen from the test runner
- Arithmetic on a fetched value — `fetch(d, .n) + 1` — needs a cast SQL cannot
  infer, so it works under `--optimize` with a declared schema and not otherwise
- `typeOf` inspects the value, so a whole-valued Float reports as `'Int'` on
  JavaScript, which has a single number type. It is the one case where `typeOf`
  is target-dependent

## [1.1.1] - 2026-11-01

A patch release: one security fix and one portability fix, no behaviour
changes. The same two fixes ship in the conservative 1.0.3 patch for projects
pinned below 1.1.0.

### Security

- Stop the parser going exponential on nested `let`, `guard` and `check`
  bindings, closing a compile-host denial of service. A 390-character
  expression such as `let a = 1 in` repeated 30 times never finished parsing;
  20 levels took a second, and each further pair of levels quadrupled it. The
  cause was the `in` keyword being overloaded between a binding and range
  membership (`x in 1..10`), told apart by a speculative parse that re-parsed
  the whole remaining expression at every level. The speculation is now skipped
  where it could never have succeeded. Parsing accepts and rejects exactly what
  it did before — verified by comparing both parsers over 1372 expressions —
  and 40 levels of nesting now parse in milliseconds

### Fixes

- Guard `process.env` access so the runtime loads in a browser, where it is
  undefined

## [1.1.0] - 2026-10-31

### Security

Hardening of the parser, transform, and runtime against denial-of-service and
sandbox-escape vectors, most reported under coordinated disclosure. All of
these also ship in the conservative 1.0.2 patch release.

- Bound parser recursion depth on every self-recursive descent (prefix operators, exponentiation, guard sugar, type definitions), closing a stack-overflow denial of service — reported by uaaw
- Count type-expression nesting against the depth guard in both the parser and the transform, closing a stack-overflow denial of service — reported by Atsushi Sada
- Reject applying a value not known to be a function, closing a Y-combinator non-termination denial of service — reported by Atsushi Sada
- Validate identifier-shaped type-node fields (subtype-constraint variable, schema keys, type names) in every compiler, closing an AST-API injection gap left open after the 1.0.1 fix — reported by Atsushi Sada
- Enforce the meta-property denylist inside the `fetch()` runtime helper, closing a prototype-chain bypass via variable, array, or concatenated keys — reported by uaaw
- Reject array multiplication (`[1] * n`), closing an unbounded-allocation denial of service — reported by Atsushi Sada
- Enforce the meta-property denylist inside `patch()` as well as `fetch()`
- Bound string repetition (`'a' * n`) and padding (`padStart`/`padEnd`) to a configurable maximum length (`ELO_MAX_STRING_LENGTH`, default 10,000,000), closing an unbounded-allocation denial of service
- Document the data contract for the `_` input: Elo operates on plain data, and passing host-language objects can run their own methods on the Ruby and Python targets

### Fixes

Nine defects that produced a wrong value rather than an error. Seven were
found by running the same program in several targets and comparing; the last
two were reported from production by Bricks, where the documented way to read
a key containing a dash was the thing that introduced the defect.

- Fix Python dropping parentheses when an operand's type is not statically known: `12 * (x + y)` compiled to `12 * x + y` whenever an operand was a lambda parameter, a member access, or anything else typed `any`
- Fix Python unary operators losing their operand's grouping: `-(a + b)` compiled to `-a + b`, even for integer literals
- Keep float literals afloat: `1.0` compiled to `1`, since `1.0` and `1` are the same JavaScript number and the decimal point was lost at parse time
- Fix `/` truncating in the Ruby target: Ruby truncates `Integer / Integer`, where Elo's `/` is real division
- Fix type selectors losing their operand's grouping: `Float(10 - 8) / 4` evaluated to 0.5 in no target — Ruby emitted `10 - 8.to_f / 4`, JavaScript `10 - 8 / 4`
- Make `round` agree on half-way values across all four targets: halves now round away from zero everywhere
- Fix `elo -e` and `eloc -e` dropping a multi-line expression whose first line is a comment — it printed nothing and exited 0
- Fix `at()` and `first()` leaking their nullish fallback into the caller in the JavaScript target: `count(first(list))` returned the element instead of its size, and `count(at(obj, 'a-key'))` returned the value — reported from production by Bricks
- Fix string functions emitting unparseable JavaScript on an integer literal: `upper(42)` compiled to `42.toUpperCase()`, where the dot reads as a decimal point
- Fix `replace()`/`replaceAll()` treating the search string as a regular expression on PostgreSQL while every other target matched it literally: `replace('a.b.c', '.', 'X')` now gives `aXb.c` on SQL too, and the ReDoS surface is gone

**Warning**: the four fixes above that concern arithmetic change results that
were previously wrong. `7 / 2` was 3 in Ruby and is now 3.5; `round(2.5)` was
2 in Python and is now 3; `round(-2.5)` was -2 in JavaScript and is now -3;
`1.0 / 4` was 0 in Ruby and is now 0.25. Code that compensated for any of
these needs revisiting.

### Diagnostics

- Distinguish a function name that does not exist from one whose signatures do not match: `concat('a','b','c')` now reports `No signature of concat accepts concat(String, String, String). Known: concat(String, String), concat(Array, Array)` instead of `Unknown function`

### Language

- Let bindings no longer consume nesting depth. `let a = …, b = …` was desugared into nested single-binding lets, so each binding cost one level and the transform depth guard — intended for deeply nested expressions — capped a program at 100 bindings. The guard is unchanged for genuine nesting.

### Standard Library

- Add `round(x, n)` to round to `n` decimal places, with the same half-away-from-zero rule
- Add the two-argument `min(a, b)` and `max(a, b)` alongside the list forms, so that `max(min(x, hi), lo)` no longer builds lists to compare two numbers. They compare rather than coerce, so they reach beyond numbers as the list forms do
- Add `slice(s, start, end)` for extracting a substring by start and (exclusive) end index — the pair to `substring(s, position, length)`
- Add `chr(n)` to write the character for a Unicode code point, so invisible characters such as a non-breaking space need not travel literally in source

## [1.0.1] - 2026-04-20

### Security
- Fix Ruby interpolation injection vulnerability in string literals and subtype-constraint labels — reported by Atsushi Sada
- Validate identifier and numeric-literal IR nodes in all compilers to prevent AST-API injection attacks — reported by Atsushi Sada
- Forbid member access on `constructor`, `__proto__`, `prototype`, and other meta-properties to prevent JavaScript sandbox escape via the `Function` constructor chain — reported by Atsushi Sada
- Fix constraint/guard label escaping in JS and Ruby emitters: switch to JSON-style (JS) and double-quoted-with-`#`-escape (Ruby) so backslash-terminated labels no longer break out of the string literal
- Extend the meta-property denylist to `fetch()` datapath segments and string keys, closing a runtime bypass of the member-access guard

## [1.0.0] - 2026-03-25

### Language
- Add `Date` as a built-in type selector for data schemas (e.g., `let Event = { date: Date } in data |> Event`)
- Add `extract()` for mustache-style text extraction (e.g., `extract('Hello Alice', 'Hello {{name}}')`)

### Standard Library
- Add `isNotNull(value)` function as inverse of `isNull()`

### Fixes
- Fix CodeMirror duplicate instance error in website build

## [0.9.14] - 2026-02-19

### Fixes
- Fix `min` and `max` on DateTime arrays in JavaScript: preserve DateTime type instead of converting to Int

## [0.9.13] - 2026-02-18

### Fixes
- Fix `Int()` conversion on alternative expressions with any-typed first value (e.g., `Int(tuple.x|0)` now correctly converts string values)
- Unify `fetch` path semantics: `fetch(data, 'key')` now works as single-segment path, and `fetch(data, ['a', 'b'])` traverses `data.a.b` consistently with `fetch(data, .a.b)`.
  **Warning**: code using `fetch(data, [.a, .b])` to extract multiple values into an array will break; use `[fetch(data, .a), fetch(data, .b)]` instead.

## [0.9.12] - 2026-02-04

### Standard Library
- Add `union(Interval, Interval)` and `intersection(Interval, Interval)` arithmetic functions
- Add `Duration(Interval)` conversion function

### Security
- Restrict member access and method calls to data types only, preventing exposure of runtime internals

### Website
- Indent stdlib subsections in mobile menu for better readability

## [0.9.11] - 2026-02-04

### Language Features
- Add `Interval` type with selector and `start`/`end` accessors

### Standard Library
- Add `count(List)` summary function (alias for `length`)
- Add `sum(List)` and `sum(List, initial)` summary functions
- Add `avg(List)` summary function (returns `null` on empty lists)
- Add `contains`, `find`, `sort`, `sortBy`, `unique`, `flat` List functions
- Add `reverse`, `trimStart`, `trimEnd`, `isBlank` String functions

## [0.9.10] - 2026-01-31

### Standard Library
- Add `min` and `max` functions for lists (returns `null` on empty lists)
- Add `startOfDay`, `endOfDay`, `startOfWeek`, `endOfWeek`, `startOfMonth`, `endOfMonth`, `startOfQuarter`, `endOfQuarter`, `startOfYear`, `endOfYear` for Date and DateTime values

### Fixes
- Fix SQL `endOf` period boundaries: use second-level precision instead of day-level
- Fix Ruby `startOf`/`endOf` on Date inputs to return DateTime consistently

## [0.9.9] - 2026-01-31

### Language Features
- Allow pipe operator (`|>`) in `let` binding values without requiring parentheses

### Fixes
- Fix operator precedence bug in alternative expressions for JavaScript and Python compilers

## [0.9.8] - 2026-01-31

### Testing
- Add Python compiler unit tests — contributed by [cyberpsychoz](https://github.com/cyberpsychoz)
- Fix Windows compatibility in test scripts — contributed by [cyberpsychoz](https://github.com/cyberpsychoz)

## [0.9.7] - 2026-01-27

### Security
- Fix code injection vulnerability in date/datetime/duration literal emitters (all targets) — reported by [naoyashiga](https://github.com/naoyashiga)

## [0.9.6] - 2026-01-27

### Language Features
- Allow trailing commas in lists, tuples, function arguments, and type definitions

### Fixes
- Fix blog post examples and add validation tests
- Show error output when acceptance tests fail

### Testing
- Unify website example tests with full evaluation

## [0.9.5] - 2026-01-03

### Language Features
- Add guard and check expressions for runtime validation
- Add labeled subtype constraints (Finitio-style) with better error messages
- Add polymorphic fetch for extracting multiple paths into tuples or lists

### Playground
- Add fetch-to-tuple and fetch-to-list examples
- Reorganize examples dropdown to match Reference structure

### Documentation
- Document guards on home page, Try, and Learn sections
- Add blog post about guards, checks, and polymorphic fetch

### Fixes
- Fix Ruby syntax error in labeled constraint error messages

## [0.9.4] - 2026-01-03

### Language Features
- Add Null type selector for null checking in type definitions
- Add String selector for converting values to strings
- Validate type references at compile time

### Tools
- Add CSV input/output format support with pluggable adapter architecture

### Playground
- Add JSON output toggle
- Display output as Elo code instead of raw JSON
- Add input data support to clickable examples
- Improve UX for examples with input data
- Refactor layout with vertical flow

### Website
- Fix link visibility in dark mode
- Redesign home page with "What Makes Elo Different" section
- Refactor CSS into modular design system architecture

### Documentation
- Reorganize Reference documentation structure
- Clarify DataPath as syntax sugar over List
- Improve contributor documentation

## [0.9.3] - 2025-12-28

- Add Get Started section and button on website
- Fix compile API to return raw function without auto-executing
- Add blog post announcing Elo 0.9.x

## [0.9.2] - 2025-12-28

- Add `--version` flag to `elo` and `eloc` CLIs
- Add `elo` binary to npm package

## [0.9.1] - 2025-12-28

First published npm release.

### Language Features
- Expression language compiling to JavaScript, Ruby, and PostgreSQL SQL
- Data types: Number, String, Boolean, Date, Datetime, Duration, List, Tuple, Null
- Operators: arithmetic, comparison, logical, pipe, alternative
- Control flow: if/then/else, let bindings
- Functions: lambdas, closures, single-param sugar syntax
- Type definitions (Finitio-like) with constraints

### Standard Library
- String manipulation (15+ functions)
- Numeric operations
- Temporal functions and keywords (NOW, TODAY, SOD, EOD, etc.)
- List operations (map, filter, reduce, any, all, etc.)
- Data path navigation and patching

### Tools
- `eloc` compiler CLI with multiple output formats
- `elo` evaluator CLI for quick expression testing
- `compile()` API for JavaScript integration
- Try Elo web playground

### Documentation
- Comprehensive Learn section for beginners
- Language reference
- Stdlib browser with search
- Interactive exercises
