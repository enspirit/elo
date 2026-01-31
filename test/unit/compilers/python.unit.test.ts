import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileToPython } from '../../../src/compilers/python';
import { literal, stringLiteral, variable, binary, unary, letExpr, memberAccess } from '../../../src/ast';

function wrapPy(code: string): string {
  return `(lambda _: ${code})`;
}

describe('Python Compiler - Literals', () => {
  it('should compile numeric literals', () => {
    assert.strictEqual(compileToPython(literal(42)), wrapPy('42'));
    assert.strictEqual(compileToPython(literal(3.14)), wrapPy('3.14'));
    assert.strictEqual(compileToPython(literal(0)), wrapPy('0'));
  });

  it('should compile boolean literals', () => {
    assert.strictEqual(compileToPython(literal(true)), wrapPy('True'));
    assert.strictEqual(compileToPython(literal(false)), wrapPy('False'));
  });
});

describe('Python Compiler - String Literals', () => {
  it('should compile simple string', () => {
    assert.strictEqual(compileToPython(stringLiteral('hello')), wrapPy('"hello"'));
  });

  it('should compile string with spaces', () => {
    assert.strictEqual(compileToPython(stringLiteral('hello world')), wrapPy('"hello world"'));
  });

  it('should compile empty string', () => {
    assert.strictEqual(compileToPython(stringLiteral('')), wrapPy('""'));
  });
});

describe('Python Compiler - Variables', () => {
  it('should compile input variable _', () => {
    assert.strictEqual(compileToPython(variable('_')), wrapPy('_'));
  });

  it('should compile member access on _ using .get()', () => {
    assert.strictEqual(compileToPython(memberAccess(variable('_'), 'price')), wrapPy('_.get("price")'));
    assert.strictEqual(compileToPython(memberAccess(variable('_'), 'userName')), wrapPy('_.get("userName")'));
  });
});

describe('Python Compiler - Arithmetic Operators', () => {
  it('should compile addition', () => {
    const ast = binary('+', literal(1), literal(2));
    assert.strictEqual(compileToPython(ast), wrapPy('1 + 2'));
  });

  it('should compile subtraction', () => {
    const ast = binary('-', literal(5), literal(3));
    assert.strictEqual(compileToPython(ast), wrapPy('5 - 3'));
  });

  it('should compile multiplication', () => {
    const ast = binary('*', literal(4), literal(3));
    assert.strictEqual(compileToPython(ast), wrapPy('4 * 3'));
  });

  it('should compile division', () => {
    const ast = binary('/', literal(10), literal(2));
    assert.strictEqual(compileToPython(ast), wrapPy('10 / 2'));
  });

  it('should compile modulo', () => {
    const ast = binary('%', literal(10), literal(3));
    assert.strictEqual(compileToPython(ast), wrapPy('10 % 3'));
  });

  it('should compile power to ** operator', () => {
    const ast = binary('^', literal(2), literal(3));
    assert.strictEqual(compileToPython(ast), wrapPy('2 ** 3'));
  });
});

describe('Python Compiler - Comparison Operators', () => {
  it('should compile less than', () => {
    const ast = binary('<', literal(5), literal(10));
    assert.strictEqual(compileToPython(ast), wrapPy('5 < 10'));
  });

  it('should compile greater than', () => {
    const ast = binary('>', literal(15), literal(10));
    assert.strictEqual(compileToPython(ast), wrapPy('15 > 10'));
  });

  it('should compile equality', () => {
    const ast = binary('==', literal(10), literal(10));
    assert.strictEqual(compileToPython(ast), wrapPy('10 == 10'));
  });

  it('should compile inequality', () => {
    const ast = binary('!=', literal(5), literal(10));
    assert.strictEqual(compileToPython(ast), wrapPy('5 != 10'));
  });
});

describe('Python Compiler - Logical Operators', () => {
  it('should compile AND to "and"', () => {
    const ast = binary('&&', literal(true), literal(false));
    assert.strictEqual(compileToPython(ast), wrapPy('True and False'));
  });

  it('should compile OR to "or"', () => {
    const ast = binary('||', literal(true), literal(false));
    assert.strictEqual(compileToPython(ast), wrapPy('True or False'));
  });

  it('should compile NOT to "not"', () => {
    const ast = unary('!', literal(true));
    assert.strictEqual(compileToPython(ast), wrapPy('not True'));
  });
});

describe('Python Compiler - Unary Operators', () => {
  it('should compile unary minus', () => {
    const ast = unary('-', literal(5));
    assert.strictEqual(compileToPython(ast), wrapPy('-5'));
  });

  it('should compile unary plus', () => {
    const ast = unary('+', literal(5));
    assert.strictEqual(compileToPython(ast), wrapPy('+5'));
  });
});

describe('Python Compiler - Operator Precedence', () => {
  it('should handle multiplication before addition', () => {
    const ast = binary('+', literal(2), binary('*', literal(3), literal(4)));
    assert.strictEqual(compileToPython(ast), wrapPy('2 + 3 * 4'));
  });

  it('should preserve precedence with nested expressions', () => {
    const ast = binary('*', binary('+', literal(2), literal(3)), literal(4));
    assert.strictEqual(compileToPython(ast), wrapPy('(2 + 3) * 4'));
  });

  it('should handle power with addition', () => {
    const ast = binary('+', binary('^', literal(2), literal(3)), literal(1));
    assert.strictEqual(compileToPython(ast), wrapPy('2 ** 3 + 1'));
  });
});

describe('Python Compiler - Let Expressions', () => {
  it('should compile simple let with walrus operator', () => {
    const ast = letExpr([{ name: 'x', value: literal(1) }], variable('x'));
    assert.strictEqual(compileToPython(ast), wrapPy('(x := 1, x)[-1]'));
  });

  it('should compile let with multiple bindings', () => {
    const ast = letExpr(
      [{ name: 'x', value: literal(1) }, { name: 'y', value: literal(2) }],
      binary('+', variable('x'), variable('y'))
    );
    assert.strictEqual(compileToPython(ast), wrapPy('(x := 1, y := 2, x + y)[-1]'));
  });
});

describe('Python Compiler - Date Arithmetic', () => {
  it('should compile date literal', () => {
    const ast = { type: 'date', value: '2024-01-15' } as const;
    assert.strictEqual(compileToPython(ast), wrapPy('_elo_dt(2024, 1, 15)'));
  });

  it('should compile datetime literal', () => {
    const ast = { type: 'datetime', value: '2024-01-15T10:30:00Z' } as const;
    assert.strictEqual(compileToPython(ast), wrapPy('_elo_dt(2024, 1, 15, 10, 30, 0)'));
  });

  it('should compile duration literal', () => {
    const ast = { type: 'duration', value: 'P1D' } as const;
    assert.strictEqual(compileToPython(ast), wrapPy('EloDuration.from_iso("P1D")'));
  });
});
