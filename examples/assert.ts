import { parse } from "../src/parser";
import { compileToJavaScript } from "../src/compilers/javascript";

console.log("=== Klang assert() Function Demo ===\n");

// Example 1: Simple assertion
console.log("Example 1: assert(true)");
const ast1 = parse("assert(true)");
console.log("  JavaScript:", compileToJavaScript(ast1));
console.log();

// Example 2: Assertion with comparison
console.log("Example 2: assert(5 > 3)");
const ast2 = parse("assert(5 > 3)");
console.log("  JavaScript:", compileToJavaScript(ast2));
console.log();

// Example 3: Assertion with arithmetic
console.log("Example 3: assert(2 + 3 == 5)");
const ast3 = parse("assert(2 + 3 == 5)");
console.log("  JavaScript:", compileToJavaScript(ast3));
console.log();

// Example 4: Assertion with variables
console.log("Example 4: assert(x > 0 && x < 100)");
const ast4 = parse("assert(x > 0 && x < 100)");
console.log("  JavaScript:", compileToJavaScript(ast4));
console.log();

console.log("=== How assert works ===");
console.log("- JavaScript: Throws Error if condition is false");
console.log("- Ruby: Raises exception if condition is false");
console.log("- SQL: Uses CASE WHEN to check condition");
console.log();

console.log("=== Bootstrap testing ===");
console.log("You can now write self-testing Klang expressions:");
console.log("  assert(2 + 2 == 4)");
console.log("  assert(5 > 3)");
console.log("  assert(D2024-01-15 > D2024-01-10)");
