import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileToJavaScript } from '../../../src/compilers/javascript';
import { literal, stringLiteral, variable, binary, unary, letExpr } from '../../../src/ast';
import { JS_HELPERS } from '../../../src/runtime';

/**
 * Helper to wrap code as a function taking _ as input
 */
function wrapJS(code: string): string {
  return `(function(_) { return ${code}; })`;
}

/**
 * Helper to create expected function output with required helpers
 * (helpers are sorted alphabetically, output is single-line for deterministic matching)
 */
function withHelpers(code: string, ...helpers: string[]): string {
  const helperDefs = [...helpers].sort().map(h => JS_HELPERS[h].replace(/\n\s*/g, ' ')).join(' ');
  return `(function(_) { ${helperDefs} return ${code}; })`;
}

describe('JavaScript Compiler - Literals', () => {
  it('should compile numeric literals', () => {
    assert.strictEqual(compileToJavaScript(literal(42)), wrapJS('42'));
    assert.strictEqual(compileToJavaScript(literal(3.14)), wrapJS('3.14'));
    assert.strictEqual(compileToJavaScript(literal(0)), wrapJS('0'));
  });

  it('should compile boolean literals', () => {
    assert.strictEqual(compileToJavaScript(literal(true)), wrapJS('true'));
    assert.strictEqual(compileToJavaScript(literal(false)), wrapJS('false'));
  });
});

describe('JavaScript Compiler - String Literals', () => {
  it('should compile simple string', () => {
    assert.strictEqual(compileToJavaScript(stringLiteral('hello')), wrapJS('"hello"'));
  });

  it('should compile string with spaces', () => {
    assert.strictEqual(compileToJavaScript(stringLiteral('hello world')), wrapJS('"hello world"'));
  });

  it('should compile empty string', () => {
    assert.strictEqual(compileToJavaScript(stringLiteral('')), wrapJS('""'));
  });

  it('should escape double quotes in output', () => {
    assert.strictEqual(compileToJavaScript(stringLiteral('say "hi"')), wrapJS('"say \\"hi\\""'));
  });

  it('should escape backslashes in output', () => {
    assert.strictEqual(compileToJavaScript(stringLiteral('a\\b')), wrapJS('"a\\\\b"'));
  });
});

describe('JavaScript Compiler - Variables', () => {
  it('should compile variables', () => {
    assert.strictEqual(compileToJavaScript(variable('x')), wrapJS('x'));
    assert.strictEqual(compileToJavaScript(variable('price')), wrapJS('price'));
    assert.strictEqual(compileToJavaScript(variable('userName')), wrapJS('userName'));
  });
});

describe('JavaScript Compiler - Arithmetic Operators (typed literals)', () => {
  it('should compile addition with native JS when types known', () => {
    const ast = binary('+', literal(1), literal(2));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('1 + 2'));
  });

  it('should compile subtraction with native JS when types known', () => {
    const ast = binary('-', literal(5), literal(3));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('5 - 3'));
  });

  it('should compile multiplication with native JS when types known', () => {
    const ast = binary('*', literal(4), literal(3));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('4 * 3'));
  });

  it('should compile division with native JS when types known', () => {
    const ast = binary('/', literal(10), literal(2));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('10 / 2'));
  });

  it('should compile modulo with native JS when types known', () => {
    const ast = binary('%', literal(10), literal(3));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('10 % 3'));
  });

  it('should compile power to Math.pow() when types known', () => {
    const ast = binary('^', literal(2), literal(3));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('Math.pow(2, 3)'));
  });
});

describe('JavaScript Compiler - Arithmetic Operators (unknown types)', () => {
  it('should use kPow helper for variables', () => {
    const ast = binary('^', variable('x'), variable('y'));
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kPow(x, y)', 'kPow'));
  });

  it('should use kAdd helper for variables', () => {
    const ast = binary('+', variable('a'), variable('b'));
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kAdd(a, b)', 'kAdd'));
  });

  it('should use kMul helper for mixed known/unknown', () => {
    const ast = binary('*', literal(2), variable('x'));
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kMul(2, x)', 'kMul'));
  });
});

describe('JavaScript Compiler - Comparison Operators', () => {
  it('should compile less than with typed operands', () => {
    const ast = binary('<', literal(5), literal(10));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('5 < 10'));
  });

  it('should compile greater than with typed operands', () => {
    const ast = binary('>', literal(15), literal(10));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('15 > 10'));
  });

  it('should compile less than or equal with typed operands', () => {
    const ast = binary('<=', literal(5), literal(10));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('5 <= 10'));
  });

  it('should compile greater than or equal with typed operands', () => {
    const ast = binary('>=', literal(15), literal(10));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('15 >= 10'));
  });

  it('should compile equality with typed operands', () => {
    const ast = binary('==', literal(10), literal(10));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('10 == 10'));
  });

  it('should compile inequality with typed operands', () => {
    const ast = binary('!=', literal(5), literal(10));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('5 != 10'));
  });

  it('should use native operators for comparison with unknown types', () => {
    // JS comparison always uses native operators, even with unknown types
    const ast = binary('<', variable('x'), literal(10));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('x < 10'));
  });
});

describe('JavaScript Compiler - Logical Operators', () => {
  it('should compile AND', () => {
    const ast = binary('&&', literal(true), literal(false));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('true && false'));
  });

  it('should compile OR', () => {
    const ast = binary('||', literal(true), literal(false));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('true || false'));
  });

  it('should compile NOT', () => {
    const ast = unary('!', literal(true));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('!true'));
  });

  it('should use native NOT for unknown type', () => {
    // NOT always uses native JS ! operator
    const ast = unary('!', variable('active'));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('!active'));
  });
});

describe('JavaScript Compiler - Unary Operators', () => {
  it('should compile unary minus', () => {
    const ast = unary('-', literal(5));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('-5'));
  });

  it('should compile unary plus', () => {
    const ast = unary('+', literal(5));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('+5'));
  });

  it('should use kNeg helper for negated variable (unknown type)', () => {
    const ast = unary('-', variable('x'));
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kNeg(x)', 'kNeg'));
  });
});

describe('JavaScript Compiler - Operator Precedence (typed)', () => {
  it('should handle multiplication before addition', () => {
    const ast = binary('+', literal(2), binary('*', literal(3), literal(4)));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('2 + 3 * 4'));
  });

  it('should preserve precedence with nested expressions', () => {
    const ast = binary('*', binary('+', literal(2), literal(3)), literal(4));
    // Addition has lower precedence than multiply, so parens are added
    assert.strictEqual(compileToJavaScript(ast), wrapJS('(2 + 3) * 4'));
  });

  it('should handle power with addition', () => {
    const ast = binary('+', binary('^', literal(2), literal(3)), literal(1));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('Math.pow(2, 3) + 1'));
  });

  it('should handle complex power expression', () => {
    const ast = binary('*', literal(2), binary('^', literal(3), literal(4)));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('2 * Math.pow(3, 4)'));
  });
});

describe('JavaScript Compiler - Complex Expressions (unknown types)', () => {
  it('should compile (a + b) * c with helpers', () => {
    const ast = binary(
      '*',
      binary('+', variable('a'), variable('b')),
      variable('c')
    );
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kMul(kAdd(a, b), c)', 'kAdd', 'kMul'));
  });

  it('should compile price * quantity - discount', () => {
    const ast = binary(
      '-',
      binary('*', variable('price'), variable('quantity')),
      variable('discount')
    );
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kSub(kMul(price, quantity), discount)', 'kMul', 'kSub'));
  });

  it('should compile x > 0 && x < 100 with native operators', () => {
    // Comparison and logical operators use native JS even with unknown types
    const ast = binary(
      '&&',
      binary('>', variable('x'), literal(0)),
      binary('<', variable('x'), literal(100))
    );
    assert.strictEqual(compileToJavaScript(ast), wrapJS('x > 0 && x < 100'));
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
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kDiv(kMul(kAdd(x, 5), kSub(y, 3)), 2)', 'kAdd', 'kSub', 'kMul', 'kDiv'));
  });

  it('should compile mixed arithmetic and boolean', () => {
    // Comparison uses native operators, but arithmetic uses helpers
    const ast = binary(
      '>',
      binary('*', variable('total'), literal(1.1)),
      literal(1000)
    );
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kMul(total, 1.1) > 1000', 'kMul'));
  });
});

describe('JavaScript Compiler - Edge Cases', () => {
  it('should handle nested Math.pow calls', () => {
    const ast = binary(
      '^',
      literal(2),
      binary('^', literal(3), literal(2))
    );
    assert.strictEqual(compileToJavaScript(ast), wrapJS('Math.pow(2, Math.pow(3, 2))'));
  });

  it('should handle power in complex expression', () => {
    const ast = binary(
      '+',
      binary('*', literal(2), binary('^', literal(3), literal(2))),
      literal(1)
    );
    assert.strictEqual(compileToJavaScript(ast), wrapJS('2 * Math.pow(3, 2) + 1'));
  });

  it('should handle multiple unary operators with unknown type', () => {
    const ast = unary('!', unary('!', variable('x')));
    // NOT uses native ! even for unknown types
    assert.strictEqual(compileToJavaScript(ast), wrapJS('!!x'));
  });
});

describe('JavaScript Compiler - Date Arithmetic', () => {
  it('should compile date + duration using dayjs.add()', () => {
    const ast = binary('+', { type: 'date', value: '2024-01-15' }, { type: 'duration', value: 'P1D' });
    assert.strictEqual(compileToJavaScript(ast), wrapJS("dayjs('2024-01-15').add(dayjs.duration('P1D'))"));
  });

  it('should compile date - duration using dayjs.subtract()', () => {
    const ast = binary('-', { type: 'date', value: '2024-01-15' }, { type: 'duration', value: 'P1D' });
    assert.strictEqual(compileToJavaScript(ast), wrapJS("dayjs('2024-01-15').subtract(dayjs.duration('P1D'))"));
  });

  it('should compile duration + datetime (commutative)', () => {
    const ast = binary('+', { type: 'duration', value: 'PT2H' }, { type: 'datetime', value: '2024-01-15T10:00:00Z' });
    assert.strictEqual(compileToJavaScript(ast), wrapJS("dayjs('2024-01-15T10:00:00Z').add(dayjs.duration('PT2H'))"));
  });

  it('should compile datetime + duration', () => {
    const ast = binary('+', { type: 'datetime', value: '2024-01-15T10:00:00Z' }, { type: 'duration', value: 'PT1H30M' });
    assert.strictEqual(compileToJavaScript(ast), wrapJS("dayjs('2024-01-15T10:00:00Z').add(dayjs.duration('PT1H30M'))"));
  });
});

describe('JavaScript Compiler - Function Calls', () => {
  it('should compile assert with boolean condition', () => {
    const ast = { type: 'function_call' as const, name: 'assert', args: [{ type: 'literal' as const, value: true }] };
    assert.strictEqual(compileToJavaScript(ast), wrapJS('(function() { if (!(true)) throw new Error("Assertion failed"); return true; })()'));
  });

  it('should compile assert with comparison expression', () => {
    const ast = {
      type: 'function_call' as const,
      name: 'assert',
      args: [
        { type: 'binary' as const, operator: '>' as const, left: { type: 'literal' as const, value: 5 }, right: { type: 'literal' as const, value: 3 } }
      ]
    };
    assert.strictEqual(compileToJavaScript(ast), wrapJS('(function() { if (!(5 > 3)) throw new Error("Assertion failed"); return true; })()'));
  });

  it('should throw for unknown function call', () => {
    const ast = {
      type: 'function_call' as const,
      name: 'foo',
      args: [{ type: 'literal' as const, value: 42 }]
    };
    // Unknown functions should fail at compile time
    assert.throws(() => compileToJavaScript(ast), /Unknown function foo\(Int\)/);
  });
});

describe('JavaScript Compiler - Let Expressions', () => {
  it('should compile simple let expression', () => {
    const ast = letExpr([{ name: 'x', value: literal(1) }], variable('x'));
    assert.strictEqual(compileToJavaScript(ast), wrapJS('(() => { const x = 1; return x; })()'));
  });

  it('should compile let with multiple bindings and typed inference', () => {
    // Multiple bindings are desugared to nested let expressions
    // x and y are known to be int, so addition uses native JS
    const ast = letExpr(
      [{ name: 'x', value: literal(1) }, { name: 'y', value: literal(2) }],
      binary('+', variable('x'), variable('y'))
    );
    assert.strictEqual(compileToJavaScript(ast), wrapJS('(() => { const x = 1; const y = 2; return x + y; })()'));
  });

  it('should compile nested let expressions with type inference', () => {
    const ast = letExpr(
      [{ name: 'x', value: literal(1) }],
      letExpr([{ name: 'y', value: literal(2) }], binary('+', variable('x'), variable('y')))
    );
    assert.strictEqual(
      compileToJavaScript(ast),
      wrapJS('(() => { const x = 1; const y = 2; return x + y; })()')
    );
  });

  it('should compile let with complex binding value', () => {
    const ast = letExpr(
      [{ name: 'x', value: binary('+', literal(1), literal(2)) }],
      binary('*', variable('x'), literal(3))
    );
    // x has int type from the addition, so multiply uses native JS
    assert.strictEqual(compileToJavaScript(ast), wrapJS('(() => { const x = 1 + 2; return x * 3; })()'));
  });
});
