import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parse } from '../../src/parser';
import { Expr } from '../../src/ast';

describe('Parser - Numeric Literals', () => {
  it('should parse integer literals', () => {
    const ast = parse('42');
    assert.deepStrictEqual(ast, {
      type: 'literal',
      value: 42
    });
  });

  it('should parse floating point literals', () => {
    const ast = parse('3.14');
    assert.deepStrictEqual(ast, {
      type: 'literal',
      value: 3.14
    });
  });

  it('should parse zero', () => {
    const ast = parse('0');
    assert.deepStrictEqual(ast, {
      type: 'literal',
      value: 0
    });
  });
});

describe('Parser - Boolean Literals', () => {
  it('should parse true', () => {
    const ast = parse('true');
    assert.deepStrictEqual(ast, {
      type: 'literal',
      value: true
    });
  });

  it('should parse false', () => {
    const ast = parse('false');
    assert.deepStrictEqual(ast, {
      type: 'literal',
      value: false
    });
  });
});

describe('Parser - String Literals', () => {
  it('should parse simple single-quoted string', () => {
    const ast = parse("'hello'");
    assert.deepStrictEqual(ast, {
      type: 'string',
      value: 'hello'
    });
  });

  it('should parse string with spaces', () => {
    const ast = parse("'hello world'");
    assert.deepStrictEqual(ast, {
      type: 'string',
      value: 'hello world'
    });
  });

  it('should parse empty string', () => {
    const ast = parse("''");
    assert.deepStrictEqual(ast, {
      type: 'string',
      value: ''
    });
  });

  it('should parse string with escaped single quote', () => {
    const ast = parse("'it\\'s'");
    assert.deepStrictEqual(ast, {
      type: 'string',
      value: "it's"
    });
  });

  it('should parse string with escaped backslash', () => {
    const ast = parse("'a\\\\b'");
    assert.deepStrictEqual(ast, {
      type: 'string',
      value: 'a\\b'
    });
  });

  it('should parse string with numbers', () => {
    const ast = parse("'test123'");
    assert.deepStrictEqual(ast, {
      type: 'string',
      value: 'test123'
    });
  });
});

describe('Parser - Variables', () => {
  it('should parse single letter variables', () => {
    const ast = parse('x');
    assert.deepStrictEqual(ast, {
      type: 'variable',
      name: 'x'
    });
  });

  it('should parse multi-letter variables', () => {
    const ast = parse('price');
    assert.deepStrictEqual(ast, {
      type: 'variable',
      name: 'price'
    });
  });

  it('should parse variables with underscores', () => {
    const ast = parse('user_name');
    assert.deepStrictEqual(ast, {
      type: 'variable',
      name: 'user_name'
    });
  });

  it('should parse variables with numbers', () => {
    const ast = parse('var123');
    assert.deepStrictEqual(ast, {
      type: 'variable',
      name: 'var123'
    });
  });
});

describe('Parser - Arithmetic Operators', () => {
  it('should parse addition', () => {
    const ast = parse('1 + 2');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '+');
    }
  });

  it('should parse subtraction', () => {
    const ast = parse('5 - 3');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '-');
    }
  });

  it('should parse multiplication', () => {
    const ast = parse('4 * 3');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '*');
    }
  });

  it('should parse division', () => {
    const ast = parse('10 / 2');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '/');
    }
  });

  it('should parse modulo', () => {
    const ast = parse('10 % 3');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '%');
    }
  });

  it('should parse power', () => {
    const ast = parse('2 ^ 3');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '^');
    }
  });
});

describe('Parser - Comparison Operators', () => {
  it('should parse less than', () => {
    const ast = parse('x < 10');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '<');
    }
  });

  it('should parse greater than', () => {
    const ast = parse('x > 10');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '>');
    }
  });

  it('should parse less than or equal', () => {
    const ast = parse('x <= 10');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '<=');
    }
  });

  it('should parse greater than or equal', () => {
    const ast = parse('x >= 10');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '>=');
    }
  });

  it('should parse equality', () => {
    const ast = parse('x == 10');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '==');
    }
  });

  it('should parse inequality', () => {
    const ast = parse('x != 10');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '!=');
    }
  });
});

describe('Parser - Logical Operators', () => {
  it('should parse AND', () => {
    const ast = parse('true && false');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '&&');
    }
  });

  it('should parse OR', () => {
    const ast = parse('true || false');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '||');
    }
  });

  it('should parse NOT', () => {
    const ast = parse('!x');
    assert.strictEqual(ast.type, 'unary');
    if (ast.type === 'unary') {
      assert.strictEqual(ast.operator, '!');
    }
  });
});

describe('Parser - Unary Operators', () => {
  it('should parse unary minus', () => {
    const ast = parse('-5');
    assert.strictEqual(ast.type, 'unary');
    if (ast.type === 'unary') {
      assert.strictEqual(ast.operator, '-');
    }
  });

  it('should parse unary plus', () => {
    const ast = parse('+5');
    assert.strictEqual(ast.type, 'unary');
    if (ast.type === 'unary') {
      assert.strictEqual(ast.operator, '+');
    }
  });

  it('should parse double negation', () => {
    const ast = parse('!!x');
    assert.strictEqual(ast.type, 'unary');
    if (ast.type === 'unary') {
      assert.strictEqual(ast.operator, '!');
      assert.strictEqual(ast.operand.type, 'unary');
    }
  });
});

describe('Parser - Operator Precedence', () => {
  it('should handle multiplication before addition', () => {
    const ast = parse('2 + 3 * 4');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '+');
      assert.strictEqual(ast.right.type, 'binary');
      if (ast.right.type === 'binary') {
        assert.strictEqual(ast.right.operator, '*');
      }
    }
  });

  it('should handle power before multiplication', () => {
    const ast = parse('2 * 3 ^ 4');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '*');
      assert.strictEqual(ast.right.type, 'binary');
      if (ast.right.type === 'binary') {
        assert.strictEqual(ast.right.operator, '^');
      }
    }
  });

  it('should handle comparison before logical AND', () => {
    const ast = parse('x > 5 && y < 10');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '&&');
      assert.strictEqual(ast.left.type, 'binary');
      assert.strictEqual(ast.right.type, 'binary');
    }
  });

  it('should handle AND before OR', () => {
    const ast = parse('a || b && c');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '||');
      assert.strictEqual(ast.right.type, 'binary');
      if (ast.right.type === 'binary') {
        assert.strictEqual(ast.right.operator, '&&');
      }
    }
  });
});

describe('Parser - Parentheses', () => {
  it('should handle simple parentheses', () => {
    const ast = parse('(5)');
    assert.deepStrictEqual(ast, {
      type: 'literal',
      value: 5
    });
  });

  it('should override precedence with parentheses', () => {
    const ast = parse('(2 + 3) * 4');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '*');
      assert.strictEqual(ast.left.type, 'binary');
      if (ast.left.type === 'binary') {
        assert.strictEqual(ast.left.operator, '+');
      }
    }
  });

  it('should handle nested parentheses', () => {
    const ast = parse('((1 + 2) * 3)');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '*');
    }
  });

  it('should handle complex parenthesized expressions', () => {
    const ast = parse('(a || b) && (c || d)');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '&&');
      assert.strictEqual(ast.left.type, 'binary');
      assert.strictEqual(ast.right.type, 'binary');
    }
  });
});

describe('Parser - Complex Expressions', () => {
  it('should parse mixed arithmetic expression', () => {
    const ast = parse('2 + 3 * 4 - 5 / 2');
    assert.strictEqual(ast.type, 'binary');
  });

  it('should parse complex boolean expression', () => {
    const ast = parse('(x > 10 && x < 100) || y == 0');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '||');
    }
  });

  it('should parse mixed arithmetic and boolean', () => {
    const ast = parse('price * quantity > 1000');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '>');
      assert.strictEqual(ast.left.type, 'binary');
    }
  });
});

describe('Parser - Whitespace', () => {
  it('should handle expressions without whitespace', () => {
    const ast = parse('2+3*4');
    assert.strictEqual(ast.type, 'binary');
  });

  it('should handle expressions with extra whitespace', () => {
    const ast = parse('  2   +   3  ');
    assert.strictEqual(ast.type, 'binary');
  });

  it('should handle newlines and tabs', () => {
    const ast = parse('2\n+\t3');
    assert.strictEqual(ast.type, 'binary');
  });
});

describe('Parser - Error Handling', () => {
  it('should throw on unexpected character', () => {
    assert.throws(() => parse('2 $ 3'), /Unexpected character/);
  });

  it('should throw on unmatched opening parenthesis', () => {
    assert.throws(() => parse('(2 + 3'), /Expected RPAREN/);
  });

  it('should throw on unexpected closing parenthesis', () => {
    assert.throws(() => parse('2 + 3)'), /Expected EOF/);
  });

  it('should throw on empty expression', () => {
    assert.throws(() => parse(''), /Unexpected token/);
  });

  it('should throw on incomplete expression', () => {
    assert.throws(() => parse('2 +'), /Unexpected token/);
  });

  it('should throw on invalid token sequence', () => {
    assert.throws(() => parse('2 3'), /Expected EOF/);
  });
});

describe('Parser - Function Calls', () => {
  it('should parse function call with no arguments', () => {
    const ast = parse('foo()');
    assert.deepStrictEqual(ast, {
      type: 'function_call',
      name: 'foo',
      args: []
    });
  });

  it('should parse function call with one argument', () => {
    const ast = parse('assert(true)');
    assert.deepStrictEqual(ast, {
      type: 'function_call',
      name: 'assert',
      args: [{ type: 'literal', value: true }]
    });
  });

  it('should parse function call with multiple arguments', () => {
    const ast = parse('max(5, 3)');
    assert.strictEqual(ast.type, 'function_call');
    const funcCall = ast as any;
    assert.strictEqual(funcCall.name, 'max');
    assert.strictEqual(funcCall.args.length, 2);
    assert.strictEqual(funcCall.args[0].type, 'literal');
    assert.strictEqual(funcCall.args[1].type, 'literal');
  });

  it('should parse nested function calls', () => {
    const ast = parse('foo(bar(5))');
    assert.strictEqual(ast.type, 'function_call');
    const funcCall = ast as any;
    assert.strictEqual(funcCall.name, 'foo');
    assert.strictEqual(funcCall.args[0].type, 'function_call');
    assert.strictEqual(funcCall.args[0].name, 'bar');
  });

  it('should parse function call with complex expression argument', () => {
    const ast = parse('assert(2 + 3 == 5)');
    assert.strictEqual(ast.type, 'function_call');
    const funcCall = ast as any;
    assert.strictEqual(funcCall.name, 'assert');
    assert.strictEqual(funcCall.args[0].type, 'binary');
  });
});

describe('Parser - Let Expressions', () => {
  it('should parse simple let expression', () => {
    const ast = parse('let x = 1 in x');
    assert.strictEqual(ast.type, 'let');
    if (ast.type === 'let') {
      assert.strictEqual(ast.bindings.length, 1);
      assert.strictEqual(ast.bindings[0].name, 'x');
      assert.deepStrictEqual(ast.bindings[0].value, { type: 'literal', value: 1 });
      assert.deepStrictEqual(ast.body, { type: 'variable', name: 'x' });
    }
  });

  it('should parse let with multiple bindings (desugared to nested)', () => {
    const ast = parse('let x = 1, y = 2 in x + y');
    // Multiple bindings are desugared to nested let expressions
    assert.strictEqual(ast.type, 'let');
    if (ast.type === 'let') {
      assert.strictEqual(ast.bindings.length, 1);
      assert.strictEqual(ast.bindings[0].name, 'x');
      assert.strictEqual(ast.body.type, 'let');
      if (ast.body.type === 'let') {
        assert.strictEqual(ast.body.bindings[0].name, 'y');
        assert.strictEqual(ast.body.body.type, 'binary');
      }
    }
  });

  it('should parse nested let expressions', () => {
    const ast = parse('let x = 1 in let y = 2 in x + y');
    assert.strictEqual(ast.type, 'let');
    if (ast.type === 'let') {
      assert.strictEqual(ast.bindings.length, 1);
      assert.strictEqual(ast.body.type, 'let');
    }
  });

  it('should parse let with complex binding value', () => {
    const ast = parse('let x = 1 + 2 in x * 3');
    assert.strictEqual(ast.type, 'let');
    if (ast.type === 'let') {
      assert.strictEqual(ast.bindings[0].value.type, 'binary');
      assert.strictEqual(ast.body.type, 'binary');
    }
  });

  it('should parse let in larger expression', () => {
    const ast = parse('1 + let x = 2 in x');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '+');
      assert.strictEqual(ast.right.type, 'let');
    }
  });

  it('should parse let with function call in body', () => {
    const ast = parse('let x = 5, y = 3 in assert(x + y == 8)');
    // Multiple bindings are desugared to nested let expressions
    assert.strictEqual(ast.type, 'let');
    if (ast.type === 'let') {
      assert.strictEqual(ast.bindings.length, 1);
      assert.strictEqual(ast.bindings[0].name, 'x');
      assert.strictEqual(ast.body.type, 'let');
      if (ast.body.type === 'let') {
        assert.strictEqual(ast.body.bindings[0].name, 'y');
        assert.strictEqual(ast.body.body.type, 'function_call');
      }
    }
  });

  it('should throw on let without in keyword', () => {
    assert.throws(() => parse('let x = 1 x'), /Expected IN/);
  });

  it('should throw on let without binding value', () => {
    assert.throws(() => parse('let x in x'), /Expected ASSIGN/);
  });
});

describe('Parser - Range Membership', () => {
  it('should parse inclusive range with numeric literals', () => {
    const ast = parse('5 in 1..10');
    // Desugars to: 5 >= 1 && 5 <= 10
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '&&');
      assert.strictEqual(ast.left.type, 'binary');
      assert.strictEqual(ast.right.type, 'binary');
      if (ast.left.type === 'binary') {
        assert.strictEqual(ast.left.operator, '>=');
      }
      if (ast.right.type === 'binary') {
        assert.strictEqual(ast.right.operator, '<=');
      }
    }
  });

  it('should parse exclusive range with numeric literals', () => {
    const ast = parse('5 in 1...10');
    // Desugars to: 5 >= 1 && 5 < 10
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '&&');
      if (ast.right.type === 'binary') {
        assert.strictEqual(ast.right.operator, '<');
      }
    }
  });

  it('should parse range with variable', () => {
    const ast = parse('x in 0..100');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '&&');
    }
  });

  it('should parse range with temporal keywords', () => {
    const ast = parse('x in TODAY..TOMORROW');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '&&');
    }
  });

  it('should parse complex range using let wrapper', () => {
    const ast = parse('(a + b) in (x - 1)..(x + 1)');
    // Complex expressions should desugar to nested let expressions
    // (the let helper desugars multiple bindings into nested lets)
    assert.strictEqual(ast.type, 'let');
    if (ast.type === 'let') {
      assert.strictEqual(ast.bindings.length, 1);
      assert.strictEqual(ast.bindings[0].name, '_v');
      // The body should be another let with _lo binding
      assert.strictEqual(ast.body.type, 'let');
    }
  });

  it('should parse range in larger expression', () => {
    const ast = parse('x in 1..10 and y in 1..10');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '&&');
    }
  });

  it('should parse range nested in let expression', () => {
    const ast = parse('let r = 5 in r in 1..10');
    assert.strictEqual(ast.type, 'let');
    if (ast.type === 'let') {
      assert.strictEqual(ast.bindings[0].name, 'r');
      assert.strictEqual(ast.body.type, 'binary');
    }
  });

  it('should parse negated range with not in', () => {
    const ast = parse('11 not in 1..10');
    // Desugars to: !(11 >= 1 && 11 <= 10)
    assert.strictEqual(ast.type, 'unary');
    if (ast.type === 'unary') {
      assert.strictEqual(ast.operator, '!');
      assert.strictEqual(ast.operand.type, 'binary');
    }
  });

  it('should parse exclusive negated range with not in', () => {
    const ast = parse('5 not in 1...5');
    // Desugars to: !(5 >= 1 && 5 < 5)
    assert.strictEqual(ast.type, 'unary');
    if (ast.type === 'unary') {
      assert.strictEqual(ast.operator, '!');
    }
  });

  it('should throw on range without end', () => {
    assert.throws(() => parse('5 in 1..'), /Unexpected token/);
  });

  it('should throw on range without start', () => {
    assert.throws(() => parse('5 in ..10'), /Unexpected token/);
  });
});

describe('Parser - Comments', () => {
  it('should ignore single-line comment at end of line', () => {
    const ast = parse('42 # this is a comment');
    assert.deepStrictEqual(ast, {
      type: 'literal',
      value: 42
    });
  });

  it('should ignore comment-only lines before expression', () => {
    const ast = parse('# comment\n42');
    assert.deepStrictEqual(ast, {
      type: 'literal',
      value: 42
    });
  });

  it('should ignore multiple comment lines', () => {
    const ast = parse('# first comment\n# second comment\n42');
    assert.deepStrictEqual(ast, {
      type: 'literal',
      value: 42
    });
  });

  it('should handle comment between tokens', () => {
    const ast = parse('1 + # comment\n2');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '+');
    }
  });

  it('should handle comment after expression', () => {
    const ast = parse('1 + 2 # result is 3');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '+');
    }
  });

  it('should handle empty comment', () => {
    const ast = parse('#\n42');
    assert.deepStrictEqual(ast, {
      type: 'literal',
      value: 42
    });
  });

  it('should handle comment with special characters', () => {
    const ast = parse('42 # !@#$%^&*()');
    assert.deepStrictEqual(ast, {
      type: 'literal',
      value: 42
    });
  });

  it('should not treat # inside string as comment', () => {
    const ast = parse("'hello # world'");
    assert.deepStrictEqual(ast, {
      type: 'string',
      value: 'hello # world'
    });
  });

  it('should handle multiline expression with comments', () => {
    const input = `
      # Arithmetic test
      1 + 2 # addition
    `;
    const ast = parse(input);
    assert.strictEqual(ast.type, 'binary');
  });
});
