import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileToRuby } from '../../../src/compilers/ruby';
import { parse } from '../../../src/parser';
import { literal, stringLiteral, variable, binary, unary, letExpr, memberAccess } from '../../../src/ast';

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

  // Regression tests: prevent Ruby interpolation injection via unescaped `#`.
  // Ruby double-quoted strings interpolate `#{...}`, `#@ivar`, `#@@cvar`, `#$gvar`.
  // A string literal in Elo is data and must never trigger host-language evaluation.
  it('should escape `#{...}` so it is not interpolated by Ruby', () => {
    assert.strictEqual(
      compileToRuby(stringLiteral('#{1+1}')),
      wrapRuby('"\\#{1+1}"')
    );
  });

  it('should escape backtick interpolation combos (no shell execution)', () => {
    assert.strictEqual(
      compileToRuby(stringLiteral('#{`id`}')),
      wrapRuby('"\\#{`id`}"')
    );
  });

  it('should escape `#@ivar`, `#@@cvar`, `#$gvar` interpolation forms', () => {
    assert.strictEqual(compileToRuby(stringLiteral('#@x')), wrapRuby('"\\#@x"'));
    assert.strictEqual(compileToRuby(stringLiteral('#@@x')), wrapRuby('"\\#@@x"'));
    assert.strictEqual(compileToRuby(stringLiteral('#$x')), wrapRuby('"\\#$x"'));
  });

  it('should leave a bare `#` literal intact after escape', () => {
    // `\#` in a Ruby double-quoted string evaluates to a literal `#`.
    assert.strictEqual(compileToRuby(stringLiteral('a#b')), wrapRuby('"a\\#b"'));
  });
});

describe('Ruby Compiler - Subtype Constraint Label Escaping', () => {
  // The subtype-constraint branch embeds the (user-controllable) label into a
  // Ruby double-quoted string via `p_fail(p, "...")`. Without escaping, a label
  // like '#{`id`}' would trigger interpolation and shell execution when the
  // constraint fails at runtime. These regression tests pin the escape behavior.
  //
  // We inspect the p_fail(...) call emitted inside the constraint parser, not
  // the whole program (which legitimately contains `#{...}` inside built-in
  // runtime helpers).

  function extractConstraintErrorArg(out: string): string {
    // Find: ...return p_fail(p, "<ARG>") unless (...)
    const m = out.match(/return p_fail\(p, "((?:[^"\\]|\\.)*)"\) unless/);
    assert.ok(m, `could not find constraint p_fail(...) in: ${out}`);
    return m![1];
  }

  it('should escape `#{...}` in a string-labeled constraint', () => {
    const ast = parse("let T = Int(i | '#{1+1}': i > 0) in T(-1)");
    const arg = extractConstraintErrorArg(compileToRuby(ast));
    assert.ok(!/(^|[^\\])#\{/.test(arg), `un-escaped \`#{'{'}\` in label arg: ${arg}`);
    assert.ok(arg.includes("\\#{1+1}"), `expected escaped form \\#{'{'}1+1} in: ${arg}`);
  });

  it('should escape backtick-shell-exec attempts in a labeled constraint', () => {
    const ast = parse("let T = Int(i | '#{`id`}': i > 0) in T(-1)");
    const arg = extractConstraintErrorArg(compileToRuby(ast));
    assert.ok(!/(^|[^\\])#\{/.test(arg), `un-escaped \`#{'{'}\` in label arg: ${arg}`);
  });

  it('should escape `#@`, `#@@`, `#$` interpolation forms in labels', () => {
    for (const label of ['#@x', '#@@x', '#$x']) {
      const ast = parse(`let T = Int(i | '${label}': i > 0) in T(-1)`);
      const arg = extractConstraintErrorArg(compileToRuby(ast));
      const pattern = new RegExp(`(^|[^\\\\])${label.replace(/\$/g, '\\$')}`);
      assert.ok(!pattern.test(arg), `un-escaped ${label} in label arg: ${arg}`);
    }
  });
});

describe('Ruby Compiler - Variables', () => {
  it('should compile input variable _', () => {
    assert.strictEqual(compileToRuby(variable('_')), wrapRuby('_'));
  });

  it('should compile member access on _', () => {
    assert.strictEqual(compileToRuby(memberAccess(variable('_'), 'price')), wrapRuby('_[:price]'));
    assert.strictEqual(compileToRuby(memberAccess(variable('_'), 'user_name')), wrapRuby('_[:user_name]'));
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
    const ast = binary('<', memberAccess(variable('_'), 'x'), literal(10));
    assert.strictEqual(compileToRuby(ast), wrapRuby('_[:x] < 10'));
  });

  it('should compile greater than', () => {
    const ast = binary('>', memberAccess(variable('_'), 'x'), literal(10));
    assert.strictEqual(compileToRuby(ast), wrapRuby('_[:x] > 10'));
  });

  it('should compile less than or equal', () => {
    const ast = binary('<=', memberAccess(variable('_'), 'x'), literal(10));
    assert.strictEqual(compileToRuby(ast), wrapRuby('_[:x] <= 10'));
  });

  it('should compile greater than or equal', () => {
    const ast = binary('>=', memberAccess(variable('_'), 'x'), literal(10));
    assert.strictEqual(compileToRuby(ast), wrapRuby('_[:x] >= 10'));
  });

  it('should compile equality', () => {
    const ast = binary('==', memberAccess(variable('_'), 'x'), literal(10));
    assert.strictEqual(compileToRuby(ast), wrapRuby('_[:x] == 10'));
  });

  it('should compile inequality', () => {
    const ast = binary('!=', memberAccess(variable('_'), 'x'), literal(10));
    assert.strictEqual(compileToRuby(ast), wrapRuby('_[:x] != 10'));
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
    const ast = unary('!', memberAccess(variable('_'), 'active'));
    assert.strictEqual(compileToRuby(ast), wrapRuby('!_[:active]'));
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
    const ast = unary('-', memberAccess(variable('_'), 'x'));
    assert.strictEqual(compileToRuby(ast), wrapRuby('-_[:x]'));
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
  it('should compile (_.a + _.b) * _.c', () => {
    const ast = binary(
      '*',
      binary('+', memberAccess(variable('_'), 'a'), memberAccess(variable('_'), 'b')),
      memberAccess(variable('_'), 'c')
    );
    assert.strictEqual(compileToRuby(ast), wrapRuby('(_[:a] + _[:b]) * _[:c]'));
  });

  it('should compile _.price * _.quantity - _.discount', () => {
    const ast = binary(
      '-',
      binary('*', memberAccess(variable('_'), 'price'), memberAccess(variable('_'), 'quantity')),
      memberAccess(variable('_'), 'discount')
    );
    assert.strictEqual(compileToRuby(ast), wrapRuby('_[:price] * _[:quantity] - _[:discount]'));
  });

  it('should compile _.x > 0 && _.x < 100', () => {
    const ast = binary(
      '&&',
      binary('>', memberAccess(variable('_'), 'x'), literal(0)),
      binary('<', memberAccess(variable('_'), 'x'), literal(100))
    );
    assert.strictEqual(compileToRuby(ast), wrapRuby('_[:x] > 0 && _[:x] < 100'));
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
    assert.strictEqual(compileToRuby(ast), wrapRuby('(_[:x] + 5) * (_[:y] - 3) / 2'));
  });

  it('should compile complex boolean with parentheses', () => {
    const ast = binary(
      '||',
      binary(
        '&&',
        binary('>', memberAccess(variable('_'), 'price'), literal(100)),
        binary('>=', memberAccess(variable('_'), 'discount'), literal(10))
      ),
      binary('==', memberAccess(variable('_'), 'vip'), literal(true))
    );
    assert.strictEqual(compileToRuby(ast), wrapRuby('_[:price] > 100 && _[:discount] >= 10 || _[:vip] == true'));
  });

  it('should compile mixed arithmetic and boolean', () => {
    const ast = binary(
      '>',
      binary('*', memberAccess(variable('_'), 'total'), literal(1.1)),
      literal(1000)
    );
    assert.strictEqual(compileToRuby(ast), wrapRuby('_[:total] * 1.1 > 1000'));
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
    const ast = binary('+', unary('-', memberAccess(variable('_'), 'x')), literal(10));
    assert.strictEqual(compileToRuby(ast), wrapRuby('-_[:x] + 10'));
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
