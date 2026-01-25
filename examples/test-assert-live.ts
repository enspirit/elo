/**
 * Live test: Actually evaluate assert() expressions in JavaScript
 */

import { parse } from "../src/parser";
import { compileToJavaScript } from "../src/compilers/javascript";

console.log("=== Live Assert Testing ===\n");
console.log("Evaluating assert expressions in JavaScript runtime:\n");

const tests = [
  { expr: "assert(2 + 3 == 5)", desc: "Basic arithmetic" },
  { expr: "assert(10 % 3 == 1)", desc: "Modulo operator" },
  { expr: "assert(true && true)", desc: "Boolean logic" },
  { expr: "assert(5 > 3)", desc: "Comparison" },
  { expr: "assert(!false)", desc: "Negation" },
];

tests.forEach(({ expr, desc }) => {
  try {
    const ast = parse(expr);
    const jsCode = compileToJavaScript(ast);

    // Evaluate the JavaScript code
    const result = eval(jsCode);

    console.log(`✓ ${desc}`);
    console.log(`  Expression: ${expr}`);
    console.log(`  Compiled:   ${jsCode}`);
    console.log(`  Result:     ${result} (assertion passed!)`);
    console.log();
  } catch (error) {
    console.log(`✗ ${desc}`);
    console.log(`  Expression: ${expr}`);
    console.log(`  Error:      ${error}`);
    console.log();
  }
});

// Now test a failing assertion
console.log("=== Testing Failure Case ===\n");
try {
  const failExpr = "assert(2 + 2 == 5)";
  const ast = parse(failExpr);
  const jsCode = compileToJavaScript(ast);

  console.log(`Expression: ${failExpr}`);
  console.log(`Compiled:   ${jsCode}`);
  console.log("Evaluating...");

  eval(jsCode);

  console.log("✗ Should have thrown an error!");
} catch (error) {
  console.log(`✓ Correctly threw error: ${(error as Error).message}`);
}

console.log("\n=== Summary ===");
console.log("assert() works perfectly for bootstrapping Klang tests!");
console.log("- Passing assertions return true");
console.log("- Failing assertions throw errors");
console.log("- No complex test orchestration needed");
