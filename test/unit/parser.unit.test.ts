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

  it('should include line and column in error messages', () => {
    assert.throws(() => parse('2 $ 3'), /at line 1, column 3/);
  });

  it('should track line number correctly in multiline input', () => {
    assert.throws(() => parse('1 +\n2 +\n$'), /at line 3, column 1/);
  });

  it('should track column correctly after newlines', () => {
    assert.throws(() => parse('1 + 2\n  $'), /at line 2, column 3/);
  });

  it('should show correct position for syntax errors', () => {
    assert.throws(() => parse('let x = 5'), /at line 1, column 10/);
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

  it('should parse uppercase let bindings as type definitions', () => {
    // Uppercase names define types (Finitio-like dressing)
    const ast = parse('let X = String in x |> X');
    assert.deepStrictEqual(ast, {
      type: 'typedef',
      name: 'X',
      typeExpr: { kind: 'type_ref', name: 'String' },
      body: {
        type: 'function_call',
        name: 'X',
        args: [{ type: 'variable', name: 'x' }]
      }
    });
  });

  it('should parse multiple type bindings (desugared to nested)', () => {
    const ast = parse('let A = String, B = Int in 1');
    // Multiple type bindings are desugared to nested typedef expressions
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.name, 'A');
      assert.deepStrictEqual(ast.typeExpr, { kind: 'type_ref', name: 'String' });
      assert.strictEqual(ast.body.type, 'typedef');
      if (ast.body.type === 'typedef') {
        assert.strictEqual(ast.body.name, 'B');
        assert.deepStrictEqual(ast.body.typeExpr, { kind: 'type_ref', name: 'Int' });
        assert.deepStrictEqual(ast.body.body, { type: 'literal', value: 1 });
      }
    }
  });

  it('should parse type binding referencing earlier type binding', () => {
    const ast = parse('let Person = { name: String }, Persons = [Person] in 1');
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.name, 'Person');
      assert.strictEqual(ast.typeExpr.kind, 'type_schema');
      assert.strictEqual(ast.body.type, 'typedef');
      if (ast.body.type === 'typedef') {
        assert.strictEqual(ast.body.name, 'Persons');
        assert.strictEqual(ast.body.typeExpr.kind, 'array_type');
        if (ast.body.typeExpr.kind === 'array_type') {
          assert.deepStrictEqual(ast.body.typeExpr.elementType, { kind: 'type_ref', name: 'Person' });
        }
      }
    }
  });

  it('should parse type binding followed by value binding', () => {
    const ast = parse('let T = String, x = 1 in x');
    // Type binding first, then value binding
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.name, 'T');
      assert.deepStrictEqual(ast.typeExpr, { kind: 'type_ref', name: 'String' });
      // Body is a let expression with the value binding
      assert.strictEqual(ast.body.type, 'let');
      if (ast.body.type === 'let') {
        assert.strictEqual(ast.body.bindings.length, 1);
        assert.strictEqual(ast.body.bindings[0].name, 'x');
        assert.deepStrictEqual(ast.body.bindings[0].value, { type: 'literal', value: 1 });
      }
    }
  });

  it('should parse type binding followed by multiple value bindings', () => {
    const ast = parse('let T = Int, x = 1, y = 2 in x + y');
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.name, 'T');
      assert.strictEqual(ast.body.type, 'let');
      if (ast.body.type === 'let') {
        // Value bindings are desugared to nested lets
        assert.strictEqual(ast.body.bindings.length, 1);
        assert.strictEqual(ast.body.bindings[0].name, 'x');
        assert.strictEqual(ast.body.body.type, 'let');
      }
    }
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

describe('Parser - Lambda Expressions', () => {
  it('should parse simple lambda with one parameter', () => {
    const ast = parse('fn( x ~> x )');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.deepStrictEqual(ast.params, ['x']);
      assert.deepStrictEqual(ast.body, { type: 'variable', name: 'x' });
    }
  });

  it('should parse lambda with expression body', () => {
    const ast = parse('fn( x ~> x * 2 )');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.deepStrictEqual(ast.params, ['x']);
      assert.strictEqual(ast.body.type, 'binary');
    }
  });

  it('should parse lambda with multiple parameters', () => {
    const ast = parse('fn( x, y ~> x + y )');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.deepStrictEqual(ast.params, ['x', 'y']);
      assert.strictEqual(ast.body.type, 'binary');
    }
  });

  it('should parse lambda with three parameters', () => {
    const ast = parse('fn( a, b, c ~> a + b + c )');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.deepStrictEqual(ast.params, ['a', 'b', 'c']);
    }
  });

  it('should parse lambda with member access in body', () => {
    const ast = parse('fn( _ ~> _.budget )');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.deepStrictEqual(ast.params, ['_']);
      assert.strictEqual(ast.body.type, 'member_access');
    }
  });

  it('should parse lambda with let expression in body', () => {
    const ast = parse('fn( x ~> let y = x * 2 in y + 1 )');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.deepStrictEqual(ast.params, ['x']);
      assert.strictEqual(ast.body.type, 'let');
    }
  });

  it('should parse lambda with if expression in body', () => {
    const ast = parse('fn( x ~> if x > 0 then x else 0 )');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.deepStrictEqual(ast.params, ['x']);
      assert.strictEqual(ast.body.type, 'if');
    }
  });

  it('should parse lambda with underscore parameter name', () => {
    const ast = parse('fn( _ ~> _.price * 1.21 )');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.deepStrictEqual(ast.params, ['_']);
    }
  });

  it('should throw on lambda without arrow', () => {
    assert.throws(() => parse('fn( x x )'), /Expected ARROW/);
  });

  it('should throw on lambda without closing paren', () => {
    assert.throws(() => parse('fn( x ~> x'), /Expected RPAREN/);
  });

  it('should throw on lambda without opening paren', () => {
    assert.throws(() => parse('fn x ~> x )'), /Expected LPAREN/);
  });

  it('should parse lambda invocation in let', () => {
    const ast = parse('let f = fn( x ~> x * 2 ) in f(5)');
    assert.strictEqual(ast.type, 'let');
    if (ast.type === 'let') {
      assert.strictEqual(ast.bindings[0].name, 'f');
      assert.strictEqual(ast.bindings[0].value.type, 'lambda');
      assert.strictEqual(ast.body.type, 'function_call');
      if (ast.body.type === 'function_call') {
        assert.strictEqual(ast.body.name, 'f');
        assert.strictEqual(ast.body.args.length, 1);
      }
    }
  });

  it('should parse lambda invocation with multiple args', () => {
    const ast = parse('let add = fn( x, y ~> x + y ) in add(3, 4)');
    assert.strictEqual(ast.type, 'let');
    if (ast.type === 'let') {
      assert.strictEqual(ast.body.type, 'function_call');
      if (ast.body.type === 'function_call') {
        assert.strictEqual(ast.body.name, 'add');
        assert.strictEqual(ast.body.args.length, 2);
      }
    }
  });

  it('should reject uppercase parameter names', () => {
    // Uppercase names are reserved for Types and Selectors
    assert.throws(() => parse('fn( X ~> X )'), /Expected IDENTIFIER/);
    assert.throws(() => parse('fn( x, Y ~> x + Y )'), /Expected IDENTIFIER/);
  });
});

describe('Parser - Lambda Sugar (single param)', () => {
  it('should parse simple lambda sugar', () => {
    const ast = parse('x ~> x');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.deepStrictEqual(ast.params, ['x']);
      assert.deepStrictEqual(ast.body, { type: 'variable', name: 'x' });
    }
  });

  it('should parse lambda sugar with expression body', () => {
    const ast = parse('x ~> x * 2');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.deepStrictEqual(ast.params, ['x']);
      assert.strictEqual(ast.body.type, 'binary');
    }
  });

  it('should parse lambda sugar as function argument', () => {
    const ast = parse('map(arr, x ~> x * 2)');
    assert.strictEqual(ast.type, 'function_call');
    if (ast.type === 'function_call') {
      assert.strictEqual(ast.name, 'map');
      assert.strictEqual(ast.args.length, 2);
      assert.strictEqual(ast.args[1].type, 'lambda');
    }
  });

  it('should parse lambda sugar with pipe operator', () => {
    const ast = parse('[1,2,3] |> map(x ~> x * 2)');
    assert.strictEqual(ast.type, 'function_call');
    if (ast.type === 'function_call') {
      assert.strictEqual(ast.name, 'map');
      assert.strictEqual(ast.args.length, 2);
      assert.strictEqual(ast.args[1].type, 'lambda');
    }
  });

  it('should parse lambda sugar with if expression in body', () => {
    const ast = parse('x ~> if x > 0 then x else 0');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.deepStrictEqual(ast.params, ['x']);
      assert.strictEqual(ast.body.type, 'if');
    }
  });

  it('should parse lambda sugar with let expression in body', () => {
    const ast = parse('x ~> let y = x * 2 in y + 1');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.deepStrictEqual(ast.params, ['x']);
      assert.strictEqual(ast.body.type, 'let');
    }
  });

  it('should parse lambda sugar with underscore parameter', () => {
    const ast = parse('_ ~> _.price * 1.21');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.deepStrictEqual(ast.params, ['_']);
    }
  });

  it('should produce same AST as fn() syntax', () => {
    const sugarAst = parse('x ~> x * 2');
    const fnAst = parse('fn( x ~> x * 2 )');
    assert.deepStrictEqual(sugarAst, fnAst);
  });

  it('should reject uppercase parameter names in sugar syntax', () => {
    // Uppercase names are reserved for Types and Selectors
    assert.throws(() => parse('X ~> X'), /Unknown uppercase identifier/);
  });
});

describe('Parser - Pipe Operator', () => {
  it('should parse simple pipe: x |> f()', () => {
    const ast = parse("'hello' |> upper()");
    assert.deepStrictEqual(ast, {
      type: 'function_call',
      name: 'upper',
      args: [{ type: 'string', value: 'hello' }]
    });
  });

  it('should parse pipe with additional arguments: x |> f(a, b)', () => {
    const ast = parse("'hello' |> padStart(10, '-')");
    assert.strictEqual(ast.type, 'function_call');
    if (ast.type === 'function_call') {
      assert.strictEqual(ast.name, 'padStart');
      assert.strictEqual(ast.args.length, 3);
      assert.deepStrictEqual(ast.args[0], { type: 'string', value: 'hello' });
      assert.deepStrictEqual(ast.args[1], { type: 'literal', value: 10 });
      assert.deepStrictEqual(ast.args[2], { type: 'string', value: '-' });
    }
  });

  it('should parse chained pipes: a |> f() |> g()', () => {
    const ast = parse("'  hello  ' |> trim() |> upper()");
    // Desugars to: upper(trim('  hello  '))
    assert.strictEqual(ast.type, 'function_call');
    if (ast.type === 'function_call') {
      assert.strictEqual(ast.name, 'upper');
      assert.strictEqual(ast.args.length, 1);
      const inner = ast.args[0];
      assert.strictEqual(inner.type, 'function_call');
      if (inner.type === 'function_call') {
        assert.strictEqual(inner.name, 'trim');
        assert.deepStrictEqual(inner.args[0], { type: 'string', value: '  hello  ' });
      }
    }
  });

  it('should parse pipe with expression on left side', () => {
    const ast = parse('1 + 2 |> abs()');
    // Desugars to: abs(1 + 2)
    assert.strictEqual(ast.type, 'function_call');
    if (ast.type === 'function_call') {
      assert.strictEqual(ast.name, 'abs');
      assert.strictEqual(ast.args.length, 1);
      const inner = ast.args[0];
      assert.strictEqual(inner.type, 'binary');
    }
  });

  it('should parse pipe with boolean expression on left', () => {
    const ast = parse('x > 0 or y > 0 |> assert()');
    // Pipe has lowest precedence, so: assert(x > 0 or y > 0)
    assert.strictEqual(ast.type, 'function_call');
    if (ast.type === 'function_call') {
      assert.strictEqual(ast.name, 'assert');
      const inner = ast.args[0];
      assert.strictEqual(inner.type, 'binary');
      if (inner.type === 'binary') {
        assert.strictEqual(inner.operator, '||');
      }
    }
  });

  it('should parse pipe in let body', () => {
    const ast = parse("let x = 'test' in x |> upper()");
    assert.strictEqual(ast.type, 'let');
    if (ast.type === 'let') {
      assert.strictEqual(ast.body.type, 'function_call');
    }
  });

  it('should error when right side is not an identifier', () => {
    assert.throws(() => parse("'hello' |> 5"), /Expected function name after \|>/);
  });

  it('should parse pipe without parentheses: x |> f', () => {
    const ast = parse("'hello' |> upper");
    assert.deepStrictEqual(ast, {
      type: 'function_call',
      name: 'upper',
      args: [{ type: 'string', value: 'hello' }]
    });
  });

  it('should parse pipe without parentheses with chaining: a |> f |> g', () => {
    const ast = parse("'  hello  ' |> trim |> upper");
    // Desugars to: upper(trim('  hello  '))
    assert.strictEqual(ast.type, 'function_call');
    if (ast.type === 'function_call') {
      assert.strictEqual(ast.name, 'upper');
      assert.strictEqual(ast.args.length, 1);
      const inner = ast.args[0];
      assert.strictEqual(inner.type, 'function_call');
      if (inner.type === 'function_call') {
        assert.strictEqual(inner.name, 'trim');
        assert.deepStrictEqual(inner.args[0], { type: 'string', value: '  hello  ' });
      }
    }
  });

  it('should parse mixed pipe with and without parens: a |> f |> g(x)', () => {
    const ast = parse("'hello' |> upper |> padStart(10)");
    // Desugars to: padStart(upper('hello'), 10)
    assert.strictEqual(ast.type, 'function_call');
    if (ast.type === 'function_call') {
      assert.strictEqual(ast.name, 'padStart');
      assert.strictEqual(ast.args.length, 2);
      const inner = ast.args[0];
      assert.strictEqual(inner.type, 'function_call');
      if (inner.type === 'function_call') {
        assert.strictEqual(inner.name, 'upper');
      }
    }
  });

  it('should not confuse |> with || (or)', () => {
    // |> is pipe
    const pipeAst = parse("'x' |> upper()");
    assert.strictEqual(pipeAst.type, 'function_call');

    // || is or
    const orAst = parse('true || false');
    assert.strictEqual(orAst.type, 'binary');
    if (orAst.type === 'binary') {
      assert.strictEqual(orAst.operator, '||');
    }
  });
});

describe('Parser - Depth Limits', () => {
  it('should parse expressions within depth limit', () => {
    // 5 levels of nesting with maxDepth=10 should work
    const ast = parse('((((( 1 )))))', { maxDepth: 10 });
    assert.strictEqual(ast.type, 'literal');
  });

  it('should throw when depth limit exceeded with nested parentheses', () => {
    // Create 15 levels of nesting with maxDepth=10
    const expr = '('.repeat(15) + '1' + ')'.repeat(15);
    assert.throws(
      () => parse(expr, { maxDepth: 10 }),
      /Maximum expression depth exceeded \(10\)/
    );
  });

  it('should throw when depth limit exceeded with nested function calls', () => {
    // Nested function calls: f(f(f(f(f(f(f(1)))))))
    const expr = 'f(f(f(f(f(f(f(f(f(f(f(1))))))))))';
    assert.throws(
      () => parse(expr, { maxDepth: 5 }),
      /Maximum expression depth exceeded \(5\)/
    );
  });

  it('should throw when depth limit exceeded with nested if expressions', () => {
    // Nested if: if true then if true then if true then 1 else 2 else 2 else 2
    const expr = 'if true then if true then if true then if true then if true then if true then 1 else 0 else 0 else 0 else 0 else 0 else 0';
    assert.throws(
      () => parse(expr, { maxDepth: 5 }),
      /Maximum expression depth exceeded \(5\)/
    );
  });

  it('should use default maxDepth of 100', () => {
    // 50 levels should work with default maxDepth
    const expr = '('.repeat(50) + '1' + ')'.repeat(50);
    const ast = parse(expr);
    assert.strictEqual(ast.type, 'literal');
  });
});

describe('Parser - Array Literals', () => {
  it('should parse empty array', () => {
    const ast = parse('[]');
    assert.deepStrictEqual(ast, {
      type: 'array',
      elements: []
    });
  });

  it('should parse array with single element', () => {
    const ast = parse('[1]');
    assert.deepStrictEqual(ast, {
      type: 'array',
      elements: [{ type: 'literal', value: 1 }]
    });
  });

  it('should parse array with multiple integers', () => {
    const ast = parse('[1, 2, 3]');
    assert.deepStrictEqual(ast, {
      type: 'array',
      elements: [
        { type: 'literal', value: 1 },
        { type: 'literal', value: 2 },
        { type: 'literal', value: 3 }
      ]
    });
  });

  it('should parse array with strings', () => {
    const ast = parse("['a', 'b', 'c']");
    assert.deepStrictEqual(ast, {
      type: 'array',
      elements: [
        { type: 'string', value: 'a' },
        { type: 'string', value: 'b' },
        { type: 'string', value: 'c' }
      ]
    });
  });

  it('should parse heterogeneous array', () => {
    const ast = parse("[1, 'two', true, null]");
    assert.deepStrictEqual(ast, {
      type: 'array',
      elements: [
        { type: 'literal', value: 1 },
        { type: 'string', value: 'two' },
        { type: 'literal', value: true },
        { type: 'null' }
      ]
    });
  });

  it('should parse nested arrays', () => {
    const ast = parse('[[1, 2], [3, 4]]');
    assert.deepStrictEqual(ast, {
      type: 'array',
      elements: [
        { type: 'array', elements: [{ type: 'literal', value: 1 }, { type: 'literal', value: 2 }] },
        { type: 'array', elements: [{ type: 'literal', value: 3 }, { type: 'literal', value: 4 }] }
      ]
    });
  });

  it('should parse array with expressions', () => {
    const ast = parse('[1 + 2, 3 * 4]');
    assert.strictEqual(ast.type, 'array');
    if (ast.type === 'array') {
      assert.strictEqual(ast.elements.length, 2);
      assert.strictEqual(ast.elements[0].type, 'binary');
      assert.strictEqual(ast.elements[1].type, 'binary');
    }
  });

  it('should parse array in let binding', () => {
    const ast = parse('let items = [1, 2, 3] in items');
    assert.strictEqual(ast.type, 'let');
    if (ast.type === 'let') {
      assert.strictEqual(ast.bindings[0].name, 'items');
      assert.strictEqual(ast.bindings[0].value.type, 'array');
    }
  });

  it('should parse array with object elements', () => {
    const ast = parse('[{a: 1}, {b: 2}]');
    assert.strictEqual(ast.type, 'array');
    if (ast.type === 'array') {
      assert.strictEqual(ast.elements.length, 2);
      assert.strictEqual(ast.elements[0].type, 'object');
      assert.strictEqual(ast.elements[1].type, 'object');
    }
  });
});

describe('Parser - DataPath Literals', () => {
  it('should parse simple datapath with one segment', () => {
    const ast = parse('.x');
    assert.deepStrictEqual(ast, {
      type: 'datapath',
      segments: ['x']
    });
  });

  it('should parse datapath with multiple segments', () => {
    const ast = parse('.x.y.z');
    assert.deepStrictEqual(ast, {
      type: 'datapath',
      segments: ['x', 'y', 'z']
    });
  });

  it('should parse datapath with numeric segments', () => {
    const ast = parse('.items.0.name');
    assert.deepStrictEqual(ast, {
      type: 'datapath',
      segments: ['items', 0, 'name']
    });
  });

  it('should parse datapath with only numeric segments', () => {
    const ast = parse('.0.1.2');
    assert.deepStrictEqual(ast, {
      type: 'datapath',
      segments: [0, 1, 2]
    });
  });

  it('should parse datapath in function call', () => {
    const ast = parse('fetch(data, .name)');
    assert.strictEqual(ast.type, 'function_call');
    if (ast.type === 'function_call') {
      assert.strictEqual(ast.name, 'fetch');
      assert.strictEqual(ast.args.length, 2);
      assert.deepStrictEqual(ast.args[1], {
        type: 'datapath',
        segments: ['name']
      });
    }
  });

  it('should parse datapath in pipe expression', () => {
    const ast = parse('x |> fetch(.a.b)');
    assert.strictEqual(ast.type, 'function_call');
    if (ast.type === 'function_call') {
      assert.strictEqual(ast.name, 'fetch');
      assert.strictEqual(ast.args.length, 2);
      assert.deepStrictEqual(ast.args[1], {
        type: 'datapath',
        segments: ['a', 'b']
      });
    }
  });

  it('should throw error for datapath without segments', () => {
    assert.throws(() => parse('. '), /Expected identifier or number/);
  });

  it('should throw error for datapath ending with dot', () => {
    assert.throws(() => parse('.x.'), /Expected identifier or number/);
  });
});

describe('Parser - Type Schema Optional Commas', () => {
  it('should parse type schema with commas', () => {
    const ast = parse('let T = { name: String, age: Int } in x |> T');
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.typeExpr.kind, 'type_schema');
      if (ast.typeExpr.kind === 'type_schema') {
        assert.strictEqual(ast.typeExpr.properties.length, 2);
        assert.strictEqual(ast.typeExpr.properties[0].key, 'name');
        assert.strictEqual(ast.typeExpr.properties[1].key, 'age');
      }
    }
  });

  it('should parse type schema without commas (Finitio style)', () => {
    const ast = parse('let T = { name: String age: Int } in x |> T');
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.typeExpr.kind, 'type_schema');
      if (ast.typeExpr.kind === 'type_schema') {
        assert.strictEqual(ast.typeExpr.properties.length, 2);
        assert.strictEqual(ast.typeExpr.properties[0].key, 'name');
        assert.strictEqual(ast.typeExpr.properties[1].key, 'age');
      }
    }
  });

  it('should parse type schema with mixed comma usage', () => {
    const ast = parse('let T = { a: Int, b: String c: Bool } in x |> T');
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.typeExpr.kind, 'type_schema');
      if (ast.typeExpr.kind === 'type_schema') {
        assert.strictEqual(ast.typeExpr.properties.length, 3);
        assert.strictEqual(ast.typeExpr.properties[0].key, 'a');
        assert.strictEqual(ast.typeExpr.properties[1].key, 'b');
        assert.strictEqual(ast.typeExpr.properties[2].key, 'c');
      }
    }
  });

  it('should parse type schema with spread and no comma', () => {
    const ast = parse('let T = { name: String ... } in x |> T');
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.typeExpr.kind, 'type_schema');
      if (ast.typeExpr.kind === 'type_schema') {
        assert.strictEqual(ast.typeExpr.properties.length, 1);
        assert.strictEqual(ast.typeExpr.extras, 'ignored');
      }
    }
  });

  it('should parse type schema with typed spread and no comma', () => {
    const ast = parse('let T = { name: String ...: Int } in x |> T');
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.typeExpr.kind, 'type_schema');
      if (ast.typeExpr.kind === 'type_schema') {
        assert.strictEqual(ast.typeExpr.properties.length, 1);
        assert.strictEqual((ast.typeExpr.extras as any).kind, 'type_ref');
      }
    }
  });
});

describe('Parser - Subtype Constraints with Labels', () => {
  it('should parse single unlabeled constraint', () => {
    const ast = parse('let T = Int(i | i > 0) in x |> T');
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.typeExpr.kind, 'subtype_constraint');
      if (ast.typeExpr.kind === 'subtype_constraint') {
        assert.strictEqual(ast.typeExpr.variable, 'i');
        assert.strictEqual(ast.typeExpr.constraints.length, 1);
        assert.strictEqual(ast.typeExpr.constraints[0].label, undefined);
        assert.strictEqual(ast.typeExpr.constraints[0].condition.type, 'binary');
      }
    }
  });

  it('should parse single labeled constraint with identifier', () => {
    const ast = parse('let T = Int(i | positive: i > 0) in x |> T');
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.typeExpr.kind, 'subtype_constraint');
      if (ast.typeExpr.kind === 'subtype_constraint') {
        assert.strictEqual(ast.typeExpr.variable, 'i');
        assert.strictEqual(ast.typeExpr.constraints.length, 1);
        assert.strictEqual(ast.typeExpr.constraints[0].label, 'positive');
        assert.strictEqual(ast.typeExpr.constraints[0].condition.type, 'binary');
      }
    }
  });

  it('should parse single labeled constraint with string message', () => {
    const ast = parse("let T = Int(i | 'must be positive': i > 0) in x |> T");
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.typeExpr.kind, 'subtype_constraint');
      if (ast.typeExpr.kind === 'subtype_constraint') {
        assert.strictEqual(ast.typeExpr.variable, 'i');
        assert.strictEqual(ast.typeExpr.constraints.length, 1);
        assert.strictEqual(ast.typeExpr.constraints[0].label, 'must be positive');
        assert.strictEqual(ast.typeExpr.constraints[0].condition.type, 'binary');
      }
    }
  });

  it('should parse multiple labeled constraints', () => {
    const ast = parse('let T = Int(i | positive: i > 0, even: i % 2 == 0) in x |> T');
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.typeExpr.kind, 'subtype_constraint');
      if (ast.typeExpr.kind === 'subtype_constraint') {
        assert.strictEqual(ast.typeExpr.variable, 'i');
        assert.strictEqual(ast.typeExpr.constraints.length, 2);
        assert.strictEqual(ast.typeExpr.constraints[0].label, 'positive');
        assert.strictEqual(ast.typeExpr.constraints[1].label, 'even');
      }
    }
  });

  it('should parse mixed labeled and unlabeled constraints', () => {
    const ast = parse('let T = Int(i | i > 0, even: i % 2 == 0) in x |> T');
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.typeExpr.kind, 'subtype_constraint');
      if (ast.typeExpr.kind === 'subtype_constraint') {
        assert.strictEqual(ast.typeExpr.variable, 'i');
        assert.strictEqual(ast.typeExpr.constraints.length, 2);
        assert.strictEqual(ast.typeExpr.constraints[0].label, undefined);
        assert.strictEqual(ast.typeExpr.constraints[1].label, 'even');
      }
    }
  });

  it('should parse constraint with string and identifier labels mixed', () => {
    const ast = parse("let T = Int(i | positive: i > 0, 'must be even': i % 2 == 0) in x |> T");
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.typeExpr.kind, 'subtype_constraint');
      if (ast.typeExpr.kind === 'subtype_constraint') {
        assert.strictEqual(ast.typeExpr.constraints.length, 2);
        assert.strictEqual(ast.typeExpr.constraints[0].label, 'positive');
        assert.strictEqual(ast.typeExpr.constraints[1].label, 'must be even');
      }
    }
  });
});

describe('Parser - Guard expressions', () => {
  it('should parse basic guard expression', () => {
    const ast = parse('guard x > 0 in x * 2');
    assert.strictEqual(ast.type, 'guard');
    if (ast.type === 'guard') {
      assert.strictEqual(ast.guardType, 'guard');
      assert.strictEqual(ast.constraints.length, 1);
      assert.strictEqual(ast.constraints[0].label, undefined);
      assert.strictEqual(ast.body.type, 'binary');
    }
  });

  it('should parse guard with labeled constraint', () => {
    const ast = parse('guard positive: x > 0 in x * 2');
    assert.strictEqual(ast.type, 'guard');
    if (ast.type === 'guard') {
      assert.strictEqual(ast.constraints.length, 1);
      assert.strictEqual(ast.constraints[0].label, 'positive');
    }
  });

  it('should parse guard with string message', () => {
    const ast = parse("guard 'must be positive': x > 0 in x * 2");
    assert.strictEqual(ast.type, 'guard');
    if (ast.type === 'guard') {
      assert.strictEqual(ast.constraints.length, 1);
      assert.strictEqual(ast.constraints[0].label, 'must be positive');
    }
  });

  it('should parse guard with multiple constraints', () => {
    const ast = parse('guard positive: x > 0, even: x % 2 == 0 in x');
    assert.strictEqual(ast.type, 'guard');
    if (ast.type === 'guard') {
      assert.strictEqual(ast.constraints.length, 2);
      assert.strictEqual(ast.constraints[0].label, 'positive');
      assert.strictEqual(ast.constraints[1].label, 'even');
    }
  });

  it('should parse check expression (synonym for guard)', () => {
    const ast = parse('check x > 0 in x');
    assert.strictEqual(ast.type, 'guard');
    if (ast.type === 'guard') {
      assert.strictEqual(ast.guardType, 'check');
      assert.strictEqual(ast.constraints.length, 1);
    }
  });

  it('should parse let...guard sugar', () => {
    const ast = parse('let x = 5 guard x > 0 in x * 2');
    assert.strictEqual(ast.type, 'let');
    if (ast.type === 'let') {
      assert.strictEqual(ast.body.type, 'guard');
    }
  });

  it('should parse guard...check sugar', () => {
    const ast = parse('guard x > 0 check x < 100 in x');
    assert.strictEqual(ast.type, 'guard');
    if (ast.type === 'guard') {
      assert.strictEqual(ast.guardType, 'guard');
      assert.strictEqual(ast.body.type, 'guard');
      if (ast.body.type === 'guard') {
        assert.strictEqual(ast.body.guardType, 'check');
      }
    }
  });

  it('should parse let...guard...check sugar', () => {
    const ast = parse('let x = 5 guard x > 0 check x < 100 in x * 2');
    assert.strictEqual(ast.type, 'let');
    if (ast.type === 'let') {
      assert.strictEqual(ast.body.type, 'guard');
      if (ast.body.type === 'guard') {
        assert.strictEqual(ast.body.body.type, 'guard');
        if (ast.body.body.type === 'guard') {
          assert.strictEqual(ast.body.body.guardType, 'check');
        }
      }
    }
  });

  it('should parse pipe-style guard', () => {
    const ast = parse('guard(x | x > 0)');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.deepStrictEqual(ast.params, ['x']);
      assert.strictEqual(ast.body.type, 'guard');
    }
  });

  it('should parse pipe-style guard with label', () => {
    const ast = parse('guard(x | positive: x > 0)');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.strictEqual(ast.body.type, 'guard');
      if (ast.body.type === 'guard') {
        assert.strictEqual(ast.body.constraints[0].label, 'positive');
      }
    }
  });

  it('should parse pipe-style guard with multiple constraints', () => {
    const ast = parse('guard(x | positive: x > 0, small: x < 100)');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.strictEqual(ast.body.type, 'guard');
      if (ast.body.type === 'guard') {
        assert.strictEqual(ast.body.constraints.length, 2);
        assert.strictEqual(ast.body.constraints[0].label, 'positive');
        assert.strictEqual(ast.body.constraints[1].label, 'small');
      }
    }
  });

  it('should parse pipe-style check', () => {
    const ast = parse('check(x | x > 0)');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.strictEqual(ast.body.type, 'guard');
      if (ast.body.type === 'guard') {
        assert.strictEqual(ast.body.guardType, 'check');
      }
    }
  });

  it('should parse guard in pipe chain', () => {
    const ast = parse('[1, 2, 3] |> guard(x | size(x) > 0)');
    // Pipe desugars to apply: (fn(x ~> guard ... in x))([1, 2, 3])
    assert.strictEqual(ast.type, 'apply');
    if (ast.type === 'apply') {
      assert.strictEqual(ast.fn.type, 'lambda');
      assert.strictEqual(ast.args.length, 1);
      assert.strictEqual(ast.args[0].type, 'array');
    }
  });
});

describe('Parser - Trailing Commas', () => {
  it('should parse array with trailing comma', () => {
    const ast = parse('[1, 2, 3,]');
    assert.deepStrictEqual(ast, {
      type: 'array',
      elements: [
        { type: 'literal', value: 1 },
        { type: 'literal', value: 2 },
        { type: 'literal', value: 3 }
      ]
    });
  });

  it('should parse array with single element and trailing comma', () => {
    const ast = parse('[1,]');
    assert.deepStrictEqual(ast, {
      type: 'array',
      elements: [{ type: 'literal', value: 1 }]
    });
  });

  it('should parse object with trailing comma', () => {
    const ast = parse('{a: 1, b: 2,}');
    assert.strictEqual(ast.type, 'object');
    if (ast.type === 'object') {
      assert.strictEqual(ast.properties.length, 2);
      assert.strictEqual(ast.properties[0].key, 'a');
      assert.strictEqual(ast.properties[1].key, 'b');
    }
  });

  it('should parse object with single property and trailing comma', () => {
    const ast = parse('{a: 1,}');
    assert.strictEqual(ast.type, 'object');
    if (ast.type === 'object') {
      assert.strictEqual(ast.properties.length, 1);
      assert.strictEqual(ast.properties[0].key, 'a');
    }
  });

  it('should parse type schema with trailing comma', () => {
    const ast = parse('let T = { name: String, age: Int, } in x |> T');
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.typeExpr.kind, 'type_schema');
      if (ast.typeExpr.kind === 'type_schema') {
        assert.strictEqual(ast.typeExpr.properties.length, 2);
      }
    }
  });

  it('should parse let with trailing comma', () => {
    const ast = parse('let x = 2, y = 3, in x * y');
    assert.strictEqual(ast.type, 'let');
    if (ast.type === 'let') {
      assert.strictEqual(ast.bindings.length, 1);
      assert.strictEqual(ast.bindings[0].name, 'x');
      assert.strictEqual(ast.body.type, 'let');
    }
  });

  it('should parse let with single binding and trailing comma', () => {
    const ast = parse('let x = 2, in x * 2');
    assert.strictEqual(ast.type, 'let');
    if (ast.type === 'let') {
      assert.strictEqual(ast.bindings.length, 1);
      assert.strictEqual(ast.bindings[0].name, 'x');
      assert.strictEqual(ast.body.type, 'binary');
    }
  });

  it('should parse guard with trailing comma', () => {
    const ast = parse('guard x > 0, y > 0, in x + y');
    assert.strictEqual(ast.type, 'guard');
    if (ast.type === 'guard') {
      assert.strictEqual(ast.constraints.length, 2);
    }
  });

  it('should parse pipe guard with trailing comma', () => {
    const ast = parse('guard(x | x > 0, x < 100,)');
    assert.strictEqual(ast.type, 'lambda');
    if (ast.type === 'lambda') {
      assert.strictEqual(ast.body.type, 'guard');
      if (ast.body.type === 'guard') {
        assert.strictEqual(ast.body.constraints.length, 2);
      }
    }
  });

  it('should parse subtype constraint with trailing comma', () => {
    const ast = parse('let T = Int(i | i > 0, i < 100,) in x |> T');
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.typeExpr.kind, 'subtype_constraint');
      if (ast.typeExpr.kind === 'subtype_constraint') {
        assert.strictEqual(ast.typeExpr.constraints.length, 2);
      }
    }
  });

  it('should parse type definition with trailing comma', () => {
    const ast = parse('let T = String, in x |> T');
    assert.strictEqual(ast.type, 'typedef');
    if (ast.type === 'typedef') {
      assert.strictEqual(ast.name, 'T');
      assert.strictEqual(ast.typeExpr.kind, 'type_ref');
    }
  });
});
