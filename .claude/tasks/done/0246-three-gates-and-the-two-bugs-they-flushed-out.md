# Three gates, and the two bugs they flushed out

> "Work on 0244, let's finish this branch with more security harness for 1.2.3,
> otherwise I'll keep receiving bug bounties contributions all the time. Maybe
> we can see SQL later, but covering Typescript, Ruby and Python is a must
> have."

0245 built the emitted-grammar gate for JavaScript and Ruby. This finishes the
set — Python, and parity rules for Ruby — and audits the one region all three
gates exempt. Both halves found a live vulnerability, which is the only
evidence that matters for a harness.

## What was built

### The Python gate (`test/acceptance/gate-python.py`)

Measured first, as before, over the 1376 emitted Python programs:

| | corpus-wide |
|---|---|
| free names, after binding analysis | **84** — prelude helpers, three modules, 22 builtins |
| attribute names | **34** |
| node kinds | **44** |
| key subscripts with a runtime index | 12, in two shapes |

The attribute list is the one that earns its keep. **Every Python sandbox
escape is spelled with a dunder** — `x.__class__.__bases__[0].__subclasses__()`,
`f.__globals__`, `().__reduce__` — and the corpus reads 34 attribute names, not
one of them a dunder. A closed list of 34 bans the entire vocabulary by
construction, which no denylist of meta-names could. The name list does the
same for `eval`, `exec`, `__import__`, `open`, `getattr` and `compile`: they
are excluded by not being on it.

Unlike the other two there is **no helper region to exempt** — Python's prelude
is installed separately rather than inlined — so the whole emission is emitter
output and every helper is just a free name.

Three things the measurement corrected, each a rule I would otherwise have
written wrong:

- **Slices are not an escape vector.** `obj[a:b]` on a mapping raises and on a
  sequence returns a sub-sequence, so only a *key* subscript is policed. The
  first draft flagged `(a + "cd")[x:x+2]` from `substring`, where `x` is a
  checker-typed lambda parameter no syntactic rule can prove integral.
- **A dunder-shaped *string* is not a finding.** The first draft flagged
  `{"__proto__": 1}` — legitimate Elo data. A string cannot become an
  attribute without `getattr`, which the name rule already refuses. A rule
  there is false positives bought with no coverage, so there is none.
- **`str.splitlines()` splits on U+2028.** The gate read the corpus with it and
  tore the `extract-line-separator` fixture's programs in half, reporting the
  halves as syntax errors. `split('\n')`. A fitting bug to hit in the harness
  for a U+2028 vulnerability.

The two runtime-indexed subscript shapes are both provably integral and are
admitted by stating *why* rather than by matching the spelling: a name bound by
`for … in range(…)`, or one an enclosing `isinstance(i, int)` has proved —
which is how Python's `at()` emitter inlines its guard.

**Seen red:** reverting `src/bindings/python.ts` to before the exponentiation
bound gives `v0 ** v1`, and `Pow` is not in the node list — 23 violations in 23
programs.

### Ruby parity (`gate-ruby.rb`)

Ruby had three rules to JavaScript's seven. Added, all measured outside the
helper `def`s: a **method allowlist** (74 — excluding `send`, `__send__`,
`public_send`, `instance_eval`, `method`, `const_get`,
`instance_variable_get`, `binding`), a **bare-call allowlist** (22 — excluding
the whole Kernel surface: `system`, `exec`, `require`, `load`, `eval`, `fork`,
`open`), and **no constant assignment anywhere**.

That last rule was written because of what the measurement turned up.

## The two bugs

### 1. An Elo type name overwrote a Ruby constant, process-wide

Measuring Ruby constants for an allowlist returned 266, which is far too many —
and the reason is that *user type names were in the list*. Chasing that:

```
$ ./bin/eloc -t ruby -x -e "let Hash = Int in ('42' |> Hash)"
… Hash = ->(v) { p_unwrap(_p_Hash.call(v, '')) }; Hash.call("42") …
```

Elo type names are UPPER_IDENTIFIER. An uppercase bare name in Ruby is a
**constant**, and a constant assignment is not scoped — it rebinds the name for
the whole process, with a warning and no error:

```
warning: already initialized constant Hash
AFTER: Hash is #<Proc:0x000000012… (lambda)>
```

The prelude itself asks `r.is_a?(Integer)`, so `let Integer = Int in …`
followed by any multiplication raised `TypeError: class or module required` —
and a host that used `Hash`, `String` or `File` after evaluating an expression
got whatever that expression left behind. The security page says emitted code
is a pure function of its input; this mutated host global state from **plain
source text**, no AST API needed.

JavaScript scopes the same binding (`const X` in an IIFE) and Python does
(a lambda-local walrus). Ruby alone — the usual shape.

Fixed by emitting a `_t_`-prefixed local. Red first:
`test/fixtures/security/type-name-scope/type-name-scope.elo`, whose second line
is the assertion that matters — it only passes if the first line left the
host's `Integer` alone. Red on Ruby, green on JS and Python before the fix.
Blast radius: six Ruby fixtures, and stripping `_t_` from the diff leaves
nothing, so the change is the prefix and only the prefix.

### 2. A `__proto__` schema key was not a data key, in `pSchema`

The second half of the task was to audit the region all three gates exempt,
since the coverage audit had put six of eighteen uncovered issues inside it.
Listing every computed write in `JS_HELPERS` took one query and returned six,
across four helpers. Five were guarded — `kFetchObject` with `defineProperty`,
`kPatch` with a denylist, `kDeepMerge` fixed earlier on this branch. The sixth:

```js
pSchema: … for (const [key, parser, optional] of props) { … o[key] = r.value; }
```

`__proto__` is a legal Elo identifier and therefore a legal schema key, so that
assignment ran the [[Prototype]] setter. `let T = {__proto__: Int}` silently
dropped the key; `let T = {__proto__: {a: Int}}` returned an object whose
prototype was the input's data. The matching read, `v[key]`, took the input's
*prototype* rather than its own property.

This is exactly the `kDeepMerge` bug (35a9f77), in the one helper that still
had it — one invariant, four sites, three updated, which is the shape 0243
named as the cause of this entire class.

Red first, in `security/proto-key/proto-schema.elo`. Elo cannot read
`__proto__` back (member access and fetch both refuse the meta-property names),
so the assertion observes the **data loss** instead: a round trip through the
schema must preserve the key. Red on JavaScript, green on Ruby and Python,
which store it in a Hash and a dict.

Fixed with a new `pSet` helper plus `kMember` for the read.

**A third thing fell out of it.** Reading through `kMember` made a missing key
report `got Null` where the bare `v[key]` had said `got undefined` — and Ruby
and Python both already said `Null`. A unit test was pinning the divergence.
Updated, with the reason: `undefined` names something Elo does not have.

## What the exercise says about the method

Both bugs were found by **building the allowlist**, not by running the gate.
Nothing was red when they were found; the measurement was. 266 Ruby constants
was the wrong number, and asking why produced a host-state corruption bug. Six
computed writes in the helpers was a small enough number to read, and reading
them produced a prototype-pollution bug.

That is worth saying because it is not what a harness is normally for. The gate
catches regressions; enumerating what the gate must allow is what catches the
bugs that are already there. The second is a one-time cost per target and it
has now paid twice.

## State

| | |
|---|---|
| gates | JavaScript (unit + integration, 4 compile modes), Ruby, Python — plain and `ELO_OPTIMIZE` |
| self-tests | 20 JS, 16 Ruby, 15 Python, each a real escape shape |
| corpus | 1364 JS / 1395 Ruby / 1386 Python emitted programs, 0 violations |
| suites | unit 2015, integration 4098, acceptance green on four targets |

The two pre-existing JavaScript `startOf` timezone failures fail identically on
`main`.

**Not done, deliberately:** SQL, which the prompt deferred — and which has no
parser in reach, so it needs its own investigation rather than an afternoon.
The helper region is audited *once*, by hand; keeping it audited is H8b in
0244, as is consolidating the four copies of the "`__proto__` stays data"
logic onto `pSet`.
