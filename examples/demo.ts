import { parse, compileToJavaScript } from "../src";

const expr = "(price * quantity) - discount";
const ast = parse(expr);

console.log("Expression:", expr);
console.log("");
console.log("JavaScript:", compileToJavaScript(ast));
console.log("");
console.log("AST:");
console.log(JSON.stringify(ast, null, 2));
