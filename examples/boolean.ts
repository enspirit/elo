import { parse, compileToJavaScript } from "../src";

console.log("=== Boolean Expression Examples ===\n");

// Example 1: Boolean literals
console.log("Example 1: Boolean literals");
const expr1 = "true";
const ast1 = parse(expr1);
console.log(`Expression: ${expr1}`);
console.log(`JavaScript: ${compileToJavaScript(ast1)}`);
console.log();

// Example 2: Comparison operators
console.log("Example 2: Comparison operators");
const expr2 = "x > 10";
const ast2 = parse(expr2);
console.log(`Expression: ${expr2}`);
console.log(`JavaScript: ${compileToJavaScript(ast2)}`);
console.log();

// Example 3: Equality operators
console.log("Example 3: Equality operators");
const expr3 = "age == 25";
const ast3 = parse(expr3);
console.log(`Expression: ${expr3}`);
console.log(`JavaScript: ${compileToJavaScript(ast3)}`);
console.log();

// Example 4: Logical AND
console.log("Example 4: Logical AND");
const expr4 = "x > 0 && x < 100";
const ast4 = parse(expr4);
console.log(`Expression: ${expr4}`);
console.log(`JavaScript: ${compileToJavaScript(ast4)}`);
console.log();

// Example 5: Logical OR
console.log("Example 5: Logical OR");
const expr5 = "status == 1 || status == 2";
const ast5 = parse(expr5);
console.log(`Expression: ${expr5}`);
console.log(`JavaScript: ${compileToJavaScript(ast5)}`);
console.log();

// Example 6: Logical NOT
console.log("Example 6: Logical NOT");
const expr6 = "!active";
const ast6 = parse(expr6);
console.log(`Expression: ${expr6}`);
console.log(`JavaScript: ${compileToJavaScript(ast6)}`);
console.log();

// Example 7: Complex boolean expression
console.log("Example 7: Complex boolean expression");
const expr7 = "(price > 100 && discount >= 10) || vip == true";
const ast7 = parse(expr7);
console.log(`Expression: ${expr7}`);
console.log(`JavaScript: ${compileToJavaScript(ast7)}`);
console.log();

// Example 8: Mixed arithmetic and boolean
console.log("Example 8: Mixed arithmetic and boolean");
const expr8 = "total * 1.1 > 1000";
const ast8 = parse(expr8);
console.log(`Expression: ${expr8}`);
console.log(`JavaScript: ${compileToJavaScript(ast8)}`);
console.log();

// Example 9: Inequality
console.log("Example 9: Inequality");
const expr9 = "count != 0";
const ast9 = parse(expr9);
console.log(`Expression: ${expr9}`);
console.log(`JavaScript: ${compileToJavaScript(ast9)}`);
console.log();
