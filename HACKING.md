# Hacking on Elo

This guide explains how to set up a development environment to contribute to Elo.

## Prerequisites

### Local Development

To run all tests (including acceptance tests), you need:

- **Node.js** (v22+): The compiler is written in TypeScript
- **Ruby** (3.x): For Ruby acceptance tests
- **PostgreSQL** (14+): For SQL acceptance tests

### Docker Development

Alternatively, use the Docker setup in `.claude/safe-setup/` which provides all dependencies pre-configured. See `.claude/safe-setup/HACKING.md` for details.

## Getting Started

```bash
# Clone the repository
git clone https://github.com/enspirit/elo-lang.git
cd elo-lang

# Install dependencies
npm install

# Run the test suite
npm test
```

## Test-Driven Development

Elo is developed using TDD. The test suite has three levels:

```bash
# Unit tests - core functions and utilities
npm run test:unit

# Integration tests - compiler output against fixtures
npm run test:integration

# Acceptance tests - actual execution in Ruby, Node, PostgreSQL
npm run test:acceptance

# Run all tests
npm test
```

All tests must pass before committing.

### Set TZ when you run the acceptance suite

CI runs in **UTC**, and two fixtures only hold there:
`reference/dynamic-ambiguous-dispatch` and
`stdlib/datetime/temporal-startof-endof` parse an instant written `Z` and ask
for the start of its day, which is local midnight. In a zone with an offset
they fail; in one with a DST transition, `payment-due-date` fails too, on
JavaScript alone.

```bash
TZ=UTC npm test              # what CI does
TZ=America/Los_Angeles npm test   # what a timezone bug looks like
```

Neither is your change breaking: the second command is the reproduction for
`.claude/tasks/todo/0240`, which is the open write-up of both. Run the suite
under UTC, and run it under a transitioning zone when you touch anything
temporal.

### Two suites outside `npm test`

Both need something `npm test` should not assume, and both are expected to be
green:

```bash
# The formula service, specified as a black box. Needs Ruby gems, which it
# installs from its own Gemfile, and boots a service of its own.
npm run test:webspicy

# The Node resource sandbox. Needs nothing, takes five seconds.
node contrib/sandboxes/node/smoke-test.js
```

Run the first when you change `contrib/formula-service`, the second when you
change `contrib/sandboxes` or the JavaScript emission. See
[`contrib/formula-service/README.md`](contrib/formula-service/README.md) for
what the service is and how to drive it by hand.

## Project Structure

```
src/
  parser.ts      # Elo grammar and parser
  ast.ts         # AST types and factory
  types.ts       # Type system
  ir.ts          # Intermediate representation
  transform.ts   # AST to IR with type inference
  modules.ts     # Imports: a header becomes type defs and let bindings
  node-loader.ts # Finding and reading modules on a filesystem
  stdlib.ts      # Standard library abstraction
  compilers/     # Target language code generators
    javascript.ts
    ruby.ts
    sql.ts
  cli.ts         # CLI implementation

test/
  unit/          # Unit tests
  integration/   # Compiler output tests
  acceptance/    # Cross-runtime execution tests
  fixtures/      # Test fixtures (.elo files)

contrib/
  formula-service/ # A REST API over a catalogue of formula bundles
    webspicy/      # Its black-box specification: npm run test:webspicy
    formulas/      # The catalogue: one directory per formula, holding
                   # types.elo (Input and Output), formula.elo, fields.elo
                   # (the form), cases.elo and bundle.json. The format is
                   # formulas/BUNDLE.md, read by src/bundle.ts, served by
                   # src/service.ts, and run by
                   # test/acceptance/test-formulas.sh
  sandboxes/       # Reference wrappers: a time and a memory cap per target

web/             # Try Elo website (Astro)
```

## Adding Features

When adding a new language construct or stdlib function:

1. Add parser support with unit tests
2. Update IR if needed
3. Add acceptance test fixtures (`.elo` files with assertions)
4. Implement in all three compilers
5. Document in README and website (Learn, Reference, Stdlib sections)
6. Run all tests

See [CLAUDE.md](CLAUDE.md) for detailed development workflow.

## CLI Tools

```bash
# Compile an expression
./bin/eloc "1 + 2" --target js

# Evaluate an expression
./bin/eloc "1 + 2" --target js --run

# Use the elo evaluator
echo "1 + 2" | ./bin/elo
```

## Website Development

```bash
cd web
npm install
npm run dev    # Start dev server at localhost:4321
npm run build  # Build for production
```

## The formula service

A REST API over the catalogue of formula bundles, and the easiest way to see a
whole Elo program doing something end to end:

```bash
npm run build
contrib/formula-service/bin/elo-formula-service
```

Then <http://localhost:8080/> in a browser: the catalogue, a page and a working
form per formula, and an answer that is a URL. Its own README has the `curl`
recipes, including how to make the service hand you the compiled Ruby of a
formula so you can run it yourself —
[`contrib/formula-service/README.md`](contrib/formula-service/README.md).

It is also where a *bundle* is checked:

```bash
contrib/formula-service/bin/elo-formulas              # every bundle, with its case count
contrib/formula-service/bin/elo-formulas order-lines  # one: doc, form, cases with results
contrib/formula-service/bin/elo-formulas --fields iban  # refresh fields.elo from Input
```
