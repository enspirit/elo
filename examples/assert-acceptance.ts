/**
 * Simplified Acceptance Testing with assert()
 *
 * Instead of complex test orchestration comparing results across runtimes,
 * we can now write self-testing Klang expressions using assert().
 */

import { parse } from "../src/parser";
import { compileToJavaScript } from "../src/compilers/javascript";

console.log("=== Simplified Acceptance Testing with assert() ===\n");

// Test expressions using assert
const tests = [
  "assert(2 + 3 == 5)",
  "assert(10 % 3 == 1)",
  "assert(2 ^ 3 == 8)",
  "assert(5 > 3)",
  "assert(5 >= 5)",
  "assert(true && true)",
  "assert(!false)",
  "assert(D2024-01-15 > D2024-01-10)",
  "assert(D2024-01-15T10:30:00Z > D2024-01-15T09:00:00Z)",
];

console.log("Generated Test Code:\n");

tests.forEach((test, i) => {
  console.log(`Test ${i + 1}: ${test}`);
  const ast = parse(test);
  const jsCode = compileToJavaScript(ast);

  console.log(`  JS:   ${jsCode}`);
  console.log();
});

console.log("=== How This Simplifies Testing ===\n");
console.log("Old approach:");
console.log("  1. Compile expression to 3 languages");
console.log("  2. Evaluate in 3 different runtimes");
console.log("  3. Compare results for equality");
console.log("  4. Handle type normalization (dates, etc.)");
console.log("  5. Write complex assertion logic\n");

console.log("New approach with assert():");
console.log("  1. Write: assert(2 + 3 == 5)");
console.log("  2. Compile to each runtime");
console.log("  3. Evaluate - if no error, test passes!");
console.log("  4. Much simpler - Klang tests itself!\n");

console.log("Benefits:");
console.log("  - Klang expressions become self-testing");
console.log("  - No external test orchestration needed");
console.log("  - Bootstrapping: the language tests itself");
console.log("  - Cleaner, more maintainable tests");
