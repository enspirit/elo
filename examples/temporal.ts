import { parse, compileToJavaScript } from "../src";

console.log("=== Temporal Expression Examples ===\n");

// Example 1: Date literals
console.log("Example 1: Date literals");
const expr1 = "D2024-01-15";
const ast1 = parse(expr1);
console.log(`Expression: ${expr1}`);
console.log(`JavaScript: ${compileToJavaScript(ast1)}`);
console.log();

// Example 2: DateTime literals
console.log("Example 2: DateTime literals");
const expr2 = "D2024-01-15T10:30:00Z";
const ast2 = parse(expr2);
console.log(`Expression: ${expr2}`);
console.log(`JavaScript: ${compileToJavaScript(ast2)}`);
console.log();

// Example 3: Duration literals
console.log("Example 3: Duration literals - 1 day");
const expr3 = "P1D";
const ast3 = parse(expr3);
console.log(`Expression: ${expr3}`);
console.log(`JavaScript: ${compileToJavaScript(ast3)}`);
console.log();

// Example 4: Duration with time component
console.log("Example 4: Duration - 1 hour 30 minutes");
const expr4 = "PT1H30M";
const ast4 = parse(expr4);
console.log(`Expression: ${expr4}`);
console.log(`JavaScript: ${compileToJavaScript(ast4)}`);
console.log();

// Example 5: Date arithmetic - adding duration to date
console.log("Example 5: Date arithmetic - date + duration");
const expr5 = "D2024-01-15 + P1D";
const ast5 = parse(expr5);
console.log(`Expression: ${expr5}`);
console.log(`JavaScript: ${compileToJavaScript(ast5)}`);
console.log();

// Example 6: Date comparison
console.log("Example 6: Date comparison");
const expr6 = "D2024-01-15 < D2024-12-31";
const ast6 = parse(expr6);
console.log(`Expression: ${expr6}`);
console.log(`JavaScript: ${compileToJavaScript(ast6)}`);
console.log();

// Example 7: Date subtraction
console.log("Example 7: Date subtraction (days between)");
const expr7 = "D2024-12-31 - D2024-01-01";
const ast7 = parse(expr7);
console.log(`Expression: ${expr7}`);
console.log(`JavaScript: ${compileToJavaScript(ast7)}`);
console.log();

// Example 8: Complex temporal expression
console.log("Example 8: Check if event date is within 30 days");
const expr8 = "event_date >= D2024-01-01 && event_date <= D2024-01-01 + P30D";
const ast8 = parse(expr8);
console.log(`Expression: ${expr8}`);
console.log(`JavaScript: ${compileToJavaScript(ast8)}`);
console.log();

// Example 9: Duration arithmetic
console.log("Example 9: Duration arithmetic");
const expr9 = "P1D + PT12H";
const ast9 = parse(expr9);
console.log(`Expression: ${expr9}`);
console.log(`JavaScript: ${compileToJavaScript(ast9)}`);
console.log();

// Example 10: Complex duration
console.log("Example 10: Complex duration - 1 year 2 months 3 days");
const expr10 = "P1Y2M3D";
const ast10 = parse(expr10);
console.log(`Expression: ${expr10}`);
console.log(`JavaScript: ${compileToJavaScript(ast10)}`);
console.log();

// Example 11: Datetime with time arithmetic
console.log("Example 11: Datetime + duration");
const expr11 = "D2024-01-15T09:00:00Z + PT2H30M";
const ast11 = parse(expr11);
console.log(`Expression: ${expr11}`);
console.log(`JavaScript: ${compileToJavaScript(ast11)}`);
console.log();

// Example 12: Age calculation
console.log("Example 12: Age greater than 18 years");
const expr12 = "current_date - birth_date > P18Y";
const ast12 = parse(expr12);
console.log(`Expression: ${expr12}`);
console.log(`JavaScript: ${compileToJavaScript(ast12)}`);
