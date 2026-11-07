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

// Ruby's `**` answers a Rational for a negative Integer exponent, which no
// other target does, so every power goes through the helper. The helper also
// refuses a result whose bit length would exceed the allocation cap.
const POW = 'def k_pow(l, r); raise "Exponentiation result exceeds the size limit (10000000 bits); raise ELO_MAX_STRING_LENGTH to allow larger results" if l.is_a?(Integer) && r.is_a?(Integer) && r > 1 && l.abs > 1 && r * Math.log2(l.abs) > 10000000; v = l ** r; v.is_a?(Rational) ? v.to_f : v end; ';

// Dynamic multiplication dispatches so a String operand reaches the *bounded*
// repeat rather than Ruby's unbounded `String#*`; k_str_mul is its dependency.
const K_MUL = 'def k_mul(l, r); return k_str_mul(l, r) if l.is_a?(String) && r.is_a?(Integer); return k_str_mul(r, l) if r.is_a?(String) && l.is_a?(Integer); l * r end; ';
const K_STR_MUL = 'def k_str_mul(s, n); return \'\' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; ';
const MUL = `${K_MUL}${K_STR_MUL}`;

// Emitted ahead of the expression when the division has to decide at runtime.
const K_DIV = 'def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; ';

// Likewise for subtraction: Ruby's Date/DateTime difference is a Rational
// number of days, not a duration, so an unknown operand type has to dispatch.
const K_SUB = 'def k_sub(l, r); if (l.is_a?(Date) || l.is_a?(Time)) && (r.is_a?(Date) || r.is_a?(Time)); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; ';

function wrapRubyWithKDiv(code: string): string {
  return wrapRuby(`${K_DIV}${code}`);
}

function wrapRubyWithKSub(code: string): string {
  return wrapRuby(`${K_SUB}${code}`);
}

function wrapRubyWithKDivAndKSub(code: string): string {
  return wrapRuby(`${K_DIV}${K_SUB}${code}`);
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
  // The subtype-constraint branch embeds the (user-controllable) label into
  // Ruby double-quoted strings, in the check `p_subtype` is handed. Without
  // escaping, a label like '#{`id`}' would trigger interpolation and shell
  // execution when the constraint fails at runtime. These regression tests pin
  // the escape behavior.
  //
  // We inspect the check emitted inside the constraint parser, not the whole
  // program (which legitimately contains `#{...}` inside built-in runtime
  // helpers). A check is `["<message>", "<label>", ->(i) { … }]`, and *both*
  // strings carry the label, so both are checked.

  function extractConstraintErrorArg(out: string): string {
    // Find: p_subtype(<base>, [["<message>", "<label>", ->(…) { … }], …])
    const m = out.match(/p_subtype\([^[]*\[\["((?:[^"\\]|\\.)*)", ("(?:[^"\\]|\\.)*"|nil),/);
    assert.ok(m, `could not find constraint check in: ${out}`);
    return `${m![1]} ${m![2]}`;
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

  // Ruby truncates Integer / Integer, where Elo's `/` is real division.
  it('should compile division through fdiv', () => {
    const ast = binary('/', literal(10), literal(2));
    assert.strictEqual(compileToRuby(ast), wrapRuby('10.fdiv(2)'));
  });

  it('should compile modulo', () => {
    const ast = binary('%', literal(10), literal(3));
    assert.strictEqual(compileToRuby(ast), wrapRuby('10 % 3'));
  });

  it('should compile power through k_pow, which never yields a Rational', () => {
    // `2 ** -1` is (1/2) in Ruby and 0.5 everywhere else, so the helper
    // converts a Rational result and leaves every other one alone.
    const ast = binary('^', literal(2), literal(3));
    assert.strictEqual(compileToRuby(ast), `->(_) { ${POW}k_pow(2, 3) }`);
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
    // Every numeric division goes through fdiv, including the outer one: a
    // value declared Float can still be an Integer at runtime, and Ruby's `/`
    // would then truncate.
    const ast = binary('/', literal(20), binary('/', literal(10), literal(2)));
    assert.strictEqual(compileToRuby(ast), '->(_) { 20.fdiv(10.fdiv(2)) }');
  });

  it('should handle power precedence', () => {
    const ast = binary('+', binary('^', literal(2), literal(3)), literal(1));
    assert.strictEqual(compileToRuby(ast), `->(_) { ${POW}k_pow(2, 3) + 1 }`);
  });
});

describe('Ruby Compiler - Complex Expressions', () => {
  it('should compile (_.a + _.b) * _.c', () => {
    const ast = binary(
      '*',
      binary('+', memberAccess(variable('_'), 'a'), memberAccess(variable('_'), 'b')),
      memberAccess(variable('_'), 'c')
    );
    assert.strictEqual(compileToRuby(ast), wrapRuby(`${MUL}k_mul(_[:a] + _[:b], _[:c])`));
  });

  it('should compile _.price * _.quantity - _.discount', () => {
    const ast = binary(
      '-',
      binary('*', memberAccess(variable('_'), 'price'), memberAccess(variable('_'), 'quantity')),
      memberAccess(variable('_'), 'discount')
    );
    // Subtraction on operands of unknown type dispatches: if both were dates
    // Ruby's `-` would give a Rational number of days rather than a duration.
    assert.strictEqual(
      compileToRuby(ast),
      wrapRuby(`${MUL}${K_SUB}k_sub(k_mul(_[:price], _[:quantity]), _[:discount])`)
    );
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
    assert.strictEqual(
      compileToRuby(ast),
      wrapRuby(`${K_DIV}${MUL}${K_SUB}k_div(k_mul(_[:x] + 5, k_sub(_[:y], 3)), 2)`)
    );
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
    assert.strictEqual(compileToRuby(ast), wrapRuby(`${MUL}k_mul(_[:total], 1.1) > 1000`));
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

  it('should compile let with multiple bindings as one flat sequence', () => {
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
