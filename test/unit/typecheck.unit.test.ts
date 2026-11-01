import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parse } from '../../src/parser';
import { typecheck, typecheckWithType, Diagnostic } from '../../src/typecheck';
import { transform } from '../../src/transform';
import { inferType } from '../../src/ir';
import { Types } from '../../src/types';

function check(source: string): Diagnostic[] {
  return typecheck(parse(source));
}

function codes(source: string): string[] {
  return check(source).map((d) => d.code);
}

function typeOf(source: string): string {
  return typecheckWithType(parse(source)).type.kind;
}

describe('Typecheck - clean programs', () => {
  const clean = [
    '1 + 2',
    '1.5 * 2',
    "'hello' + ' world'",
    "upper('hello')",
    'length([1, 2, 3])',
    'TODAY + P1D',
    'NOW - PT1H',
    'year(TODAY)',
    'inDays(P2D - P1D)',
    "startsWith('abc', 'a')",
    'if 1 > 2 then 1 else 2',
    'let x = 1 in x + 1',
    'let f = fn(x ~> x + 1) in f(2)',
    'map([1, 2], fn(x ~> x * 2))',
    "{ name: 'a', age: 1 }",
    "[1, 2, 3] | 'fallback'",
    "guard 1 > 0 in 'ok'",
    "let X = { foo: Int }, k = _ |> X in k.foo",
    "Int('42') + 1",
    "year(Date('2020-01-01'))",
    "min('a', 'b')",
    "5 in 1..10",
  ];

  for (const source of clean) {
    it(`accepts ${source}`, () => {
      assert.deepStrictEqual(check(source), []);
    });
  }
});

describe('Typecheck - unknown functions', () => {
  it('reports a name no signature knows', () => {
    const diagnostics = check('foo(1)');
    assert.strictEqual(diagnostics.length, 1);
    assert.strictEqual(diagnostics[0].code, 'unknown-function');
    assert.match(diagnostics[0].message, /Unknown function foo\(Int\)/);
  });

  it('reports an unknown name even with an opaque argument', () => {
    // The name is wrong whatever the argument turns out to be, so `any` does
    // not excuse it.
    assert.deepStrictEqual(codes('foo(_)'), ['unknown-function']);
  });
});

describe('Typecheck - arity', () => {
  it('reports too many arguments', () => {
    const diagnostics = check("upper('a', 'b')");
    assert.strictEqual(diagnostics[0].code, 'wrong-arity');
    assert.match(diagnostics[0].message, /upper takes 1 argument\(s\), got 2/);
  });

  it('reports too few arguments', () => {
    assert.deepStrictEqual(codes("startsWith('a')"), ['wrong-arity']);
  });

  it('lists every accepted arity', () => {
    // sum takes 1 or 2 arguments.
    const diagnostics = check('sum([1], 2, 3)');
    assert.match(diagnostics[0].message, /sum takes 1 or 2 argument\(s\), got 3/);
  });
});

describe('Typecheck - argument types', () => {
  it('reports a stdlib call no signature accepts', () => {
    const diagnostics = check('upper(42)');
    assert.strictEqual(diagnostics[0].code, 'no-matching-signature');
    assert.match(diagnostics[0].message, /No signature of upper accepts upper\(Int\)/);
  });

  it('suggests the signatures that do exist', () => {
    const diagnostics = check("year('hello')");
    assert.match(diagnostics[0].message, /Known: year\(Date\), year\(Datetime\)/);
  });

  it('only suggests signatures of the right arity', () => {
    // `round` has both round(Float) and round(Float, Int); a one-argument
    // mistake should not be answered with the two-argument form.
    const diagnostics = check("round('x')");
    assert.match(diagnostics[0].message, /Known: round\(Int\), round\(Float\)$/);
  });

  const mismatches = [
    'upper(42)',
    'length(42)',
    "year('hello')",
    'inDays(42)',
    "abs('x')",
    "substring('abc', 'x', 'y')",
    "startsWith(42, 1)",
  ];
  for (const source of mismatches) {
    it(`reports ${source}`, () => {
      assert.deepStrictEqual(codes(source), ['no-matching-signature']);
    });
  }
});

describe('Typecheck - operators', () => {
  const mismatches: Array<[string, string]> = [
    ["'hello' - 5", "sub(String, Int)"],
    ["1 + 'a'", 'add(Int, String)'],
    ["[1, 2] + 'x'", 'add(Array, String)'],
    ["today() + 'str'", 'add(Date, String)'],
    ["-'hello'", 'neg(String)'],
    ['!42', 'not(Int)'],
    ["'a' * 'b'", 'mul(String, String)'],
    ['TODAY * 2', 'mul(Date, Int)'],
  ];

  for (const [source, signature] of mismatches) {
    it(`reports ${source}`, () => {
      const diagnostics = check(source);
      assert.strictEqual(diagnostics[0].code, 'operator-type-mismatch');
      assert.ok(
        diagnostics[0].message.includes(signature),
        `expected ${signature} in: ${diagnostics[0].message}`
      );
    });
  }

  it('names the operator the author wrote, not the function it becomes', () => {
    const diagnostics = check("'hello' - 5");
    assert.match(diagnostics[0].message, /operator '-'/);
  });

  it('accepts comparison of anything, which Elo allows by design', () => {
    assert.deepStrictEqual(check("'a' < 1"), []);
    assert.deepStrictEqual(check('TODAY == 1'), []);
  });
});

describe('Typecheck - conditions must be Bool', () => {
  it('reports a non-bool if condition', () => {
    const diagnostics = check('if 42 then 1 else 2');
    assert.strictEqual(diagnostics[0].code, 'non-bool-condition');
    assert.match(diagnostics[0].message, /if condition must be Bool, got Int/);
  });

  it('reports a non-bool guard condition', () => {
    assert.match(check('guard 42 in 1')[0].message, /guard condition must be Bool/);
  });

  it('names check separately from guard', () => {
    assert.match(check("check 'x' in 1")[0].message, /check condition must be Bool/);
  });

  it('accepts an opaque condition', () => {
    assert.deepStrictEqual(check('if _ then 1 else 2'), []);
  });
});

describe('Typecheck - any suppresses what cannot be known', () => {
  const opaque = [
    'upper(_)',
    'upper(_.name)',
    '_ + 1',
    "_ - 'a'",
    '!_',
    'map([1, 2], fn(x ~> upper(x)))',
    'length(first([1, 2]))',
    'upper(at([1], 0))',
  ];

  for (const source of opaque) {
    it(`accepts ${source}`, () => {
      assert.deepStrictEqual(check(source), []);
    });
  }

  it('still reports a mistake made next to an opaque argument', () => {
    assert.deepStrictEqual(codes('upper(_) + upper(42)'), ['no-matching-signature']);
  });
});

describe('Typecheck - reports every problem in one pass', () => {
  it('reports both halves of a sum', () => {
    // This is what the transform structurally cannot do: it throws on the
    // first hard error, so only one problem is ever visible.
    assert.deepStrictEqual(codes("year('a') + length(2)"), [
      'no-matching-signature',
      'no-matching-signature',
    ]);
  });

  it('reports a mistake in every binding of a let', () => {
    assert.strictEqual(codes("let a = upper(1), b = year('x') in a").length, 2);
  });

  it('reports a mistake in both branches of an if', () => {
    assert.strictEqual(codes("if true then upper(1) else year('x')").length, 2);
  });

  it('reports a mistake inside a lambda body', () => {
    assert.deepStrictEqual(codes('map([1], fn(x ~> upper(42)))'), ['no-matching-signature']);
  });

  it('does not cascade one mistake into many', () => {
    // upper(42) is typed `any` after being reported, so enclosing calls stay
    // quiet instead of each adding noise.
    assert.strictEqual(codes('length(trim(upper(42)))').length, 1);
  });
});

describe('Typecheck - inferred types', () => {
  const types: Array<[string, string]> = [
    ['42', 'int'],
    ['1.5', 'float'],
    ['1.0', 'float'],
    ['true', 'bool'],
    ["'x'", 'string'],
    ['null', 'null'],
    ['D2020-01-01', 'date'],
    ['D2020-01-01T10:00:00Z', 'datetime'],
    ['P1D', 'duration'],
    ['1 + 2', 'int'],
    ['1 + 2.0', 'float'],
    ['1 / 2', 'float'],
    ['TODAY', 'date'],
    ['NOW', 'datetime'],
    ['TOMORROW', 'date'],
    ['SOW', 'datetime'],
    ['BOT', 'datetime'],
    ['TODAY - YESTERDAY', 'duration'],
    ["upper('a')", 'string'],
    ["length('a')", 'int'],
    ['[1, 2]', 'array'],
    ['{ a: 1 }', 'object'],
    ['fn(x ~> x)', 'fn'],
    ['.a.b', 'fn'],
    ['let x = 1 in x', 'int'],
    ["if true then 'a' else 'b'", 'string'],
    ['1 > 2', 'bool'],
    ["Int('42')", 'int'],
    ["Date('2020-01-01')", 'date'],
    ["String(42)", 'string'],
    ['_', 'any'],
    ['_.a', 'any'],
    ['avg([1, 2])', 'float'],
    ['round(1.5)', 'int'],
    ['round(1.5, 2)', 'float'],
  ];

  for (const [source, kind] of types) {
    it(`types ${source} as ${kind}`, () => {
      assert.strictEqual(typeOf(source), kind);
    });
  }

  it('types a reported node as any so the mistake does not spread', () => {
    assert.strictEqual(typeOf('upper(42)'), 'any');
  });
});

describe('Typecheck - agrees with the transform', () => {
  /**
   * The checker and the transform are two separate walks that must not drift:
   * if they disagree, the checker would bless a program the compiler rejects.
   * The type knowledge is shared (typedefs.ts), so only the walk can drift —
   * and this is what catches it.
   *
   * The fixture corpus is checked the same way in the integration suite; these
   * cases cover one of each AST node kind, which fixtures do not all exercise.
   */
  const sources = [
    '42',
    '1.0',
    "'x'",
    'null',
    'D2020-01-01',
    'D2020-01-01T10:00:00Z',
    'P1D',
    'TODAY',
    'NOW',
    'SOD',
    'EOT',
    '1 + 2',
    '1 + 2.0',
    '1 / 2',
    '-5',
    '!true',
    '1 > 2',
    "'a' + 'b'",
    'TODAY + P1D',
    'NOW - PT1H',
    'TODAY - YESTERDAY',
    "upper('a')",
    'length([1])',
    'avg([1, 2])',
    'round(1.5, 2)',
    "Int('42')",
    "Date('2020-01-01')",
    'Interval({ start: NOW, end: NOW })',
    '[1, 2]',
    '{ a: 1 }',
    'fn(x ~> x)',
    '.a.b',
    'let x = 1 in x + 1',
    'let f = fn(x ~> x) in f(1)',
    "if true then 'a' else 'b'",
    "1 | 'fallback'",
    '_ | 1',
    '_',
    '_.a',
    'map([1], fn(x ~> x))',
    "guard 1 > 0 in 'ok'",
    'let X = { foo: Int } in 1',
    "let X = { foo: Int }, k = _ |> X in k.foo",
    'let X = Int(i | i > 0) in 1',
    '5 in 1..10',
    "fetch(_, 'a')",
  ];

  for (const source of sources) {
    it(`infers the same type as the transform for ${source}`, () => {
      const ast = parse(source);
      const fromChecker = typecheckWithType(ast).type;
      const fromTransform = inferType(transform(ast));
      assert.strictEqual(
        fromChecker.kind,
        fromTransform.kind,
        `checker says ${fromChecker.kind}, transform says ${fromTransform.kind}`
      );
    });
  }
});

describe('Typecheck - robustness', () => {
  it('never throws, whatever the expression', () => {
    // The checker runs at compile time, so it carries the same obligation as
    // the parser and the transform: hostile input must yield a diagnostic, not
    // a crash.
    const hostile = [
      '1 + '.repeat(50) + '1',
      '[['.repeat(40) + ']]'.repeat(40),
      // Kept at 8 levels on purpose: the parser is exponential in nested
      // `let … in` (see .claude/tasks/todo/0092), so a deeper case would time
      // out in the parser before the checker ever ran. Raise it once fixed.
      'let a = 1 in '.repeat(8) + 'a',
      'fn(x ~> '.repeat(30) + 'x' + ')'.repeat(30),
      '{ a: { a: { a: 1 } } }',
      '.a.b.c.d.e',
      'upper(upper(upper(42)))',
      "if _ then upper(1) else year('x')",
    ];
    for (const source of hostile) {
      let ast;
      try {
        ast = parse(source);
      } catch {
        continue; // a parse error is the parser's business, not the checker's
      }
      assert.doesNotThrow(() => typecheck(ast), `threw on: ${source.slice(0, 40)}`);
    }
  });

  it('stops at the depth guard instead of overflowing the stack', () => {
    const deep = parse('1 + '.repeat(60) + '1');
    const diagnostics = typecheck(deep, { maxDepth: 5 });
    assert.ok(diagnostics.some((d) => d.code === 'nesting-too-deep'));
  });

  it('guards deeply nested type expressions too', () => {
    const nested = parse(`let X = ${'['.repeat(20)}Int${']'.repeat(20)} in 1`);
    assert.doesNotThrow(() => typecheck(nested, { maxDepth: 5 }));
  });

  it('reports an empty diagnostic list rather than null for a clean program', () => {
    assert.deepStrictEqual(typecheck(parse('1')), []);
  });
});

describe('Typecheck - options', () => {
  it('types an undefined variable as any', () => {
    // Rejecting undefined variables is the transform's job (it keeps host
    // globals out of reach); the checker only needs a type for them.
    assert.strictEqual(typecheckWithType(parse('someColumn + 1')).type.kind, 'any');
  });

  it('accepts a bare column reference, as the SQL target produces', () => {
    assert.deepStrictEqual(
      typecheck(parse("upper(someColumn)"), { allowUndefinedVariables: true }),
      []
    );
  });
});

describe('Typecheck - does not touch the compile path', () => {
  it('leaves the AST unchanged', () => {
    const ast = parse("upper(42) + year('x')");
    const before = JSON.stringify(ast);
    typecheck(ast);
    assert.strictEqual(JSON.stringify(ast), before);
  });

  it('reports on a program the compilers still compile', () => {
    // Checking is advisory: a reported program is not blocked from compiling.
    const ast = parse("'hello' - 5");
    assert.strictEqual(typecheck(ast).length, 1);
    assert.doesNotThrow(() => transform(ast));
  });

  it('types Types.any for the input variable, as the transform does', () => {
    assert.strictEqual(typecheckWithType(parse('_')).type, Types.any);
  });
});
