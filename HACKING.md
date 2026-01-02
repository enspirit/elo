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

## Project Structure

```
src/
  parser.ts      # Elo grammar and parser
  ast.ts         # AST types and factory
  types.ts       # Type system
  ir.ts          # Intermediate representation
  transform.ts   # AST to IR with type inference
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
