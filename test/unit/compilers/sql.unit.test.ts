import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileToSQL } from '../../../src/compilers/sql';
import { literal, stringLiteral, variable, binary, unary, letExpr } from '../../../src/ast';
import { parse } from '../../../src/parser';

describe('SQL Compiler - Literals', () => {
  it('should compile numeric literals', () => {
    assert.strictEqual(compileToSQL(literal(42)), '42');
    assert.strictEqual(compileToSQL(literal(3.14)), '3.14');
    assert.strictEqual(compileToSQL(literal(0)), '0');
  });

  it('should compile boolean literals to uppercase', () => {
    assert.strictEqual(compileToSQL(literal(true)), 'TRUE');
    assert.strictEqual(compileToSQL(literal(false)), 'FALSE');
  });
});

describe('SQL Compiler - String Literals', () => {
  it('should compile simple string with single quotes', () => {
    assert.strictEqual(compileToSQL(stringLiteral('hello')), "'hello'");
  });

  it('should compile string with spaces', () => {
    assert.strictEqual(compileToSQL(stringLiteral('hello world')), "'hello world'");
  });

  it('should compile empty string', () => {
    assert.strictEqual(compileToSQL(stringLiteral('')), "''");
  });

  it('should escape single quotes by doubling', () => {
    assert.strictEqual(compileToSQL(stringLiteral("it's")), "'it''s'");
  });

  it('should handle multiple single quotes', () => {
    assert.strictEqual(compileToSQL(stringLiteral("it's John's")), "'it''s John''s'");
  });
});

describe('SQL Compiler - Variables', () => {
  it('should compile variables as column names', () => {
    assert.strictEqual(compileToSQL(variable('x')), 'x');
    assert.strictEqual(compileToSQL(variable('price')), 'price');
    assert.strictEqual(compileToSQL(variable('user_name')), 'user_name');
  });
});

describe('SQL Compiler - Arithmetic Operators', () => {
  it('should compile addition', () => {
    const ast = binary('+', literal(1), literal(2));
    assert.strictEqual(compileToSQL(ast), '1 + 2');
  });

  it('should compile subtraction', () => {
    const ast = binary('-', literal(5), literal(3));
    assert.strictEqual(compileToSQL(ast), '5 - 3');
  });

  it('should compile multiplication', () => {
    const ast = binary('*', literal(4), literal(3));
    assert.strictEqual(compileToSQL(ast), '4 * 3');
  });

  it('should compile division as real division', () => {
    // PostgreSQL truncates integer / integer, where Elo's `/` is real in every
    // target: `7 / 2` is 3.5.
    const ast = binary('/', literal(10), literal(2));
    assert.strictEqual(compileToSQL(ast), '10::double precision / 2');
  });

  it('leaves a division with a float operand alone', () => {
    // PostgreSQL already divides as reals as soon as either operand is one.
    assert.strictEqual(compileToSQL(binary('/', literal(10.0, true), literal(2))), '10.0 / 2');
  });

  it('should compile modulo as a floored modulo', () => {
    // Elo's `%` takes the sign of the divisor; PostgreSQL's takes the sign of
    // the dividend and has no floored modulo to call, so the correction is
    // inline.
    const ast = binary('%', literal(10), literal(3));
    assert.strictEqual(compileToSQL(ast), '((10 % 3) + 3) % 3');
  });

  it('should compile power to POWER()', () => {
    const ast = binary('^', literal(2), literal(3));
    assert.strictEqual(compileToSQL(ast), 'POWER(2, 3)');
  });

  it('should compile power with variables', () => {
    const ast = binary('^', variable('x'), variable('y'));
    assert.strictEqual(compileToSQL(ast), 'POWER(x, y)');
  });

  it('should compile power with expressions', () => {
    const ast = binary(
      '^',
      binary('+', literal(1), literal(2)),
      literal(3)
    );
    assert.strictEqual(compileToSQL(ast), 'POWER(1 + 2, 3)');
  });
});

describe('SQL Compiler - Comparison Operators', () => {
  it('should compile less than', () => {
    const ast = binary('<', variable('x'), literal(10));
    assert.strictEqual(compileToSQL(ast), 'x < 10');
  });

  it('should compile greater than', () => {
    const ast = binary('>', variable('x'), literal(10));
    assert.strictEqual(compileToSQL(ast), 'x > 10');
  });

  it('should compile less than or equal', () => {
    const ast = binary('<=', variable('x'), literal(10));
    assert.strictEqual(compileToSQL(ast), 'x <= 10');
  });

  it('should compile greater than or equal', () => {
    const ast = binary('>=', variable('x'), literal(10));
    assert.strictEqual(compileToSQL(ast), 'x >= 10');
  });

  it('should compile equality to =', () => {
    const ast = binary('==', variable('x'), literal(10));
    assert.strictEqual(compileToSQL(ast), 'x = 10');
  });

  it('should compile inequality to <>', () => {
    const ast = binary('!=', variable('x'), literal(10));
    assert.strictEqual(compileToSQL(ast), 'x <> 10');
  });
});

describe('SQL Compiler - Logical Operators', () => {
  it('should compile AND', () => {
    const ast = binary('&&', literal(true), literal(false));
    assert.strictEqual(compileToSQL(ast), 'TRUE AND FALSE');
  });

  it('should compile OR', () => {
    const ast = binary('||', literal(true), literal(false));
    assert.strictEqual(compileToSQL(ast), 'TRUE OR FALSE');
  });

  it('should compile NOT', () => {
    const ast = unary('!', variable('active'));
    assert.strictEqual(compileToSQL(ast), 'NOT active');
  });

  it('should compile AND with variables', () => {
    const ast = binary('&&', variable('a'), variable('b'));
    assert.strictEqual(compileToSQL(ast), 'a AND b');
  });

  it('should compile OR with variables', () => {
    const ast = binary('||', variable('a'), variable('b'));
    assert.strictEqual(compileToSQL(ast), 'a OR b');
  });

  it('should compile NOT with boolean literal', () => {
    const ast = unary('!', literal(true));
    assert.strictEqual(compileToSQL(ast), 'NOT TRUE');
  });
});

describe('SQL Compiler - Unary Operators', () => {
  it('should compile unary minus', () => {
    const ast = unary('-', literal(5));
    assert.strictEqual(compileToSQL(ast), '-5');
  });

  it('should compile unary plus', () => {
    const ast = unary('+', literal(5));
    assert.strictEqual(compileToSQL(ast), '+5');
  });

  it('should compile negated variable', () => {
    const ast = unary('-', variable('x'));
    assert.strictEqual(compileToSQL(ast), '-x');
  });
});

describe('SQL Compiler - Operator Precedence', () => {
  it('should handle multiplication before addition', () => {
    const ast = binary('+', literal(2), binary('*', literal(3), literal(4)));
    assert.strictEqual(compileToSQL(ast), '2 + 3 * 4');
  });

  it('should add parentheses when needed', () => {
    const ast = binary('*', binary('+', literal(2), literal(3)), literal(4));
    assert.strictEqual(compileToSQL(ast), '(2 + 3) * 4');
  });

  it('should handle power with addition', () => {
    const ast = binary('+', binary('^', literal(2), literal(3)), literal(1));
    assert.strictEqual(compileToSQL(ast), 'POWER(2, 3) + 1');
  });
});

describe('SQL Compiler - Complex Expressions', () => {
  it('should compile (a + b) * c', () => {
    const ast = binary(
      '*',
      binary('+', variable('a'), variable('b')),
      variable('c')
    );
    assert.strictEqual(compileToSQL(ast), '(a + b) * c');
  });

  it('should compile price * quantity - discount', () => {
    const ast = binary(
      '-',
      binary('*', variable('price'), variable('quantity')),
      variable('discount')
    );
    assert.strictEqual(compileToSQL(ast), 'price * quantity - discount');
  });

  it('should compile x > 0 AND x < 100', () => {
    const ast = binary(
      '&&',
      binary('>', variable('x'), literal(0)),
      binary('<', variable('x'), literal(100))
    );
    assert.strictEqual(compileToSQL(ast), 'x > 0 AND x < 100');
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
    assert.strictEqual(compileToSQL(ast), '(x + 5) * (y - 3) / 2');
  });

  it('should compile complex boolean expression', () => {
    const ast = binary(
      '||',
      binary(
        '&&',
        binary('>', variable('price'), literal(100)),
        binary('>=', variable('discount'), literal(10))
      ),
      binary('==', variable('vip'), literal(true))
    );
    assert.strictEqual(compileToSQL(ast), 'price > 100 AND discount >= 10 OR vip = TRUE');
  });

  it('should compile mixed arithmetic and boolean', () => {
    const ast = binary(
      '>',
      binary('*', variable('total'), literal(1.1)),
      literal(1000)
    );
    assert.strictEqual(compileToSQL(ast), 'total * 1.1 > 1000');
  });
});

describe('SQL Compiler - WHERE clause scenarios', () => {
  it('should compile range check', () => {
    const ast = binary(
      '&&',
      binary('>=', variable('age'), literal(18)),
      binary('<', variable('age'), literal(65))
    );
    assert.strictEqual(compileToSQL(ast), 'age >= 18 AND age < 65');
  });

  it('should compile status check with OR', () => {
    const ast = binary(
      '||',
      binary('==', variable('status'), literal(1)),
      binary('==', variable('status'), literal(2))
    );
    assert.strictEqual(compileToSQL(ast), 'status = 1 OR status = 2');
  });

  it('should compile NOT NULL check simulation', () => {
    const ast = unary('!', variable('deleted'));
    assert.strictEqual(compileToSQL(ast), 'NOT deleted');
  });

  it('should compile complex business rule', () => {
    const ast = binary(
      '&&',
      binary('>', variable('amount'), literal(0)),
      binary(
        '||',
        variable('approved'),
        binary('<', variable('amount'), literal(1000))
      )
    );
    assert.strictEqual(compileToSQL(ast), 'amount > 0 AND (approved OR amount < 1000)');
  });
});

describe('SQL Compiler - Edge Cases', () => {
  it('should handle nested POWER calls', () => {
    const ast = binary(
      '^',
      literal(2),
      binary('^', literal(3), literal(2))
    );
    assert.strictEqual(compileToSQL(ast), 'POWER(2, POWER(3, 2))');
  });

  it('should handle multiple NOT operators', () => {
    const ast = unary('!', unary('!', variable('x')));
    assert.strictEqual(compileToSQL(ast), 'NOT NOT x');
  });

  it('should handle deeply nested boolean logic', () => {
    const ast = binary(
      '&&',
      binary('||', variable('a'), variable('b')),
      binary('||', variable('c'), variable('d'))
    );
    assert.strictEqual(compileToSQL(ast), '(a OR b) AND (c OR d)');
  });
});

describe('SQL Compiler - Let Expressions', () => {
  it('should compile simple let expression', () => {
    const ast = letExpr([{ name: 'x', value: literal(1) }], variable('x'));
    assert.strictEqual(compileToSQL(ast), '(SELECT x FROM (SELECT 1 AS x) AS _let)');
  });

  it('should compile let with multiple bindings, nested by the SQL target', () => {
    const ast = letExpr(
      [{ name: 'x', value: literal(1) }, { name: 'y', value: literal(2) }],
      binary('+', variable('x'), variable('y'))
    );
    assert.strictEqual(compileToSQL(ast), '(SELECT (SELECT x + y FROM (SELECT 2 AS y) AS _let) FROM (SELECT 1 AS x) AS _let)');
  });

  it('should compile nested let expressions', () => {
    const ast = letExpr(
      [{ name: 'x', value: literal(1) }],
      letExpr([{ name: 'y', value: literal(2) }], binary('+', variable('x'), variable('y')))
    );
    assert.strictEqual(
      compileToSQL(ast),
      '(SELECT (SELECT x + y FROM (SELECT 2 AS y) AS _let) FROM (SELECT 1 AS x) AS _let)'
    );
  });

  it('should compile let with complex binding value', () => {
    const ast = letExpr(
      [{ name: 'x', value: binary('+', literal(1), literal(2)) }],
      binary('*', variable('x'), literal(3))
    );
    assert.strictEqual(compileToSQL(ast), '(SELECT x * 3 FROM (SELECT 1 + 2 AS x) AS _let)');
  });
});

/**
 * A PostgreSQL array is more restrictive than an Elo list in two ways, and
 * both are refused rather than emitted.
 *
 * Elo's List is heterogeneous and nests freely, which JavaScript, Ruby and
 * Python all represent directly. A SQL array carries one element type and
 * nests only rectangularly, so `[1, 'two']` and `[[1], [2, 3]]` have no
 * representation at all — PostgreSQL rejects both, and the author should hear
 * it from the compiler rather than from psql.
 */
describe('SQL Compiler - lists SQL cannot represent', () => {
  const sql = (source: string) => compileToSQL(parse(source));

  it('refuses a list whose elements have different types', () => {
    assert.throws(() => sql("[1, 'two']"), /single element type/);
    assert.throws(() => sql('[1, true]'), /single element type/);
    assert.throws(() => sql("[1, 'two', true, null]"), /single element type/);
  });

  it('names the types it found, so the author can see which element is odd', () => {
    assert.throws(() => sql("[1, 'two']"), /Int and String/);
  });

  it('accepts the mixes PostgreSQL unifies exactly', () => {
    // An Elo List of numbers is a numeric[], and Date next to Datetime is a
    // timestamp[]. Refusing those would be stricter than PostgreSQL for no
    // reason.
    assert.strictEqual(sql('[1, 1.5]'), 'ARRAY[1, 1.5]');
    assert.strictEqual(sql('[D2024-01-01, D2024-01-01T10:00:00Z]'),
      "ARRAY[DATE '2024-01-01', TIMESTAMP '2024-01-01 10:00:00']");
  });

  it('accepts a null alongside anything, which is a hole and not a type', () => {
    assert.strictEqual(sql('[1, null, 3]'), 'ARRAY[1, NULL, 3]');
  });

  it('refuses a list of lists of different lengths', () => {
    assert.throws(() => sql('[[1], [2, 3]]'), /rectangular/);
    assert.throws(() => sql('[[], [1, 2]]'), /rectangular/);
  });

  it('accepts a rectangular list of lists, which is a 2-D array', () => {
    assert.strictEqual(sql('[[1, 2], [3, 4]]'), 'ARRAY[ARRAY[1, 2], ARRAY[3, 4]]');
  });

  it('still flattens a ragged list, because flat() never builds it', () => {
    // flat() concatenates the parts, so the nested array is never constructed
    // and the restriction does not apply.
    assert.strictEqual(sql('flat([[1], [2, 3]])'), '(ARRAY[1] || ARRAY[2, 3])');
    assert.strictEqual(sql('flat([[], [1, 2]])'), "('{}'::integer[] || ARRAY[1, 2])");
  });
});
