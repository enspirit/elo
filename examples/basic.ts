import { parse, compileToJavaScript, binary, variable } from "../src";

console.log("=== Klang Examples ===\n");

// Example 1: Simple arithmetic with literals
console.log("Example 1: Simple arithmetic");
const expr1 = "2 + 3 * 4";
const ast1 = parse(expr1);
console.log(`Expression: ${expr1}`);
console.log(`JavaScript: ${compileToJavaScript(ast1)}`);
console.log();

// Example 2: Expression with variables
console.log("Example 2: Variables");
const expr2 = "x + y * 2";
const ast2 = parse(expr2);
console.log(`Expression: ${expr2}`);
console.log(`JavaScript: ${compileToJavaScript(ast2)}`);
console.log();

// Example 3: Power operator
console.log("Example 3: Power operator");
const expr3 = "2 ^ 3 + 1";
const ast3 = parse(expr3);
console.log(`Expression: ${expr3}`);
console.log(`JavaScript: ${compileToJavaScript(ast3)}`);
console.log();

// Example 4: Complex expression
console.log("Example 4: Complex expression");
const expr4 = "(x + 5) * (y - 3) / 2";
const ast4 = parse(expr4);
console.log(`Expression: ${expr4}`);
console.log(`JavaScript: ${compileToJavaScript(ast4)}`);
console.log();

// Example 5: Unary operators
console.log("Example 5: Unary operators");
const expr5 = "-x + 10";
const ast5 = parse(expr5);
console.log(`Expression: ${expr5}`);
console.log(`JavaScript: ${compileToJavaScript(ast5)}`);
console.log();

// Example 6: Building AST programmatically
console.log("Example 6: Programmatic AST construction");
// (price * quantity) - discount
const ast6 = binary(
  "-",
  binary("*", variable("price"), variable("quantity")),
  variable("discount"),
);
console.log("Expression: (price * quantity) - discount");
console.log(`JavaScript: ${compileToJavaScript(ast6)}`);
console.log();

// Example 7: Modulo and division
console.log("Example 7: Modulo and division");
const expr7 = "a % b + c / d";
const ast7 = parse(expr7);
console.log(`Expression: ${expr7}`);
console.log(`JavaScript: ${compileToJavaScript(ast7)}`);
