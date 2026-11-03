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
