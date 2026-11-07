# Write down the grammar we are allowed to emit

> "So, there is no way to say, e.g., 'we never use Javascript's `[]` operator,
> except in a prelude helper' and have a linter enforce that?"
>
> "That's definitely not enough IMO, because it's a harness in a .md file;
> think harder. how can we enforce those rules with a build that fails if we
> violate them?"

Both corrections landed. 0244 had ranked post-emission checking low ("a weak
second line") and then, having been talked out of that, left the fix as a plan
in a markdown file. A plan enforces nothing. This task is the enforcement.

## What the question exposed

I had dismissed post-emission checking because I was thinking of *string*
scanning, which is weak. AST scanning is a different thing entirely, and the
reframe is the whole value:

**Elo's output is not JavaScript.** It is a very small sub-grammar of
JavaScript that had never been written down — so nothing could notice an
emitter stepping outside it. Same for Ruby. Writing the grammar down turns
"did the emitter remember to escape / to call the helper" from a question a
reviewer asks once into a question the build asks on every emission.

And crucially: **it needs no test input.** Every other item in 0244 only fires
if somebody imagined the program that triggers the bug. A grammar gate is a
property of the *emitter*, checked against whatever happens to be compiled.

## Measured before built

The rule is only usable if the exception list is short, so that was measured
first, over all 129 JS fixtures — 1364 emitted programs — splitting each into
the prelude helpers (`FunctionDeclaration`s) and everything else:

| outside a helper | corpus-wide |
|---|---|
| computed member access `x[k]` | **75**, in two shapes: 68 numeric-literal, 7 of `a[a.length - 1]` |
| free identifiers | **six**: `Error`, `DateTime`, `Duration`, `Interval`, `Math`, `String` |
| distinct `.property` reads | **54**, all luxon or JS built-ins |
| `new` | one: `new Error` |
| assignments | **zero** |

Ruby via `Ripper`: zero parse failures, 62 node kinds, zero backticks, zero
`@ivar`/`$gvar`. Interpolation does occur — 73 sites outside the helper
`def`s — but every one is the compiler's own error prose over a local, five
node kinds and two method names wide.

So the exception list is one shape, and it is `last()`.

## What was built

| file | what |
|---|---|
| `test/support/emitted-js-grammar.ts` | the JS grammar: rules, `ALLOWED_GLOBALS` (6), `ALLOWED_PROPERTIES` (54), `isStaticallyNumericIndex` |
| `test/unit/emitted-grammar.unit.test.ts` | every `.expected.js`, plus 20 tests of the gate itself |
| `test/integration/emitted-grammar.integration.test.ts` | every fixture line × 4 compile modes |
| `test/acceptance/gate-ruby.rb` | the Ruby grammar via Ripper, with a `--self-test` |
| `test/acceptance/gate-grammar.sh` | wiring, honouring `ELO_OPTIMIZE` |

Two design points worth keeping:

**Rule 2 is a property, not a pattern.** A bare `x[k]` is safe exactly when `k`
cannot name a meta-property, so `isStaticallyNumericIndex` admits an index
built only from numeric literals, `.length` reads and `+ - *` — every such
expression is a number or `NaN`, never a string. That admits both shapes the
compiler emits and rejects `xs[_.i]`, which is the typed-`at()` escape. Stating
it as a property rather than as a regex on `a.length - 1` is what makes it
survive the next emitter.

**The integration test exists because the committed fixtures are one mode.**
`--optimize` picks *different emitters* — that is the whole mechanism of the
typed `at()` escape — and no `.expected.js` records it. A gate over the
committed corpus alone would have stayed green through 1.2.3. So every fixture
line is compiled four ways and all four are gated.

## Seen red

A harness nobody has watched fail is a harness nobody knows works, and this one
is all negative space. Reverting this branch's fixes, one file at a time:

| reverted | gate says |
|---|---|
| `src/bindings/javascript.ts` to `45d71d0^` | `[no-computed-member-access] [10, 20, 30][i]` ×2 — the typed `at()` sandbox escape |
| same | `[parses]` — the U+2028 `extract()` emission, which is not valid JavaScript |
| same | `[no-unlisted-property] Math.pow` ×6 — the removed exponentiation bound, visible because `kPow` stopped being called |
| `src/extract.ts` to `ee67619^` | `[no-host-variable] @x`, `@@x` — the `#@ivar` interpolation RCE |

**Three of this branch's six fixes are caught structurally**, by a check that
knew nothing about any of them. Plus ten Ruby self-tests and twenty JS gate
tests, each a real emission from a real fixed vulnerability.

## The coverage hole it found

The first revert did *not* fire on `at()`. The reason is the finding: **no
fixture indexed a list with anything but a literal.** `at([1,2,3], 0)` four
times over, and nothing else — so the emitter holding the escape was never
reached by the corpus, and neither the acceptance suite nor the gate could see
it. The 1.2.3 fix was correct and its unit test was real, but the corpus had a
hole shaped exactly like the bug.

Closed with assertions that are ordinary Elo anyone would expect to find:

- `stdlib/list/access/at.elo` — a computed index, a `let`-bound index, an
  out-of-range bound index (all four targets, SQL included);
- `reference/at-dynamic-index.elo` — ten assertions, typed *and* dynamic as
  CLAUDE.md requires, since a lambda parameter is `any`;
- `security/ruby-interpolation/ruby-interpolation.elo` — `#@x`, `#@@x`, `#$x`
  and `#{z}` inside `extract()` templates, which is the source-reachable half
  of the `#` class (the temporal-literal half needs the AST API).

Only after those did the revert go red on `at()`. That sequence is the point:
the gate found a gap in the corpus, and the corpus made the gate able to see
the bug.

## Honest limits

- **The helper region is exempt**, by construction — helpers are *where* the
  guarded bracket reads and the `defineProperty` writes belong. So this would
  not have caught `__proto__` in `kDeepMerge` or the `fetch` prototype chain.
  The trade is that the helpers are ~46 functions in one file, changed rarely,
  reviewable line by line. If that set starts growing fast, revisit.
- **Python is not gated yet** — same approach, `ast` is standard library, and
  the dunder-dispatch reports are what it would speak to. Item 3 in 0244.
- **It is in `test/`, not in `src/`**, only because the parser is: `typescript`
  is a devDependency and Elo ships one runtime dependency. Making `compile()`
  itself fail closed is item 6 in 0244 and needs either a promoted dependency
  or a hand-written recogniser. Worth doing — that is the version that defends
  a user running a build whose tests we never wrote.
- **A grammar gate cannot see `v0 * v1` on a string.** §1.3 of 0244 is
  untouched by this and still needs the force-dynamic axis and the
  bounded-primitive table.

## Blast radius

No `src/` behaviour changed. Three fixtures gained lines and were regenerated;
`at.expected.*` moved two lines onto `kAt` because a computed index is no
longer a literal, which is the 1.2.3 fix doing its job. Unit 2010, integration
4048, acceptance green on all four targets, plus `ELO_OPTIMIZE=1`. The two JS
`startOf` timezone failures pre-date the branch and fail identically on `main`.

## Lesson

0243 ended on "the correct code already existed somewhere else in the
repository" and concluded that the matrix needs enumerating. This task says
something sharper: for the §1.1 and §1.2 classes **we do not need to enumerate
the matrix at all**, because the invariant is visible in the output without
knowing which cell produced it. Enumeration is still needed for the classes
that are invisible in the shape — unbounded arithmetic, lying inputs — and
that is what 0244 still has to do.

The other lesson is procedural: the measurement came before the rule, and it
is what made the rule defensible. "No `[]` outside a helper" sounded like it
would need a hundred exceptions. It needs one.
