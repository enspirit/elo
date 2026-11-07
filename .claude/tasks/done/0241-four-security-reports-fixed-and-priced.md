# Four security reports, fixed and priced

> "in a separate branch, check and fix .claude/tasks/security/*.eml ; always
> write a test showing the failure, then fix it (red -> green). I need an
> evaluation for bug bounty for each, according to our policy."

Four reports from **Mykhailo Shushman (squ11z1)**, one coordinated batch, under
`.claude/tasks/security/squ11z1/*.eml`. All four valid and in scope. Each got a
red-first assertion in `test/unit/security.unit.test.ts`, seen red, then green,
then verified *executing* on node / ruby / python / psql — not just asserted on
the emitted shape. Fixed on branch `security/1.2.2-reports`.

## The four bugs

**#1 — `at()` inherited-constructor escape → host RCE (JavaScript).**
`at(x, 'constructor')` on an untyped operand emitted a bare `x["constructor"]`,
which walks the prototype chain to the `Function` constructor:
`at(at(_, 'constructor'), 'constructor')('return 2+40')()` returned `42` — real
host-code execution (`child_process`, `process.env`, filesystem) from a plain
string input, no data object. The typed `at(List, Int)` binding is safe; the
dynamic dispatch fell back to it with a *string* key. Fix: a dynamic
`at(any, any)` binding that indexes only a real array by an integer (`kAt` on
JS; Array/Integer-guarded inline on Ruby/Python, which erred rather than leaked
but now agree). SQL has no lambdas and no prototype chain, so it was never
reachable there.

**#2 — SQL temporal-literal injection (date / datetime / duration).**
`stringLiteral` doubles the backslash and `E'…'`-prefixes; the three temporal
emitters doubled only the quote. A backslash-bearing value from the compiler
AST API escaped the literal under `standard_conforming_strings=off` (deprecated,
non-default): `DATE '2024-01-01\''; SELECT 424242; --'`. Fix: all three share a
`sqlStringConstant()` helper. Verified on psql under `scs=off` — the payload
now stays inside the literal and errors as an invalid date instead of running.

**#3 — SQL `fetch` object-key injection.**
The object-literal emitter runs keys through `assertSafeIdentifier`; the
`fetch(data, {key: path})` form emitted `'${key}'` raw. An AST-API key injected
a sub-select — a single-statement read under **default** Postgres settings. Fix:
the `fetch` object key now goes through `assertSafeIdentifier` too. The parser
only ever produces IDENTIFIER keys, so no valid program is rejected.

**#4 — unbounded `patch` growth and non-literal `replace`.**
`patch([], .N, 1)` extended an array one element per iteration with no bound —
O(N²) in the SQL prelude. And `replace`/`replaceAll`, documented *literal*, let
JS `$'` and Ruby backreferences in the replacement expand the output
superlinearly. Fix: the fill is one bounded concatenation (index capped by
`ELO_MAX_STRING_LENGTH`; SQL index 200k went 60s+ → 75ms), and replace inserts
the replacement verbatim (function form on JS, block form on Ruby). Python and
SQL were already literal.

## The bounty assessment

Policy: https://elo-lang.org/security — bands **High / Medium / Low** (no
Critical tier today), grid **Medium 50 €**, **High 100 €**, **×2 if the reporter
provides a fix**. The reporter supplied no fixes, so no ×2.

Two rules shaped the scoring, set during review:

1. **Ceiling is High** — there is no Critical tier.
2. **Sandbox rule** — if the memory+timeout *resource sandbox* the policy
   already requires the host to run would contain the issue, it cannot be High.
   This only bites on **resource** issues; a capability escape or an injection
   is a confidentiality/integrity break a resource sandbox does not contain.

| # | Title | Break type | Sandbox contains it? | Severity | Award |
|---|-------|-----------|----------------------|----------|-------|
| 1 | `at()` → host RCE (JS) | capability escape | No | **High** | 100 € |
| 3 | SQL `fetch` object-key injection | injection (default config) | No | **High** | 100 € |
| 2 | SQL temporal-literal injection | injection (gated) | No | **Medium** | 50 € |
| 4 | patch quadratic + `replace` expansion | resource/allocation | Yes | **Low** | credit only |

**Total ≈ 250 €**, plus public credit for all four and a CVE for #1.

- **#1 drops Critical → High** only for lack of a Critical tier; the sandbox
  rule does not apply (a timeout/memory cap does not stop `execSync`). It is the
  most severe issue in the batch and tops the available scale.
- **#3 stays High**: default-config SQL read; exfiltration is not sandbox-
  contained.
- **#2 is Medium**: real injection, but gated on *both* the AST-API route *and*
  the deprecated non-default `scs=off`; inert under default Postgres. That double
  precondition is what holds it below the default-config #3.
- **#4 is Low**: pure allocation amplification the report itself notes hits
  statement timeouts; a sandbox contains it. Kept *in scope* because it is a
  stdlib primitive we failed to bound (the carve-out the policy rewards, not a
  "legal expression that is simply expensive"), but scored at the floor. The
  grid prices Medium/High only, so Low is credit + fix acknowledgment.

## Two things this surfaced for the policy

- **Add a Critical tier.** Under today's scale a host-RCE sandbox escape (#1)
  cannot be ranked above a config-gated or default-config SQL read. A Critical
  band lets capability escapes — the one thing *only* Elo's sandbox defends —
  outrank injections a correct deployment also defends.
- **Reconcile the two allocation clauses.** "Disproportionate allocation via a
  primitive we failed to bound (Medium/High)" vs "resource exhaustion a
  memory-plus-timeout sandbox would contain (out of scope)" are in tension. The
  resolution used here: primitive-bound gaps like #4 are **Low / credit**.
  Worth writing onto the page so the next #4-shaped report triages the same way.

## Blast radius

Replace and patch emission changed, so five fixtures regenerated (replace /
patch / pipe / precedence-dynamic / concatenated-receiver); the diff showed only
those two primitives moving, no third surprise. The two JS acceptance failures
(`startOf` timezone) pre-date the branch and fail identically on `main`.

## Follow-on work in the same session

Sweeping the compiler for the same bug *classes* turned up two maintainer-side
siblings, fixed on the same branch (see the audit's own write-up): a Ruby
`guardType` AST-API injection (would rate High, like #3) and unbounded SQL
`repeat`/`pad` (would rate Low, like #4). Neither was reported by squ11z1, so
both are **outside this bounty** — noted only to show the rubric lands
consistently. The dependency upgrade in the same session also cleared the two
critical `@enspirit/elo` lockfile advisories Aikido had flagged on the website.
