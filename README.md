# What is Klang?

A small expression language that compiles/translates to Ruby, Javascript and PostgreSQL.

## Aim

Having small purely functional expressions expressed in a user-friendly language,
that can be evaluated in different environments.

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

```bash
npm test
```

Klang uses a comprehensive test suite that verifies:
- **Unit tests**: Parser, AST, and compiler components
- **Integration tests**: End-to-end compilation output
- **Acceptance tests**: Compiled code execution in real runtimes (Ruby, Node.js, PostgreSQL)

**Current status**: 190 tests passing

For detailed testing documentation and development guidelines, see [CLAUDE.md](CLAUDE.md).

## Usage

### Parsing and Compiling Arithmetic Expressions

```typescript
import { parse, compileToRuby, compileToJavaScript, compileToSQL } from './src';

// Parse an expression
const ast = parse('x + y * 2');

// Compile to different targets
console.log(compileToRuby(ast));       // => x + y * 2
console.log(compileToJavaScript(ast)); // => x + y * 2
console.log(compileToSQL(ast));        // => x + y * 2

// Power operator example
const powerExpr = parse('2 ^ 3 + 1');
console.log(compileToRuby(powerExpr));       // => 2 ** 3 + 1
console.log(compileToJavaScript(powerExpr)); // => Math.pow(2, 3) + 1
console.log(compileToSQL(powerExpr));        // => POWER(2, 3) + 1
```

### Boolean Expressions

```typescript
// Comparison operators
const ast1 = parse('x > 10 && x < 100');
console.log(compileToRuby(ast1));       // => x > 10 && x < 100
console.log(compileToJavaScript(ast1)); // => x > 10 && x < 100
console.log(compileToSQL(ast1));        // => x > 10 AND x < 100

// Logical operators with boolean literals
const ast2 = parse('active == true || admin == true');
console.log(compileToRuby(ast2));       // => active == true || admin == true
console.log(compileToJavaScript(ast2)); // => active == true || admin == true
console.log(compileToSQL(ast2));        // => active == TRUE OR admin == TRUE

// Negation
const ast3 = parse('!disabled');
console.log(compileToRuby(ast3));       // => !disabled
console.log(compileToJavaScript(ast3)); // => !disabled
console.log(compileToSQL(ast3));        // => NOT disabled
```

### Temporal Expressions

```typescript
// Date literals
const date = parse('D2024-01-15');
console.log(compileToRuby(date));       // => Date.parse('2024-01-15')
console.log(compileToJavaScript(date)); // => new Date('2024-01-15')
console.log(compileToSQL(date));        // => DATE '2024-01-15'

// DateTime literals
const datetime = parse('D2024-01-15T10:30:00Z');
console.log(compileToRuby(datetime));       // => DateTime.parse('2024-01-15T10:30:00Z')
console.log(compileToJavaScript(datetime)); // => new Date('2024-01-15T10:30:00Z')
console.log(compileToSQL(datetime));        // => TIMESTAMP '2024-01-15 10:30:00'

// Duration literals (ISO8601)
const duration = parse('P1D');          // 1 day
const duration2 = parse('PT1H30M');     // 1 hour 30 minutes
const duration3 = parse('P1Y2M3D');     // 1 year, 2 months, 3 days
console.log(compileToRuby(duration));       // => ActiveSupport::Duration.parse('P1D')
console.log(compileToJavaScript(duration)); // => Duration.parse('P1D')
console.log(compileToSQL(duration));        // => INTERVAL 'P1D'

// Date arithmetic
const futureDate = parse('D2024-01-15 + P1D');
console.log(compileToRuby(futureDate));
// => Date.parse('2024-01-15') + ActiveSupport::Duration.parse('P1D')
console.log(compileToSQL(futureDate));
// => DATE '2024-01-15' + INTERVAL 'P1D'

// Date comparisons
const dateCheck = parse('D2024-01-15 < D2024-12-31');
console.log(compileToSQL(dateCheck));
// => DATE '2024-01-15' < DATE '2024-12-31'

// Complex temporal expressions
const ageCheck = parse('current_date - birth_date > P18Y');
const rangeCheck = parse('event_date >= D2024-01-01 && event_date <= D2024-01-01 + P30D');
```

### Programmatic AST Construction

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

### Example Expressions

**Arithmetic:**
- `2 + 3 * 4` - Order of operations
- `(price * quantity) - discount` - Business calculations
- `2 ^ 3 + 1` - Power operations

**Boolean:**
- `x > 10 && x < 100` - Range checks
- `status == 1 || status == 2` - Multiple conditions
- `!active` - Negation

**Temporal:**
- `D2024-01-15 + P1D` - Add 1 day to a date
- `D2024-12-31 - D2024-01-01` - Calculate days between dates
- `current_date - birth_date > P18Y` - Age validation
- `event_date >= D2024-01-01 && event_date <= D2024-01-01 + P30D` - Date range check
- `D2024-01-15T09:00:00Z + PT2H30M` - Add duration to datetime

## Grammar

```
expr       -> logical_or
logical_or -> logical_and ('||' logical_and)*
logical_and -> equality ('&&' equality)*
equality   -> comparison (('==' | '!=') comparison)*
comparison -> addition (('<' | '>' | '<=' | '>=') addition)*
addition   -> term (('+' | '-') term)*
term       -> factor (('*' | '/' | '%') factor)*
factor     -> power
power      -> unary ('^' unary)*
unary      -> ('!' | '-' | '+') unary | primary
primary    -> NUMBER | BOOLEAN | DATE | DATETIME | DURATION | IDENTIFIER | '(' expr ')'
```

**Temporal Literal Syntax:**
- `DATE` → `DYYYY-MM-DD` (e.g., `D2024-01-15`)
- `DATETIME` → `DISO8601` (e.g., `D2024-01-15T10:30:00Z`)
- `DURATION` → ISO8601 duration (e.g., `P1D`, `PT1H30M`, `P1Y2M3D`)
  - Years: `Y`, Months: `M`, Weeks: `W`, Days: `D`
  - Time separator: `T`
  - Hours: `H`, Minutes: `M`, Seconds: `S`
  - Examples: `P1D` (1 day), `PT2H30M` (2.5 hours), `P1Y6M` (1.5 years)

## Project Structure

```
klang/
├── src/              # Compiler source code
│   ├── parser.ts     # Lexer and parser
│   ├── ast.ts        # AST definitions
│   ├── compilers/    # Code generators (Ruby, JavaScript, SQL)
│   └── preludes/     # Runtime support libraries
├── test/             # Test suite
│   ├── fixtures/     # Test cases
│   ├── unit/         # Component tests
│   ├── integration/  # Compilation tests
│   └── acceptance/   # Runtime execution tests
├── examples/         # Usage examples
├── bin/kc            # CLI tool
└── CLAUDE.md         # Developer guide
```

For detailed architecture documentation, see [CLAUDE.md](CLAUDE.md).

## Roadmap

Future enhancements could include:
- **String literals and operations**: String concatenation, pattern matching, substring operations
- **Conditional expressions**: Ternary operator (`condition ? then : else`) or if-then-else syntax
- **Function calls**: Built-in and user-defined functions (e.g., `abs(x)`, `round(price, 2)`)
- **Array/list literals**: Support for arrays and collection operations
- **Null handling**: Null literals and null-safe operations
- **Type system**: Optional static type checking and type inference
- **Optimization**: Constant folding, expression simplification, dead code elimination
- **Additional targets**: Python, Go, Rust code generation
- **Timezone support**: Explicit timezone handling for datetime operations

## Contributing

Klang follows a strict test-driven development methodology to ensure semantic equivalence across all three target languages (Ruby, JavaScript, SQL).

**For developers and AI assistants**: See [CLAUDE.md](CLAUDE.md) for:
- Test-driven development workflow
- Three-stage test methodology (unit → integration → acceptance)
- How to add new features and operators
- Architecture documentation
- Troubleshooting guide

