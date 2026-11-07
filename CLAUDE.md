# Claude Development Guide for Elo

This document provides instructions for AI assistants (like Claude) working on the Elo compiler project.

## Project Overview

Elo is a small expression language that compiles to three target languages:
- **Ruby**: Server-side scripting
- **JavaScript**: Client-side execution
- **PostgreSQL SQL**: Database queries

The compiler translates Elo expressions into semantically equivalent code in each target language.

## Design principles

Following the vision, design and implementation choices MUST target a language that stays simple, well-designed,
portable and safe, in that order. We SHOULD always restrict Elo's powerfullness if a wanted feature leads to a
violation of those principles.

**CRITICAL** when adding a language construct or stdlib function, you MUST also document it in README (no details)
and on website (with example).

## Architecture

Elo currently has the following components :

* A parser (`src/parser.ts`)
* AST types and factory (`src/ast.ts`)
* Type system (`src/types.ts`)
* Intermediate Representation with type inference (`src/ir.ts`, `src/transform.ts`)
* Import resolution, by inlining (`src/modules.ts`, filesystem part in `src/node-loader.ts`)
* Standard library abstraction for type-based dispatch (`src/stdlib.ts`)
* One compiler per target language (`src/compilers/*.ts`)
* A binary command (`bin/eloc` and `src/cli.ts`)
* A try-elo website to demonstrate Elo (`web/`)

### Compilation Pipeline

1. **Parse**: Source → AST (`parser.ts`)
2. **Transform**: AST → Typed IR (`transform.ts`) - infers types and rewrites operators as function calls
3. **Emit**: IR → Target code (`compilers/*.ts`) - uses `StdLib` for type-based dispatch

## Security invariants

Elo's own semantics are safe. Every security bug so far — twelve of them, see
`.claude/tasks/done/0241`, `0242`, `0243` — came from the seam where Elo's
semantics are delegated to a target that has **more** semantics than Elo does.
Not one was a missing idea: in every case the correct code already existed
elsewhere in this repository and one path did not use it.

So these are not "think about security" reminders. They are keyed to the moment
you are writing the code, because the person who opens a door is never the
person reading a section called security.

**When you add or touch an emitter that embeds a value in target syntax**
(a literal, a key, a label, a regex, an identifier):

* Use the target's escaper. **Never `JSON.stringify` for Ruby** — a Ruby
  double-quoted string interpolates `#{...}`, `#@ivar`, `#@@cvar` and `#$gvar`,
  and `JSON.stringify` does not escape `#`. Use `escapeRubyDQ`. For SQL use
  `sqlStringConstant` (the quote *and* the backslash), never a hand-written
  `'${...}'`. For an identifier position use `assertSafeIdentifier` — SQL has no
  identifier escaper, only the whitelist.
* The threat model covers values arriving through the **compiler AST API**, not
  only through the parser. "The lexer cannot produce that character" is not a
  defence; it is a reason the bug is quiet.
* A JS regex literal is closed by U+2028/U+2029 as well as by `/`.

**When you add a stdlib binding**: register the `any` signature too, and make
the two paths agree.

* A native operator on an `any` operand reaches overloads Elo never asked for:
  Ruby/Python `String * Int` repeats unbounded, `String % x` is `sprintf`,
  `Int ** Int` is an exact bignum. If a bound lives in a prelude helper, **every**
  path must call it — typed, dynamic, and all four targets.
* A native accessor on an `any` operand reaches the host object model: the JS
  prototype chain (`constructor`, `__proto__`), Python dunders. Index through
  the guard helper, not `x[k]`. The rule, measured over the whole emitted
  corpus and true today: **emitted JavaScript contains no computed member
  access outside a prelude helper, except with a numeric-literal index.** If
  your emitter would break that, it is the bug, not the exception.
* Assert both paths, as "Testing the dynamic dispatch path" below requires.

**When the checker's type is what makes an emission safe**: it is not enough.
A declared `--input-type` is a promise, not a runtime check — `_.i` reads the
raw value uncoerced — so under `--optimize` an attacker can hand a program a
value its declared type forbids. A bare operation is safe only on a
**compile-time literal**, never on a runtime-supplied value of a declared type.

**When you add a recursive walk over the AST or IR in `src/`**: make it
iterative or depth-bounded. The per-node depth guard (100) does not protect a
walk launched from the outermost node over the whole structure, and a stack
overflow in the compiler is a compile-host DoS that the security page promises
cannot happen.

**Red-first applies, harder.** A security fix needs the assertion seen red on
every affected target, and which targets were green matters: a bug present on
one target and absent on another *is* the finding — it means the emissions have
diverged. Verifying by hand in a scratch script and moving on is how it comes
back.

### The emitted-grammar gate

**CRITICAL** the shape of the emitted code is enforced by the build, not by
review. Elo's output is a tiny sub-grammar of each target, written down in:

* `test/support/emitted-js-grammar.ts` — the rules, the two allowlists
  (`ALLOWED_GLOBALS`, `ALLOWED_PROPERTIES`) and the index predicate
* `test/unit/emitted-grammar.unit.test.ts` — every `.expected.js`, plus the
  gate's own tests
* `test/integration/emitted-grammar.integration.test.ts` — every fixture line
  in all four compile modes, **including `--optimize`**, which selects
  different emitters
* `test/acceptance/gate-ruby.rb` (Ripper) and `gate-python.py` (`ast`), run by
  `gate-grammar.sh` from `test-all.sh`, in both the plain and `ELO_OPTIMIZE`
  passes

All three targets are gated; SQL is not, for want of a parser in reach.

If your change makes one of these fail, the emitter is the suspect, not the
gate. The allowlists are lists someone edits **on purpose**, like
`public-surface.unit.test.ts`: adding a name is a decision about what the
emitted language may reach, and the failure is the review. Do not widen one to
make a test pass without saying why in the same commit.

**The gates exempt the prelude helpers**, because helpers are where the
guarded reads and the `defineProperty` writes live. That exemption is the
harness's biggest blind spot — six of the security issues fixed since 1.0 are
inside one — so when you add or change a helper in `src/runtime.ts`, audit it
by hand: a computed write (`o[k] = v`) must keep `__proto__` a data key, and a
computed read must be own-property only. `.claude/tasks/done/0246` is what
that audit found the one time it was run.

The eight properties on `web/src/pages/security.astro` are the specification.
`.claude/tasks/todo/0244-the-matrix-nobody-enumerates.md` is the plan for making
the rest of them machine-checked.

## Test-Driven Development

Elo is developped in TDD. We have three levels of testing :

* `npm run test:unit` : checks the behavior of core and utility functions
* `npm run test:integration` : checks expected compilation output from sources
* `npm run test:acceptance` : checks expected semantics against `ruby`, `node` and `psql`

**CRITICAL** : the three levels of tests MUST be maintained ; all tests MUST PASS at all times.

The tests are organized as follows :

* `test/unit/**/*.ts` are unit tests without dependencies
* `test/fixtures/*` are elo expression files and their expected compilation in the target languages
* `test/integration/**/*.ts` check the compiler and cli, using fixtures
* `test/acceptance/**/*.ts` check the actual execution of generated code, using fixtures

**CRITICAL** when adding acceptance tests, every line of .elo files MUST have be an assert for
testing to be effective.

A fixture is therefore compiled with `eloc --lines`, which reads one expression per line so that
one line of source gives one line of emitted code. That is a **test convention only**: an ordinary
`.elo` file is one program — optional imports, an optional type prelude, then one expression whose
newlines mean nothing. Do not write a multi-line expression in a fixture; put it in an integration
test instead.

A `.elo` file under a `modules/` directory is a module a fixture imports, not a fixture: the
corpus-wide rules (an assert on every line, an expected file per target) are not about it, and its
code is covered inlined into the fixture that imports it.

### Red first

**CRITICAL** : for bug fixes AND for features, the failing test comes FIRST. Write it,
run it, see it fail, and only then write the code that turns it green.

* The test that matters is the **acceptance** one : a `.elo` assertion that executes on
  every target. Unit and integration tests pin the *shape* of the output ; only
  acceptance tests prove the output is *right*.
* **Regenerating fixtures is not a test.** `./scripts/regenerate-fixtures.sh` records
  whatever the compiler currently emits, so a `.expected.*` file can never fail because
  the emission is wrong. It is a snapshot, not an assertion. A fix whose only new
  "coverage" is regenerated fixtures has no coverage at all.
* **Never trust a test that was not seen red.** If the fix landed first, revert it and
  watch the test fail — `git stash push <file>`, or
  `git checkout <commit-before> -- <file>` when the fix is already committed. Report how
  many assertions were red, per target.
* A bug discovered *while* fixing another one gets its own assertion too. Verifying it by
  hand in a scratch script and moving on is how it comes back.

### Testing the dynamic dispatch path

Many Elo defects live where operand types are not statically known, because the compilers
emit different code there. Lambda parameters are typed `any`, which reaches that path
without needing `_` (fixtures run with null input) :

```
assert((let f = fn( x, y ~> x - y ) in f(3, 1)) == 2)   # dynamic : emits k_sub / kSub
assert(3 - 1 == 2)                                      # typed   : emits a bare `-`
```

**CRITICAL** : assert BOTH. The two must agree, and a divergence between them is exactly
the bug class this catches — see `test/fixtures/reference/dynamic-temporal-dispatch.elo`
and `reference/precedence-dynamic.elo`.

### Generating expected fixture files

**CRITICAL**: NEVER generate `.expected.*` files by hand or via `eloc` directly. Always use:

```
./scripts/regenerate-fixtures.sh [fixture-name]   # Regenerate specific fixture
./scripts/regenerate-fixtures.sh                   # Regenerate all fixtures
./scripts/regenerate-fixtures.sh -t js,python sum  # Specific targets only
```

The script builds the compiler, finds `.elo` files recursively under `test/fixtures/`,
and generates matching `.expected.{js,ruby,sql,py}` files with correct flags (`--execute`
for JS, Ruby, and Python). It only regenerates targets for which an expected file already
exists, unless `-t` is used to force specific targets.

## Tasks & agents

The list of tasks can be found in `.claude/tasks/todo` and `.claude/tasks/done`.
Done tasks provide history of my prompts. Todo tasks are the next envisionned
steps.

**CRITICAL**: You can always look the vision ahead in written todo tasks, but we
NEVER implement anything else that the very next step (first todo tasks, by
alphabetic order). Other tasks are informative and may help making future-proof
design decisions. If it leads to unnecessary complexity, we just forget about
them and act as if they were not written at all.

When a tasks involves enhancing the Elo language (typically adding a new construct),
a typical list of things to do is :

- Add acceptance tests (fixtures) that assert the expected behavior, and SEE THEM FAIL
  on every target before writing any implementation
- Add the construct in parser and add unit tests for it
- Adapt the intermediary representation IR if needed, add unit tests if needed
- Extend the compilers for the new construct, under acceptance tests
- Document in README then in Learn, Reference, and Stdlib sections of the website.
  Think about the relevant sections to adapt, to avoid end-user documentation bloat.
- Re-run all the tests, since some consistency tests exist that check the documentation.
- Commit and mark the task done.

When a task is a **bug fix**, the list is :

- Reproduce the bug as a `.elo` assertion in `test/fixtures/`, and SEE IT FAIL on every
  affected target. Say which targets fail and which do not — a bug present on one target
  and absent on another usually means the two emissions have diverged
- Fix it, then watch the same assertion turn green
- Regenerate the fixtures if the emission changed, and read the diff : it shows the
  blast radius of the fix, and an unexpected line in it is a second bug
- Re-run the three levels
- Document it only if it changes documented behaviour
- Commit and mark the task done

**IMPORTANT** If you block on something and are in autonomous mode, adapt the
task with your analysis and questions, move it to `analyzed` and move to the
next task.

**CRITICAL** Commit everytime you have something stable. You should end up having
ONE commit per task. Use `commit --amend` if needed. NEVER have two different tasks
commited together.
