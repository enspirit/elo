import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileToRuby } from '../../../src/compilers/ruby';
import { literal, stringLiteral, variable, binary, unary, letExpr } from '../../../src/ast';

/**
 * Helper to wrap code as a lambda taking _ as input
 */
function wrapRuby(code: string): string {
  return `->(_) { ${code} }`;
}

describe('Ruby Compiler - Literals', () => {
  it('should compile numeric literals', () => {
    assert.strictEqual(compileToRuby(literal(42)), wrapRuby('42'));
    assert.strictEqual(compileToRuby(literal(3.14)), wrapRuby('3.14'));
    assert.strictEqual(compileToRuby(literal(0)), wrapRuby('0'));
  });

  it('should compile boolean literals', () => {
    assert.strictEqual(compileToRuby(literal(true)), wrapRuby('true'));
    assert.strictEqual(compileToRuby(literal(false)), wrapRuby('false'));
  });
});

describe('Ruby Compiler - String Literals', () => {
  it('should compile simple string', () => {
    assert.strictEqual(compileToRuby(stringLiteral('hello')), wrapRuby('"hello"'));
  });

  it('should compile string with spaces', () => {
    assert.strictEqual(compileToRuby(stringLiteral('hello world')), wrapRuby('"hello world"'));
  });

  it('should compile empty string', () => {
    assert.strictEqual(compileToRuby(stringLiteral('')), wrapRuby('""'));
  });

  it('should escape double quotes in output', () => {
    assert.strictEqual(compileToRuby(stringLiteral('say "hi"')), wrapRuby('"say \\"hi\\""'));
  });

  it('should escape backslashes in output', () => {
    assert.strictEqual(compileToRuby(stringLiteral('a\\b')), wrapRuby('"a\\\\b"'));
  });
});

describe('Ruby Compiler - Variables', () => {
  it('should compile variables', () => {
    assert.strictEqual(compileToRuby(variable('x')), wrapRuby('x'));
    assert.strictEqual(compileToRuby(variable('price')), wrapRuby('price'));
    assert.strictEqual(compileToRuby(variable('user_name')), wrapRuby('user_name'));
  });
});

describe('Ruby Compiler - Arithmetic Operators', () => {
  it('should compile addition', () => {
    const ast = binary('+', literal(1), literal(2));
    assert.strictEqual(compileToRuby(ast), wrapRuby('1 + 2'));
  });

  it('should compile subtraction', () => {
    const ast = binary('-', literal(5), literal(3));
    assert.strictEqual(compileToRuby(ast), wrapRuby('5 - 3'));
  });

  it('should compile multiplication', () => {
    const ast = binary('*', literal(4), literal(3));
    assert.strictEqual(compileToRuby(ast), wrapRuby('4 * 3'));
  });

  it('should compile division', () => {
    const ast = binary('/', literal(10), literal(2));
    assert.strictEqual(compileToRuby(ast), wrapRuby('10 / 2'));
  });

  it('should compile modulo', () => {
    const ast = binary('%', literal(10), literal(3));
    assert.strictEqual(compileToRuby(ast), wrapRuby('10 % 3'));
  });

  it('should compile power to **', () => {
    const ast = binary('^', literal(2), literal(3));
    assert.strictEqual(compileToRuby(ast), wrapRuby('2 ** 3'));
  });
});

describe('Ruby Compiler - Comparison Operators', () => {
  it('should compile less than', () => {
    const ast = binary('<', variable('x'), literal(10));
    assert.strictEqual(compileToRuby(ast), wrapRuby('x < 10'));
  });

  it('should compile greater than', () => {
    const ast = binary('>', variable('x'), literal(10));
    assert.strictEqual(compileToRuby(ast), wrapRuby('x > 10'));
  });

  it('should compile less than or equal', () => {
    const ast = binary('<=', variable('x'), literal(10));
    assert.strictEqual(compileToRuby(ast), wrapRuby('x <= 10'));
  });

  it('should compile greater than or equal', () => {
    const ast = binary('>=', variable('x'), literal(10));
    assert.strictEqual(compileToRuby(ast), wrapRuby('x >= 10'));
  });

  it('should compile equality', () => {
    const ast = binary('==', variable('x'), literal(10));
    assert.strictEqual(compileToRuby(ast), wrapRuby('x == 10'));
  });

  it('should compile inequality', () => {
    const ast = binary('!=', variable('x'), literal(10));
    assert.strictEqual(compileToRuby(ast), wrapRuby('x != 10'));
  });
});

describe('Ruby Compiler - Logical Operators', () => {
  it('should compile AND', () => {
    const ast = binary('&&', literal(true), literal(false));
    assert.strictEqual(compileToRuby(ast), wrapRuby('true && false'));
  });

  it('should compile OR', () => {
    const ast = binary('||', literal(true), literal(false));
    assert.strictEqual(compileToRuby(ast), wrapRuby('true || false'));
  });

  it('should compile NOT', () => {
    const ast = unary('!', variable('active'));
    assert.strictEqual(compileToRuby(ast), wrapRuby('!active'));
  });
});

describe('Ruby Compiler - Unary Operators', () => {
  it('should compile unary minus', () => {
    const ast = unary('-', literal(5));
    assert.strictEqual(compileToRuby(ast), wrapRuby('-5'));
  });

  it('should compile unary plus', () => {
    const ast = unary('+', literal(5));
    assert.strictEqual(compileToRuby(ast), wrapRuby('+5'));
  });

  it('should compile negated variable', () => {
    const ast = unary('-', variable('x'));
    assert.strictEqual(compileToRuby(ast), wrapRuby('-x'));
  });
});

describe('Ruby Compiler - Operator Precedence', () => {
  it('should handle multiplication before addition', () => {
    const ast = binary('+', literal(2), binary('*', literal(3), literal(4)));
    assert.strictEqual(compileToRuby(ast), wrapRuby('2 + 3 * 4'));
  });

  it('should add parentheses when needed for addition in multiplication', () => {
    const ast = binary('*', binary('+', literal(2), literal(3)), literal(4));
    assert.strictEqual(compileToRuby(ast), wrapRuby('(2 + 3) * 4'));
  });

  it('should handle right-associative subtraction', () => {
    const ast = binary('-', literal(10), binary('-', literal(5), literal(2)));
    assert.strictEqual(compileToRuby(ast), wrapRuby('10 - (5 - 2)'));
  });

  it('should handle right-associative division', () => {
    const ast = binary('/', literal(20), binary('/', literal(10), literal(2)));
    assert.strictEqual(compileToRuby(ast), wrapRuby('20 / (10 / 2)'));
  });

  it('should handle power precedence', () => {
    const ast = binary('+', binary('^', literal(2), literal(3)), literal(1));
    assert.strictEqual(compileToRuby(ast), wrapRuby('2 ** 3 + 1'));
  });
});

describe('Ruby Compiler - Complex Expressions', () => {
  it('should compile (a + b) * c', () => {
    const ast = binary(
      '*',
      binary('+', variable('a'), variable('b')),
      variable('c')
    );
    assert.strictEqual(compileToRuby(ast), wrapRuby('(a + b) * c'));
  });

  it('should compile price * quantity - discount', () => {
    const ast = binary(
      '-',
      binary('*', variable('price'), variable('quantity')),
      variable('discount')
    );
    assert.strictEqual(compileToRuby(ast), wrapRuby('price * quantity - discount'));
  });

  it('should compile x > 0 && x < 100', () => {
    const ast = binary(
      '&&',
      binary('>', variable('x'), literal(0)),
      binary('<', variable('x'), literal(100))
    );
    assert.strictEqual(compileToRuby(ast), wrapRuby('x > 0 && x < 100'));
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
    assert.strictEqual(compileToRuby(ast), wrapRuby('(x + 5) * (y - 3) / 2'));
  });

  it('should compile complex boolean with parentheses', () => {
    const ast = binary(
      '||',
      binary(
        '&&',
        binary('>', variable('price'), literal(100)),
        binary('>=', variable('discount'), literal(10))
      ),
      binary('==', variable('vip'), literal(true))
    );
    assert.strictEqual(compileToRuby(ast), wrapRuby('price > 100 && discount >= 10 || vip == true'));
  });

  it('should compile mixed arithmetic and boolean', () => {
    const ast = binary(
      '>',
      binary('*', variable('total'), literal(1.1)),
      literal(1000)
    );
    assert.strictEqual(compileToRuby(ast), wrapRuby('total * 1.1 > 1000'));
  });
});

describe('Ruby Compiler - Edge Cases', () => {
  it('should handle deeply nested expressions', () => {
    const ast = binary(
      '+',
      binary(
        '*',
        binary('+', literal(1), literal(2)),
        literal(3)
      ),
      literal(4)
    );
    assert.strictEqual(compileToRuby(ast), wrapRuby('(1 + 2) * 3 + 4'));
  });

  it('should handle multiple unary operators', () => {
    const ast = unary('-', unary('-', literal(5)));
    assert.strictEqual(compileToRuby(ast), wrapRuby('--5'));
  });

  it('should handle unary with binary', () => {
    const ast = binary('+', unary('-', variable('x')), literal(10));
    assert.strictEqual(compileToRuby(ast), wrapRuby('-x + 10'));
  });
});

describe('Ruby Compiler - Let Expressions', () => {
  it('should compile simple let expression', () => {
    const ast = letExpr([{ name: 'x', value: literal(1) }], variable('x'));
    assert.strictEqual(compileToRuby(ast), wrapRuby('(x = 1; x)'));
  });

  it('should compile let with multiple bindings (desugared to nested)', () => {
    // Multiple bindings are desugared to nested let expressions
    const ast = letExpr(
      [{ name: 'x', value: literal(1) }, { name: 'y', value: literal(2) }],
      binary('+', variable('x'), variable('y'))
    );
    assert.strictEqual(compileToRuby(ast), wrapRuby('(x = 1; y = 2; x + y)'));
  });

  it('should compile nested let expressions', () => {
    const ast = letExpr(
      [{ name: 'x', value: literal(1) }],
      letExpr([{ name: 'y', value: literal(2) }], binary('+', variable('x'), variable('y')))
    );
    assert.strictEqual(
      compileToRuby(ast),
      wrapRuby('(x = 1; y = 2; x + y)')
    );
  });

  it('should compile let with complex binding value', () => {
    const ast = letExpr(
      [{ name: 'x', value: binary('+', literal(1), literal(2)) }],
      binary('*', variable('x'), literal(3))
    );
    assert.strictEqual(compileToRuby(ast), wrapRuby('(x = 1 + 2; x * 3)'));
  });
});
