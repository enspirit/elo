# Six doors the reports did not find

> No prompt on file for the six fixes themselves: they came out of a
> self-directed sweep, on branch `security/typed-at-sandbox-escape`, of the bug
> *classes* that 0241 (squ11z1's four reports) and 0242 (the Aikido export)
> had just exposed. The write-up was commissioned afterwards:
>
> "Check this branch (and more generally all recent security issues fixes).
> 1/ Write a done task and changelog for security fixed done."

0241 closed four reported issues and two siblings found while fixing them. The
useful observation at the end of it was that the four reports were not four
bugs but **three shapes**, and that a shape is searchable where a bug is not.
This task is that search, carried across all four targets and both dispatch
paths. It found six more, none reported from outside.

Each is one commit, red-first, seen fail on every affected target before the
fix. All three test levels green at the end, plus
`test:acceptance:optimize`.

## The three shapes, and what each one hid

### Shape A — a value embedded in target syntax without the target's escaper

The emitter for a new kind of literal reaches for `JSON.stringify` (or writes
`'…'` by hand) instead of the escaper the target already has. The escaper
exists; the call site forgot it. This is 1.2.3's SQL temporal literals and SQL
`fetch` key, again.

**A1 — `#` in Ruby temporal literals and in the `extract()` regex (`ee67619`).**
A double-quoted Ruby string interpolates `#{...}`, `#@ivar` and `#$global`.
Every Ruby string in the emission goes through `escapeRubyDQ`, which escapes
`#` for exactly that reason — except `dateLiteral`, `datetimeLiteral` and
`durationLiteral`, which used `JSON.stringify` (escapes `\`, `"`, control
chars; not `#`). A value reaching them through the compiler AST API became
`` Date.parse("2024-01-01#{`id`}") `` and ran a shell command under the
standard prelude (`require 'active_support/all'`).

The same hole, independently, in `escapeRegex`: it escaped `{ } $ \` but not
`#`. `#{code}` was already dead because the `{` got escaped — but `#@ivar` and
`#@@cvar` need no brace, and `@` was untouched, so `extract(_, '#@x {{n}}')`
emitted `/#@x …/` and interpolated a host instance variable at match time.
**That half is reachable from plain source text**, not only through the AST
API, which is what makes it the more serious of the two.

Ruby-only: JavaScript, Python and SQL embed the same value as inert data. A
target divergence in the escaping layer is the tell.

**A2 — U+2028 / U+2029 in the JavaScript regex literal (`787f028`).**
`escapeRegex` turned `\n`, `\r`, `\t` into escape sequences, and the JS binding
escaped `/`. But U+2028 and U+2029 are *also* line terminators inside a
JavaScript regex literal — and nowhere else — so a template carrying one closed
the `/…/` early and the emission was a `SyntaxError`. Not injection (the
closing `/` stays escaped, so no token can follow), but under `--execute` and
the `compile()`/`formats` paths the output is handed to `new Function(…)`, so
attacker-controlled Elo source crashed the host at parse time.

The reference fixture was red on JavaScript and green on the other three — the
same divergence tell as A1.

### Shape B — a native operator reached on an operand whose type is a promise

The guard lives in a prelude helper; some path spells the native operator
directly. Two sub-cases, and the branch found one of each.

**B1 — the *typed* `at()` under `--optimize` (`45d71d0`).** 1.2.3 hardened the
dynamic `at(any, any)` into `kAt` (index only a real array, by an integer).
The typed `at([Int], Int)` emitter was left spelling `x[k] ?? null`, on the
reasoning that the checker knows the types there. It does — but *a declared
input type is a promise, not a runtime check*. With `--input-type` (or any
schema coercion), `_.i` compiles to a bare `kMember` read that hands back the
raw value, uncoerced. So `{xs: [], i: 'constructor'}` sent against a program
the author declared honestly as `{xs: [Int], i: Int}` returns the `Array`
constructor — one hop from `Function`, and `apply` is unchecked too, so
`(at(_.ctx, _.k))(_.arg)` then calls an attacker-named host member.

`--optimize` is what chooses the typed emitter (it feeds the checker's
annotations back into codegen), so the fix in 1.2.3 and the escape here are the
same emitter pair with only a compile flag between them. The fix keeps the bare
read for a compile-time **integer literal** index, which can never name a
meta-property, and routes every runtime-supplied index through `kAt`.

**B2 — `*`, `%` and `^` on the dynamic path (`2e5bf78`).** Ruby and Python
spelled these with native operators whose String and bignum overloads skip the
`ELO_MAX_STRING_LENGTH` guards the typed path enforces:

| expression | Ruby / Python | JavaScript | now |
|---|---|---|---|
| `x * n`, String `x` | unbounded `String#*` — gigabytes | `NaN` | bounded repeat, all targets |
| `x % n`, String `x` | `sprintf` — `'%30000000d' % 1` | `NaN` | refused (it is a type error anyway) |
| `a ^ b`, Ints | exact bignum — `2 ^ 1e9` is ~125 MB | `Infinity` | refused past the bit-length cap |

Note the second column: JavaScript answered `NaN` where Ruby allocated. This is
simultaneously an allocation bug *and* a semantics divergence, and the second
is what makes it findable — the dynamic/typed pair CLAUDE.md asks for would
have caught the `*` case on the first assert.

### Shape C — a recursive walk in the compiler with no depth bound

**C1 — `pathOf` and `collectNonNullPaths` in the checker (`38cfce9`).** Both
recurse over the AST, and both run **on the outermost node over the whole
structure** — before the per-node depth guard (100) gets a chance to fire. A
hostile-depth `_.a.a.a…` member chain or an `isNotNull(a) and isNotNull(a) and
…` condition overflowed the native stack with a `RangeError` rather than the
controlled rejection every other nested construct gets. Both run on the default
compile path, so `eloc -e '_.a.a…'` crashed the compiler.

The parser already handled both shapes iteratively; these two helpers were the
gap. Both are now a loop / an explicit worklist, so any length falls through to
the existing guard. This one is a direct hit on a property the security page
states in so many words: *"It always finishes. No expression — however deeply
nested or malformed — makes the compiler hang or overflow its stack."*

### Not a shape — the one that was its own thing

**`__proto__` in `kDeepMerge` (`35a9f77`).** `{__proto__: x}` is a data property
in Elo, and the object-literal emitter, `kFetchObject` and `kPatch` all use
`Object.defineProperty` to keep it one. `kDeepMerge` did a bare
`result[key] = …`, which for `__proto__` runs the prototype setter, so
`deepMerge({a: 1}, JSON.parse('{"__proto__": …}'))` repointed the result's
prototype to attacker data. No global `Object.prototype` pollution (fresh copy,
per-object setter) and Elo reads own-properties only, so it could not be read
back — but a host handed the result sees an attacker-controlled prototype, and
the contract was broken on this one path of four. JavaScript only; a Ruby Hash
and a Python dict store the key as data.

It is "not a shape" only in the sense that it is not one of A/B/C. It *is* the
same meta-pattern: **one invariant, four implementation sites, three of them
updated.**

## How they would have been priced

Same policy and same two rules as 0241 (ceiling is High, no Critical tier; the
sandbox rule only bites on resource issues). Maintainer-found, so no bounty is
owed — rated only to check the rubric still lands consistently.

| Commit | Issue | Break type | Severity |
|---|---|---|---|
| `45d71d0` | typed `at()` escape under `--optimize` | capability escape → host RCE | **High** |
| `ee67619` | Ruby `#` interpolation (temporal + extract) | injection → host RCE | **High** |
| `35a9f77` | `__proto__` in `deepMerge` | integrity break, not readable back | **Medium** |
| `38cfce9` | checker recursion → `RangeError` | compile-host DoS | **Medium** |
| `787f028` | U+2028 → invalid JS → host parse crash | emits invalid code; eval-host DoS | **Medium** |
| `2e5bf78` | dynamic `*` / `%` / `^` bounds | resource/allocation | **Low** |

`45d71d0` and `ee67619` are High for the same reason #1 was in 0241: a
capability escape is the one thing *only* Elo's sandbox defends, and a resource
sandbox does not contain it. `38cfce9` is **not** discounted by the sandbox
rule — the rule is about the host running *compiled output*, and the compile
host is a different machine with a property the page states outright.
`787f028` sits just under it: the crash is in the eval host, but it needs no
hostile data, only hostile source. `2e5bf78` is Low on 0241's precedent — a
primitive we failed to bound, in scope, scored at the floor.

## Blast radius

The emission moved on three of the six, and the regenerated diff is worth
reading as evidence rather than as noise:

- `2e5bf78` is the wide one — every `^`, every dynamic `*` and `%` changed
  spelling, so `power`, `modulo`, `arithmetic`, `lambda`, `imports`,
  `precedence-dynamic` and a dozen others moved. Ruby gained typed numeric
  `mul`/`mod` fast paths specifically so that *only the dynamic cases* change;
  the diff confirms the typed lines are untouched.
- `45d71d0` moved exactly one line: `at([1,2,3], -1)`. `-1` is a `neg()` call,
  not an `int_literal`, so it now takes the guard. Behaviour identical.
- `ee67619` moved the four `extract` fixtures to the `\#` spelling.
- `38cfce9`, `35a9f77`, `787f028` changed no existing expected output.

Nothing unexpected appeared in the diff, which is the only thing a regenerated
fixture is good for.

## Lesson

Three shapes, twelve instances across 1.2.3 and this branch, and in every
single case the *correct* code was already present somewhere else in the same
repository — `escapeRubyDQ` next to `JSON.stringify`, `kAt` next to `x[k]`,
`k_str_mul` next to `String#*`, `defineProperty` next to `result[key] =`, an
iterative parser next to a recursive checker. Not one of these was a missing
idea. Every one was a missing *application* of an idea, at one cell of a matrix
nobody enumerates: **four targets × two dispatch paths × N value slots**.

That matrix is machine-enumerable, and the invariants at each cell are
machine-checkable — the security page already states eight of them in prose,
and none of them is tested as a property today. Writing that harness is
`0244-the-matrix-nobody-enumerates`.
