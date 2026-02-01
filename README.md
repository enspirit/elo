# What is Elo ?

[![CI](https://github.com/enspirit/elo/actions/workflows/ci.yml/badge.svg)](https://github.com/enspirit/elo/actions/workflows/ci.yml)

A simple, well-designed, portable and safe data expression language that
compiles to Ruby, JavaScript, Python and PostgreSQL.

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
- **Arithmetic operators**: `+`, `-`, `*`, `/`, `%`, `^` (power, plus string repeat and array concat)
- **Comparison operators**: `<`, `>`, `<=`, `>=`, `==`, `!=`
- **Logical operators**: `&&`, `||`, `!`
- **Unary operators**: `-`, `+`, `!`
- **Pipe operator**: `|>` for function chaining (Elixir-style), parentheses optional
- **Alternative operator**: `|` for fallback chains (returns first defined value)
- **Type selectors**: `Int()`, `Float()`, `Bool()`, `String()`, `Null()`, `Date()`, `Datetime()`, `Duration()`, `Interval()`, `Data()` for parsing and converting values
- **Type definitions**: Finitio-like schema validation with `let Person = { name: String, age: Int } in data |> Person`
- **Lambdas**: `fn(x ~> x * 2)` or `x ~> x * 2` (sugar) for anonymous functions
- **Guards**: `guard condition in body` for runtime validation with `check` for postconditions
- **Input variable**: `_` for accessing external data passed to expressions
- **Array iteration**: `map`, `filter`, `reduce`, `any`, `all` (JS/Ruby only)
- **Period boundaries**: `startOfDay`, `endOfDay`, `startOfWeek`, `endOfWeek`, `startOfMonth`, `endOfMonth`, `startOfQuarter`, `endOfQuarter`, `startOfYear`, `endOfYear`
- **Duration conversion**: `inYears`, `inQuarters`, `inMonths`, `inWeeks`, `inDays`, `inHours`, `inMinutes`, `inSeconds` for converting durations to float values (approximate for calendar units)
- **List functions**: `count`, `sum`, `sum(list, initial)`, `avg`, `min`, `max`, `reverse`, `join(list, separator)`, `split(string, separator)`
- **Literals**:
  - Numbers: `42`, `3.14`
  - Booleans: `true`, `false`
  - Strings: `'hello'`
  - Null: `null`
  - Dates: `D2024-01-15`
  - DateTimes: `D2024-01-15T10:30:00Z`
  - Durations: `P1D`, `PT1H30M`, `P1Y2M3D` (ISO8601)
  - Objects: `{name: 'Alice', age: 30}`
  - Arrays: `[1, 2, 3]`, `['a', 'b']`, `[1, 'mixed', true, null]`
  - DataPaths: `.x.y.z`, `.items.0.name` (for navigating data structures)
- **Data functions**: `fetch(data, .path)` for safe access, `fetch(data, {x: .a, y: .b})` and `fetch(data, [.a, .b])` for multi-path extraction, `patch(data, .path, value)` for immutable updates, `merge(a, b)` and `deepMerge(a, b)` for merging objects
- **Parentheses** for grouping
- **Multi-target compilation**:
  - Ruby (using `**` for power, `&&`/`||`/`!` for boolean logic, `Date.parse()`, `DateTime.parse()`, `ActiveSupport::Duration.parse()`)
  - JavaScript (using `Math.pow()` for power, `&&`/`||`/`!` for boolean logic, `new Date()`, `Duration.parse()`)
  - Python (using `**` for power, `and`/`or`/`not` for boolean logic, `datetime` module)
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

## Command Line Interface

Elo provides two CLI tools:
- `eloc` - The compiler (for developers integrating Elo into their products)
- `elo` - The evaluator (for quickly running Elo expressions)

### Compiler (eloc)

The compiler translates Elo expressions to Ruby, JavaScript, or SQL:

```bash
# Compile expression to JavaScript (default)
./bin/eloc -e "2 + 3 * 4"

# Compile expression to Ruby
./bin/eloc -e "2 + 3 * 4" -t ruby

# Compile expression to Python
./bin/eloc -e "2 + 3 * 4" -t python

# Compile expression to SQL
./bin/eloc -e "2 + 3 * 4" -t sql

# Compile with prelude (includes required runtime libraries)
./bin/eloc -e "NOW + PT2H" -t ruby -p

# Output only the prelude (useful for bundling)
./bin/eloc --prelude-only -t js

# Compile from file (each line is compiled separately)
./bin/eloc input.elo -t ruby

# Compile to file
./bin/eloc -e "2 + 3" -t ruby -f output.rb

# Compile from stdin
echo "2 + 3 * 4" | ./bin/eloc -
cat input.elo | ./bin/eloc - -t ruby
```

Options:
- `-e, --expression <expr>` - Expression to compile
- `-t, --target <lang>` - Target language: `ruby`, `js` (default), `python`, `sql`
- `-p, --prelude` - Include necessary library imports/requires
- `--prelude-only` - Output only the prelude (no expression needed)
- `-f, --file <path>` - Output to file instead of stdout
- `-h, --help` - Show help message

### Evaluator (elo)

The evaluator compiles to JavaScript and immediately evaluates the expression:

```bash
# Evaluate a simple expression
./bin/elo -e "2 + 3 * 4"
# Outputs: 14

# Evaluate with input data (JSON)
./bin/elo -e "_.x + _.y" -d '{"x": 1, "y": 2}'
# Outputs: 3

# Evaluate with CSV input data
./bin/elo -e "map(_, fn(r ~> r.name))" -d @data.csv -f csv
# Outputs: ["Alice","Bob"]

# Evaluate with data from file (format auto-detected from extension)
./bin/elo -e "_.name" -d @data.json

# Output in different formats
./bin/elo -e "{a: 1, b: 2}" -o elo    # Elo code format
./bin/elo -e "[{name: 'Alice'}]" -o csv  # CSV format

# Evaluate from .elo file
./bin/elo expressions.elo

# Pipe data through stdin
echo '{"x": 10}' | ./bin/elo -e "_.x * 2" --stdin
# Outputs: 20
```

Options:
- `-e, --expression <expr>` - Expression to evaluate
- `-d, --data <data>` - Input data for `_` variable (or `@file` to read from file)
- `--stdin` - Read input data from stdin
- `-f, --input-format <fmt>` - Input data format: `json` (default) or `csv`
- `-o, --output-format <fmt>` - Output format: `json` (default), `elo`, or `csv`
- `-h, --help` - Show help message

## Using Elo in JavaScript/TypeScript

The simplest way to use Elo is with the `compile()` function, which creates a callable JavaScript function from an Elo expression:

```typescript
import { compile } from '@enspirit/elo';
import { DateTime, Duration, Interval } from 'luxon';

// Compile an expression to a callable function
// Every Elo expression takes _ (implicit input) as parameter
const addTen = compile<(x: number) => number>(
  '_ + 10',
  { runtime: { DateTime, Duration, Interval } }
);
addTen(5); // => 15

// Temporal expressions work too
const inThisWeek = compile<(d: unknown) => boolean>(
  '_ in SOW ... EOW',
  { runtime: { DateTime, Duration } }
);
inThisWeek(DateTime.now()); // => true or false
```

The `runtime` option injects dependencies (like `DateTime` and `Duration` from luxon) into the compiled function. This avoids global variables and keeps the compiled code portable.

## Data Format Adapters

The CLI and playground support multiple input/output formats (JSON, CSV). The format system is pluggable—you can provide custom adapters using libraries like PapaParse or SheetJS. See `src/formats.ts` for the `FormatAdapter` interface and built-in implementations.

## Lower-Level API

For more control, you can use the lower-level parsing and compilation functions:

```typescript
import { parse, compileToRuby, compileToJavaScript, compileToPython, compileToSQL } from '@enspirit/elo';

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
console.log(compileToPython(ast));
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
├── bin/eloc          # Compiler CLI
├── bin/elo           # Evaluator CLI
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

**Getting started**: See [HACKING.md](HACKING.md) for:
- Development environment setup (local or Docker)
- Running the test suite
- Project structure overview

**For developers and AI assistants**: See [CLAUDE.md](CLAUDE.md) for:
- Detailed development workflow
- How to add new features and operators
- Architecture documentation

