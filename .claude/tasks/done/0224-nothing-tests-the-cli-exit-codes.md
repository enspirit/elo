# Nothing tests the CLI exit codes, which are now promised

> Found while enforcing 0221, which published the promise.

## The promise

README.md, under "Versioning and the public interface", puts in the **public**
tier — breaking it requires a major release:

> The `elo` and `eloc` binaries: their options, and their exit codes (`0` when
> code was produced, non-zero when the compiler refused)

That sentence is new in 1.2.0 and nothing checks it. Scripts branch on exit
status, which is precisely why it was promised rather than left to the output
format, so it is the half of the CLI contract most worth pinning.

## What is known

Two paths were checked by hand while writing the 1.2.0 entry:

* `eloc -p -t sql` exits **1** — it refuses to emit a prelude it cannot
  prepend. It exited 0 in 1.1.1, printing a false comment.
* `eloc two-expressions.elo` exits **1** with a parse error and the `--lines`
  hint.

Every other path is unverified. The cases that matter:

* a successful compile to each of the four targets, from `-e`, from a file and
  from stdin — must be 0
* a parse error, an unknown function, a no-matching-signature refusal — non-zero
* `--typecheck` with diagnostics: **non-zero, and it still emits the code**,
  which is the documented behaviour and the one most likely to be got wrong by
  a future change
* `--optimize` refusing to annotate a program the checker reported on
* a missing input file, an unreadable one, an unknown `-t` target
* an import that cannot be resolved, a cycle, a module with no expression
* `elo` evaluating an expression that *raises* — a guard or check failing is a
  runtime failure, not a compiler refusal, and the two should not share an exit
  code without that being a decision
* `--prelude-only` for each target, including sql, which exits 0

## Tests

A table-driven integration test: argv in, expected exit code out, one row per
case above. `test/integration/` already drives both binaries, so there is a
place for it.

Worth deciding while writing it: whether non-zero should be *differentiated* —
one code for a compiler refusal, another for a runtime failure, another for a
usage error. Today everything is presumably 1. Differentiating is a feature and
can wait; what cannot wait is that the promise has no test.

## Implemented

`test/integration/cli-exit-codes.integration.test.ts`, table-driven as the task
asked: 46 assertions over 17 success paths and 19 refusals, plus the checker
family and the `elo` evaluator. A path that is not a row has no promise behind
it, and adding a row is how a new option gets one.

**Every path already conformed.** Nothing was broken — 0 on every success path,
non-zero on every refusal — so this is coverage of a promise that happened to
be kept, not a fix. Worth saying plainly, because the measurement was the point
of the task.

The paths now pinned: the four targets from `-e`, from a file, from stdin and
to a file; `--lines`; `--prelude-only` for all four including sql; the whole
typecheck family (`--typecheck`, `--strict`, `--input-type`, `--optimize`) both
ways; parse errors, unknown functions, no-matching-signature,
operator-type-mismatch, duplicate bindings, lists SQL cannot represent, lambdas
on SQL; a missing file, two expressions without `--lines`, an unknown target,
`-p -t sql`, an unparseable `--input-type`; an import of a missing module, a
cycle, and a value from a module that has none; and on `elo`, a failing assert,
guard and schema.

### The row most worth having

`--typecheck` is the one place where non-zero does **not** mean "no output", so
it gets four assertions of its own: it exits non-zero, it still writes the code
to stdout, the diagnostic goes to stderr and not stdout, and the emission is
**byte-identical to the run without the flag**. That last one is the documented
contract that lets a host compile and report in one pass, and it is the thing a
later change is most likely to break silently.

### Seen red by mutation, three ways

| Mutation in `src/eloc.ts` | Rows that failed |
| --- | --- |
| `if (typeErrorsFound)` no longer exits 1 | 7 |
| output withheld when diagnostics were found | 3, including the byte-identical one |
| a compilation error exits 0 instead of 1 | 8 |

`src/eloc.ts` restored byte-for-byte after each.

### Left open, deliberately

Non-zero is **not differentiated**: a compiler refusal, a runtime failure and a
usage error all exit 1. The test pins that the three are distinguished from
success, which is what the README promises, and says in its header that telling
them apart would be a feature rather than a fix. Differentiating would be worth
doing if a host ever needs to tell "this formula is invalid" from "this formula
is valid and raised on this input" — which is exactly the distinction the
failure `kind` already gives a host that embeds the compiler rather than
shelling out.

### Found alongside, filed as 0225

`elo -e "1 / 0"` prints `null` and exits 0 — a successful evaluation of
something with no value. `Infinity` is not representable in JSON. Behind it is
a real divergence that no fixture asserts: `1 / 0` is `Infinity` on JavaScript
and Ruby and raises on Python and PostgreSQL, and `1 % 0` is `NaN` on
JavaScript and raises on the other three. Under the rule the README now states
that is unspecified rather than broken, and 0225 is what specifies it. The
exit-code test asserts only that `elo -e "null"` is a success, since `null`
genuinely is a value, with a comment pointing at 0225 for the case that is not.
