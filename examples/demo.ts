import { parse, compileToRuby, compileToJavaScript, compileToSQL } from '../src';

const expr = '(price * quantity) - discount';
const ast = parse(expr);

console.log('Expression:', expr);
console.log('');
console.log('Ruby:      ', compileToRuby(ast));
console.log('JavaScript:', compileToJavaScript(ast));
console.log('SQL:       ', compileToSQL(ast));
console.log('');
console.log('AST:');
console.log(JSON.stringify(ast, null, 2));
