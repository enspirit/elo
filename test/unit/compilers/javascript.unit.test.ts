import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileToJavaScript } from '../../../src/compilers/javascript';
import { literal, stringLiteral, variable, binary, unary, letExpr } from '../../../src/ast';

describe('JavaScript Compiler - Literals', () => {
  it('should compile numeric literals', () => {
    assert.strictEqual(compileToJavaScript(literal(42)), '42');
    assert.strictEqual(compileToJavaScript(literal(3.14)), '3.14');
    assert.strictEqual(compileToJavaScript(literal(0)), '0');
  });

  it('should compile boolean literals', () => {
    assert.strictEqual(compileToJavaScript(literal(true)), 'true');
    assert.strictEqual(compileToJavaScript(literal(false)), 'false');
  });
});

describe('JavaScript Compiler - String Literals', () => {
  it('should compile simple string', () => {
    assert.strictEqual(compileToJavaScript(stringLiteral('hello')), '"hello"');
  });

  it('should compile string with spaces', () => {
    assert.strictEqual(compileToJavaScript(stringLiteral('hello world')), '"hello world"');
  });

  it('should compile empty string', () => {
    assert.strictEqual(compileToJavaScript(stringLiteral('')), '""');
  });

  it('should escape double quotes in output', () => {
    assert.strictEqual(compileToJavaScript(stringLiteral('say "hi"')), '"say \\"hi\\""');
  });

  it('should escape backslashes in output', () => {
    assert.strictEqual(compileToJavaScript(stringLiteral('a\\b')), '"a\\\\b"');
  });
});

describe('JavaScript Compiler - Variables', () => {
  it('should compile variables', () => {
    assert.strictEqual(compileToJavaScript(variable('x')), 'x');
    assert.strictEqual(compileToJavaScript(variable('price')), 'price');
    assert.strictEqual(compileToJavaScript(variable('userName')), 'userName');
  });
});

describe('JavaScript Compiler - Arithmetic Operators', () => {
  it('should compile addition', () => {
    const ast = binary('+', literal(1), literal(2));
    assert.strictEqual(compileToJavaScript(ast), 'klang.add(1, 2)');
  });

  it('should compile subtraction', () => {
    const ast = binary('-', literal(5), literal(3));
    assert.strictEqual(compileToJavaScript(ast), 'klang.subtract(5, 3)');
  });

  it('should compile multiplication', () => {
    const ast = binary('*', literal(4), literal(3));
    assert.strictEqual(compileToJavaScript(ast), 'klang.multiply(4, 3)');
  });

  it('should compile division', () => {
    const ast = binary('/', literal(10), literal(2));
    assert.strictEqual(compileToJavaScript(ast), 'klang.divide(10, 2)');
  });

  it('should compile modulo', () => {
    const ast = binary('%', literal(10), literal(3));
    assert.strictEqual(compileToJavaScript(ast), 'klang.modulo(10, 3)');
  });

  it('should compile power to klang.power()', () => {
    const ast = binary('^', literal(2), literal(3));
    assert.strictEqual(compileToJavaScript(ast), 'klang.power(2, 3)');
  });

  it('should compile power with variables', () => {
    const ast = binary('^', variable('x'), variable('y'));
    assert.strictEqual(compileToJavaScript(ast), 'klang.power(x, y)');
  });

  it('should compile power with expressions', () => {
    const ast = binary(
      '^',
      binary('+', literal(1), literal(2)),
      literal(3)
    );
    assert.strictEqual(compileToJavaScript(ast), 'klang.power(klang.add(1, 2), 3)');
  });
});

describe('JavaScript Compiler - Comparison Operators', () => {
  it('should compile less than', () => {
    const ast = binary('<', variable('x'), literal(10));
    assert.strictEqual(compileToJavaScript(ast), 'x < 10');
  });

  it('should compile greater than', () => {
    const ast = binary('>', variable('x'), literal(10));
    assert.strictEqual(compileToJavaScript(ast), 'x > 10');
  });

  it('should compile less than or equal', () => {
    const ast = binary('<=', variable('x'), literal(10));
    assert.strictEqual(compileToJavaScript(ast), 'x <= 10');
  });

  it('should compile greater than or equal', () => {
    const ast = binary('>=', variable('x'), literal(10));
    assert.strictEqual(compileToJavaScript(ast), 'x >= 10');
  });

  it('should compile equality', () => {
    const ast = binary('==', variable('x'), literal(10));
    assert.strictEqual(compileToJavaScript(ast), 'x == 10');
  });

  it('should compile inequality', () => {
    const ast = binary('!=', variable('x'), literal(10));
    assert.strictEqual(compileToJavaScript(ast), 'x != 10');
  });
});

describe('JavaScript Compiler - Logical Operators', () => {
  it('should compile AND', () => {
    const ast = binary('&&', literal(true), literal(false));
    assert.strictEqual(compileToJavaScript(ast), 'true && false');
  });

  it('should compile OR', () => {
    const ast = binary('||', literal(true), literal(false));
    assert.strictEqual(compileToJavaScript(ast), 'true || false');
  });

  it('should compile NOT', () => {
    const ast = unary('!', variable('active'));
    assert.strictEqual(compileToJavaScript(ast), '!active');
  });
});

describe('JavaScript Compiler - Unary Operators', () => {
  it('should compile unary minus', () => {
    const ast = unary('-', literal(5));
    assert.strictEqual(compileToJavaScript(ast), '-5');
  });

  it('should compile unary plus', () => {
    const ast = unary('+', literal(5));
    assert.strictEqual(compileToJavaScript(ast), '+5');
  });

  it('should compile negated variable', () => {
    const ast = unary('-', variable('x'));
    assert.strictEqual(compileToJavaScript(ast), '-x');
  });
});

describe('JavaScript Compiler - Operator Precedence', () => {
  it('should handle multiplication before addition', () => {
    const ast = binary('+', literal(2), binary('*', literal(3), literal(4)));
    assert.strictEqual(compileToJavaScript(ast), 'klang.add(2, klang.multiply(3, 4))');
  });

  it('should add parentheses when needed', () => {
    const ast = binary('*', binary('+', literal(2), literal(3)), literal(4));
    // All arithmetic uses klang helpers - no parens needed since function calls have higher precedence
    assert.strictEqual(compileToJavaScript(ast), 'klang.multiply(klang.add(2, 3), 4)');
  });

  it('should handle power with addition', () => {
    const ast = binary('+', binary('^', literal(2), literal(3)), literal(1));
    assert.strictEqual(compileToJavaScript(ast), 'klang.add(klang.power(2, 3), 1)');
  });

  it('should handle complex power expression', () => {
    const ast = binary('*', literal(2), binary('^', literal(3), literal(4)));
    assert.strictEqual(compileToJavaScript(ast), 'klang.multiply(2, klang.power(3, 4))');
  });
});

describe('JavaScript Compiler - Complex Expressions', () => {
  it('should compile (a + b) * c', () => {
    const ast = binary(
      '*',
      binary('+', variable('a'), variable('b')),
      variable('c')
    );
    assert.strictEqual(compileToJavaScript(ast), 'klang.multiply(klang.add(a, b), c)');
  });

  it('should compile price * quantity - discount', () => {
    const ast = binary(
      '-',
      binary('*', variable('price'), variable('quantity')),
      variable('discount')
    );
    assert.strictEqual(compileToJavaScript(ast), 'klang.subtract(klang.multiply(price, quantity), discount)');
  });

  it('should compile x > 0 && x < 100', () => {
    const ast = binary(
      '&&',
      binary('>', variable('x'), literal(0)),
      binary('<', variable('x'), literal(100))
    );
    assert.strictEqual(compileToJavaScript(ast), 'x > 0 && x < 100');
  });

  it('should compile (x + 5) * (y - 3) / 2', () => {
    const ast = binary(
      '/',
      binary(
        '*',
        binary('+', variable('x'), literal(5)),
        binary('-', variable('y'), literal(3))
      ),
      literal(2)
    );
    assert.strictEqual(compileToJavaScript(ast), 'klang.divide(klang.multiply(klang.add(x, 5), klang.subtract(y, 3)), 2)');
  });

  it('should compile mixed arithmetic and boolean', () => {
    const ast = binary(
      '>',
      binary('*', variable('total'), literal(1.1)),
      literal(1000)
    );
    assert.strictEqual(compileToJavaScript(ast), 'klang.multiply(total, 1.1) > 1000');
  });
});

describe('JavaScript Compiler - Edge Cases', () => {
  it('should handle nested klang.power calls', () => {
    const ast = binary(
      '^',
      literal(2),
      binary('^', literal(3), literal(2))
    );
    assert.strictEqual(compileToJavaScript(ast), 'klang.power(2, klang.power(3, 2))');
  });

  it('should handle power in complex expression', () => {
    const ast = binary(
      '+',
      binary('*', literal(2), binary('^', literal(3), literal(2))),
      literal(1)
    );
    assert.strictEqual(compileToJavaScript(ast), 'klang.add(klang.multiply(2, klang.power(3, 2)), 1)');
  });

  it('should handle multiple unary operators', () => {
    const ast = unary('!', unary('!', variable('x')));
    assert.strictEqual(compileToJavaScript(ast), '!!x');
  });
});

describe('JavaScript Compiler - Date Arithmetic', () => {
  it('should compile date + duration using klang.add()', () => {
    const ast = binary('+', { type: 'date', value: '2024-01-15' }, { type: 'duration', value: 'P1D' });
    assert.strictEqual(compileToJavaScript(ast), "klang.add(dayjs('2024-01-15'), dayjs.duration('P1D'))");
  });

  it('should compile date - duration using klang.subtract()', () => {
    const ast = binary('-', { type: 'date', value: '2024-01-15' }, { type: 'duration', value: 'P1D' });
    assert.strictEqual(compileToJavaScript(ast), "klang.subtract(dayjs('2024-01-15'), dayjs.duration('P1D'))");
  });

  it('should compile duration + datetime (commutative)', () => {
    const ast = binary('+', { type: 'duration', value: 'PT2H' }, { type: 'datetime', value: '2024-01-15T10:00:00Z' });
    assert.strictEqual(compileToJavaScript(ast), "klang.add(dayjs.duration('PT2H'), dayjs('2024-01-15T10:00:00Z'))");
  });

  it('should compile datetime + duration', () => {
    const ast = binary('+', { type: 'datetime', value: '2024-01-15T10:00:00Z' }, { type: 'duration', value: 'PT1H30M' });
    assert.strictEqual(compileToJavaScript(ast), "klang.add(dayjs('2024-01-15T10:00:00Z'), dayjs.duration('PT1H30M'))");
  });
});

describe('JavaScript Compiler - Function Calls', () => {
  it('should compile assert with boolean condition', () => {
    const ast = { type: 'function_call' as const, name: 'assert', args: [{ type: 'literal' as const, value: true }] };
    assert.strictEqual(compileToJavaScript(ast), '(function() { if (!(true)) throw new Error("Assertion failed"); return true; })()');
  });

  it('should compile assert with comparison expression', () => {
    const ast = {
      type: 'function_call' as const,
      name: 'assert',
      args: [
        { type: 'binary' as const, operator: '>' as const, left: { type: 'literal' as const, value: 5 }, right: { type: 'literal' as const, value: 3 } }
      ]
    };
    assert.strictEqual(compileToJavaScript(ast), '(function() { if (!(5 > 3)) throw new Error("Assertion failed"); return true; })()');
  });

  it('should compile generic function call', () => {
    const ast = {
      type: 'function_call' as const,
      name: 'foo',
      args: [{ type: 'literal' as const, value: 42 }]
    };
    assert.strictEqual(compileToJavaScript(ast), 'foo(42)');
  });
});

describe('JavaScript Compiler - Let Expressions', () => {
  it('should compile simple let expression', () => {
    const ast = letExpr([{ name: 'x', value: literal(1) }], variable('x'));
    assert.strictEqual(compileToJavaScript(ast), '((x) => x)(1)');
  });

  it('should compile let with multiple bindings (desugared to nested)', () => {
    // Multiple bindings are desugared to nested let expressions
    const ast = letExpr(
      [{ name: 'x', value: literal(1) }, { name: 'y', value: literal(2) }],
      binary('+', variable('x'), variable('y'))
    );
    assert.strictEqual(compileToJavaScript(ast), '((x) => ((y) => klang.add(x, y))(2))(1)');
  });

  it('should compile nested let expressions', () => {
    const ast = letExpr(
      [{ name: 'x', value: literal(1) }],
      letExpr([{ name: 'y', value: literal(2) }], binary('+', variable('x'), variable('y')))
    );
    assert.strictEqual(
      compileToJavaScript(ast),
      '((x) => ((y) => klang.add(x, y))(2))(1)'
    );
  });

  it('should compile let with complex binding value', () => {
    const ast = letExpr(
      [{ name: 'x', value: binary('+', literal(1), literal(2)) }],
      binary('*', variable('x'), literal(3))
    );
    assert.strictEqual(compileToJavaScript(ast), '((x) => klang.multiply(x, 3))(klang.add(1, 2))');
  });
});
