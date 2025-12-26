# What is Elo ?

[![CI](https://github.com/enspirit/elo/actions/workflows/ci.yml/badge.svg)](https://github.com/enspirit/elo/actions/workflows/ci.yml)

A simple, well-designed, portable and safe data expression language that
compiles/translates to Ruby, Javascript and PostgreSQL.

**[Try Elo online](https://elo-lang.org/)** - Interactive playground and documentation

## Why ?

No-Code tools like Klaro Cards generally require an expression language for user
to manipulate data easily. This language must be :

- simple, because No-Code tools are used by non-tech people
- portable, because they are implemented in various frontend/backend/db technologies
- safe, because end-users writing code yield serious security issues
- well-designed, because there are too many ill-designed programming languages already

See also the Related work section below.

## Current Features

- **Arithmetic expressions** with scalars and variables
- **Boolean expressions** with comparison and logical operators
- **Temporal types** with dates, datetimes, and ISO8601 durations
- **Infix notation** (standard mathematical notation)
- **Arithmetic operators**: `+`, `-`, `*`, `/`, `%`, `^` (power)
- **Comparison operators**: `<`, `>`, `<=`, `>=`, `==`, `!=`
- **Logical operators**: `&&`, `||`, `!`
- **Unary operators**: `-`, `+`, `!`
- **Literals**:
  - Numbers: `42`, `3.14`
  - Booleans: `true`, `false`
  - Dates: `D2024-01-15`
  - DateTimes: `D2024-01-15T10:30:00Z`
  - Durations: `P1D`, `PT1H30M`, `P1Y2M3D` (ISO8601)
- **Parentheses** for grouping
- **Multi-target compilation**:
  - Ruby (using `**` for power, `&&`/`||`/`!` for boolean logic, `Date.parse()`, `DateTime.parse()`, `ActiveSupport::Duration.parse()`)
  - JavaScript (using `Math.pow()` for power, `&&`/`||`/`!` for boolean logic, `new Date()`, `Duration.parse()`)
  - PostgreSQL (using `POWER()` for power, `AND`/`OR`/`NOT` for boolean logic, `DATE`, `TIMESTAMP`, `INTERVAL` for temporals)

## Installation

```bash
npm install
npm run build
```

## Testing

Elo uses a comprehensive test suite that verifies:
- **Unit tests**: Parser, AST, and compiler components
- **Integration tests**: End-to-end compilation output
- **Acceptance tests**: Compiled code execution in real runtimes (Ruby, Node.js, PostgreSQL)

```bash
npm run test:unit
npm run test:integration
npm run test:acceptance
```

## Using Elo in JavaScript/TypeScript

The simplest way to use Elo is with the `compile()` function, which creates a callable JavaScript function from an Elo lambda expression:

```typescript
import { compile } from '@enspirit/elo';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

// Configure dayjs with required plugins
dayjs.extend(duration);
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);

// Compile a lambda to a callable function
const double = compile<(x: number) => number>(
  'fn(x ~> x * 2)',
  { runtime: { dayjs } }
);
double(21); // => 42

// Temporal expressions work too
const inThisWeek = compile<(d: unknown) => boolean>(
  'fn(d ~> d in SOW ... EOW)',
  { runtime: { dayjs } }
);
inThisWeek(dayjs()); // => true or false
```

The `runtime` option injects dependencies (like `dayjs`) into the compiled function. This avoids global variables and keeps the compiled code portable.

## Lower-Level API

For more control, you can use the lower-level parsing and compilation functions:

```typescript
import { parse, compileToRuby, compileToJavaScript, compileToSQL } from '@enspirit/elo';

// Parse an expression
const ast = parse(`
  let
    x = TODAY,
    y = 3
  in
    assert(x + y * P1D == TODAY + P3D)
`);

// Compile to different targets
console.log(compileToRuby(ast));
console.log(compileToJavaScript(ast));
console.log(compileToSQL(ast));
```

## Programmatic AST Construction

```typescript
import { binary, variable, literal } from './src';

// Build: (price * quantity) - discount
const ast = binary(
  '-',
  binary('*', variable('price'), variable('quantity')),
  variable('discount')
);
```

## Examples

Run the examples:

```bash
npm run build
node dist/examples/basic.js     # Arithmetic expressions
node dist/examples/boolean.js   # Boolean expressions
node dist/examples/temporal.js  # Temporal expressions (dates, durations)
node dist/examples/demo.js      # Quick demo
```

## Project Structure

```
elo/
├── src/              # Compiler source code
│   ├── parser.ts     # Lexer and parser
│   ├── ast.ts        # AST definitions
│   ├── types.ts      # Type system
│   ├── ir.ts         # Intermediate representation
│   ├── transform.ts  # AST → IR transformation with type inference
│   ├── stdlib.ts     # Standard library abstraction
│   ├── compilers/    # Code generators (Ruby, JavaScript, SQL)
│   └── preludes/     # Runtime support libraries
├── test/             # Test suite
│   ├── fixtures/     # Test cases
│   ├── unit/         # Component tests
│   ├── integration/  # Compilation tests
│   └── acceptance/   # Runtime execution tests
├── examples/         # Usage examples
├── bin/eloc          # CLI tool
└── CLAUDE.md         # Developer guide
```

For detailed architecture documentation, see [CLAUDE.md](CLAUDE.md).

## Related work

Enspirit's previous research work includes a lot of places where such expressions
are used, calling for a shared solution for the future.

In many cases, observe that we require compiling expressions that amount to a
single function evaluating on a context object, sometimes a scalar (Finitio),
sometimes a current Tuple (Bmg), sometimes json data received from an API
(Webspicy), or a current Card (Klaro Cards, similar to Bmg's Tuple).

See https://elo-lang.org for more documentation.

### Finitio

The Finitio data validation language supports subtypes by constraints such as:

```finitio
PositiveInt = Int( i | i > 0 )
```

Currently, the constraint expression is written in the host language (js or ruby)
and would require a portable expression language to go further.

See https://finitio.io, https://github.com/enspirit/finitio-rb, https://github.com/enspirit/finitio.js

### Bmg

The Bmg relational algebra requires expressions for the `restrict` and `extend`
operators inspired by **Tutorial D**. We currently rely on ruby code in some cases,
but that prevents compiling relational expressions to SQL :

```ruby
r.restrict(->(t){ t[:budget] >= 120 })
r.extend(:upcased => ->(t) { t[:name].upcase })
```

See https://www.relational-algebra.dev/, https://github.com/enspirit/bmg

### Webspicy

The Webspicy test framework requires a better expression language for data assertions.
We currently rely on an hardcoded expression language that is very limited:

```
assert:
- isEmpty
- size(10)
```

See https://github.com/enspirit/webspicy

### Klaro Cards

The Klaro Cards No-Code tool uses various data expressions here and there :

- Date ranges for Date/time dimensions : `SOW ... SOW+P1W`
- Computed dimensions : `_.budget * 1.21`
- Summary functions : `min(_.budget)`

See https://klaro.cards

## Contributing

Elo follows a strict test-driven development methodology to ensure semantic equivalence across all three target languages (Ruby, JavaScript, SQL).

**For developers and AI assistants**: See [CLAUDE.md](CLAUDE.md) for:
- Test-driven development workflow
- Three-stage test methodology (unit → integration → acceptance)
- How to add new features and operators
- Architecture documentation
- Troubleshooting guide

