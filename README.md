# What is Klang?

A small expression language that compiles/translates to Ruby, Javascript and PostgreSQL.

## Aim

Having small purely functional expressions expressed in a user-friendly language,
that can be evaluated in different environments.

## Current Features

- **Arithmetic expressions** with scalars and variables
- **Infix notation** (standard mathematical notation)
- **Operators**: `+`, `-`, `*`, `/`, `%`, `^` (power)
- **Unary operators**: `-`, `+`
- **Parentheses** for grouping
- **Multi-target compilation**:
  - Ruby (using `**` for exponentiation)
  - JavaScript (using `Math.pow()` for exponentiation)
  - PostgreSQL (using `POWER()` for exponentiation)

## Installation

```bash
npm install
npm run build
```

## Usage

### Parsing and Compiling

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
node dist/examples/basic.js
```

## Grammar

```
expr    -> term (('+' | '-') term)*
term    -> factor (('*' | '/' | '%') factor)*
factor  -> power
power   -> unary ('^' unary)*
unary   -> ('+' | '-') unary | primary
primary -> NUMBER | IDENTIFIER | '(' expr ')'
```

## Project Structure

```
klang/
├── src/
│   ├── ast.ts              # AST node type definitions
│   ├── parser.ts           # Lexer and parser for infix expressions
│   ├── index.ts            # Main exports
│   └── compilers/
│       ├── ruby.ts         # Ruby code generator
│       ├── javascript.ts   # JavaScript code generator
│       └── sql.ts          # PostgreSQL code generator
├── examples/
│   └── basic.ts            # Usage examples
├── package.json
├── tsconfig.json
└── README.md
```

## Roadmap

Future enhancements could include:
- Comparison operators (`<`, `>`, `<=`, `>=`, `==`, `!=`)
- Boolean operators (`&&`, `||`, `!`)
- Conditional expressions (`if-then-else`)
- Function calls
- Type system
- Optimizer for constant folding

