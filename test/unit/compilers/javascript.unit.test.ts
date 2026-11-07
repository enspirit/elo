import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileToJavaScript } from '../../../src/compilers/javascript';
import { literal, stringLiteral, variable, binary, unary, letExpr, memberAccess } from '../../../src/ast';
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
  it('should compile input variable _', () => {
    assert.strictEqual(compileToJavaScript(variable('_')), wrapJS('_'));
  });

  it('should compile member access on _', () => {
    assert.strictEqual(compileToJavaScript(memberAccess(variable('_'), 'price')), withHelpers('kMember(_, "price")', 'kMember'));
    assert.strictEqual(compileToJavaScript(memberAccess(variable('_'), 'userName')), withHelpers('kMember(_, "userName")', 'kMember'));
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

  it('should compile modulo through kMod, which floors', () => {
    // Elo's `%` takes the sign of the divisor, as Ruby and Python do;
    // JavaScript's `%` takes the sign of the dividend. The helper is the
    // emission even when both types are known, for the same reason `round`
    // goes through kRound.
    const ast = binary('%', literal(10), literal(3));
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kMod(10, 3)', 'kMod'));
  });

  it('should compile power to Math.pow() when types known', () => {
    const ast = binary('^', literal(2), literal(3));
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kPow(2, 3)', 'kPow'));
  });
});

describe('JavaScript Compiler - Arithmetic Operators (unknown types)', () => {
  it('should use kPow helper for input variable members', () => {
    const ast = binary('^', memberAccess(variable('_'), 'x'), memberAccess(variable('_'), 'y'));
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kPow(kMember(_, "x"), kMember(_, "y"))', 'kPow', 'kMember'));
  });

  it('should use kAdd helper for input variable members', () => {
    const ast = binary('+', memberAccess(variable('_'), 'a'), memberAccess(variable('_'), 'b'));
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kAdd(kMember(_, "a"), kMember(_, "b"))', 'kAdd', 'kMember'));
  });

  it('should use kMul helper for mixed known/unknown', () => {
    const ast = binary('*', literal(2), memberAccess(variable('_'), 'x'));
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kMul(2, kMember(_, "x"))', 'kMul', 'kMember', 'kRepeat'));
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
    const ast = binary('<', memberAccess(variable('_'), 'x'), literal(10));
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kMember(_, "x") < 10', 'kMember'));
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
    const ast = unary('!', memberAccess(variable('_'), 'active'));
    assert.strictEqual(compileToJavaScript(ast), withHelpers('!kMember(_, "active")', 'kMember'));
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
    const ast = unary('-', memberAccess(variable('_'), 'x'));
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kNeg(kMember(_, "x"))', 'kNeg', 'kMember'));
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
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kPow(2, 3) + 1', 'kPow'));
  });

  it('should handle complex power expression', () => {
    const ast = binary('*', literal(2), binary('^', literal(3), literal(4)));
    assert.strictEqual(compileToJavaScript(ast), withHelpers('2 * kPow(3, 4)', 'kPow'));
  });
});

describe('JavaScript Compiler - Complex Expressions (unknown types)', () => {
  it('should compile (_.a + _.b) * _.c with helpers', () => {
    const ast = binary(
      '*',
      binary('+', memberAccess(variable('_'), 'a'), memberAccess(variable('_'), 'b')),
      memberAccess(variable('_'), 'c')
    );
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kMul(kAdd(kMember(_, "a"), kMember(_, "b")), kMember(_, "c"))', 'kAdd', 'kMul', 'kMember', 'kRepeat'));
  });

  it('should compile _.price * _.quantity - _.discount', () => {
    const ast = binary(
      '-',
      binary('*', memberAccess(variable('_'), 'price'), memberAccess(variable('_'), 'quantity')),
      memberAccess(variable('_'), 'discount')
    );
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kSub(kMul(kMember(_, "price"), kMember(_, "quantity")), kMember(_, "discount"))', 'kMul', 'kSub', 'kMember', 'kRepeat'));
  });

  it('should compile _.x > 0 && _.x < 100 with native operators', () => {
    // Comparison and logical operators use native JS even with unknown types
    const ast = binary(
      '&&',
      binary('>', memberAccess(variable('_'), 'x'), literal(0)),
      binary('<', memberAccess(variable('_'), 'x'), literal(100))
    );
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kMember(_, "x") > 0 && kMember(_, "x") < 100', 'kMember'));
  });

  it('should compile (_.x + 5) * (_.y - 3) / 2', () => {
    const ast = binary(
      '/',
      binary(
        '*',
        binary('+', memberAccess(variable('_'), 'x'), literal(5)),
        binary('-', memberAccess(variable('_'), 'y'), literal(3))
      ),
      literal(2)
    );
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kDiv(kMul(kAdd(kMember(_, "x"), 5), kSub(kMember(_, "y"), 3)), 2)', 'kAdd', 'kSub', 'kMul', 'kDiv', 'kMember', 'kRepeat'));
  });

  it('should compile mixed arithmetic and boolean', () => {
    // Comparison uses native operators, but arithmetic uses helpers
    const ast = binary(
      '>',
      binary('*', memberAccess(variable('_'), 'total'), literal(1.1)),
      literal(1000)
    );
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kMul(kMember(_, "total"), 1.1) > 1000', 'kMul', 'kMember', 'kRepeat'));
  });
});

describe('JavaScript Compiler - Edge Cases', () => {
  it('should handle nested Math.pow calls', () => {
    const ast = binary(
      '^',
      literal(2),
      binary('^', literal(3), literal(2))
    );
    assert.strictEqual(compileToJavaScript(ast), withHelpers('kPow(2, kPow(3, 2))', 'kPow'));
  });

  it('should handle power in complex expression', () => {
    const ast = binary(
      '+',
      binary('*', literal(2), binary('^', literal(3), literal(2))),
      literal(1)
    );
    assert.strictEqual(compileToJavaScript(ast), withHelpers('2 * kPow(3, 2) + 1', 'kPow'));
  });

  it('should handle multiple unary operators with unknown type', () => {
    const ast = unary('!', unary('!', memberAccess(variable('_'), 'x')));
    // NOT uses native ! even for unknown types
    assert.strictEqual(compileToJavaScript(ast), withHelpers('!!kMember(_, "x")', 'kMember'));
  });
});

describe('JavaScript Compiler - Date Arithmetic', () => {
  it('should compile date + duration using DateTime.plus()', () => {
    const ast = binary('+', { type: 'date', value: '2024-01-15' }, { type: 'duration', value: 'P1D' });
    assert.strictEqual(compileToJavaScript(ast), wrapJS("DateTime.fromISO(\"2024-01-15\").plus(Duration.fromISO(\"P1D\"))"));
  });

  it('should compile date - duration using DateTime.minus()', () => {
    const ast = binary('-', { type: 'date', value: '2024-01-15' }, { type: 'duration', value: 'P1D' });
    assert.strictEqual(compileToJavaScript(ast), wrapJS("DateTime.fromISO(\"2024-01-15\").minus(Duration.fromISO(\"P1D\"))"));
  });

  it('should compile duration + datetime (commutative)', () => {
    const ast = binary('+', { type: 'duration', value: 'PT2H' }, { type: 'datetime', value: '2024-01-15T10:00:00Z' });
    assert.strictEqual(compileToJavaScript(ast), wrapJS("DateTime.fromISO(\"2024-01-15T10:00:00Z\").plus(Duration.fromISO(\"PT2H\"))"));
  });

  it('should compile datetime + duration', () => {
    const ast = binary('+', { type: 'datetime', value: '2024-01-15T10:00:00Z' }, { type: 'duration', value: 'PT1H30M' });
    assert.strictEqual(compileToJavaScript(ast), wrapJS("DateTime.fromISO(\"2024-01-15T10:00:00Z\").plus(Duration.fromISO(\"PT1H30M\"))"));
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
