import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parse, parseTypeExpr } from '../../src/parser';
import { typecheck, typecheckWithType, formatDiagnostic, Diagnostic } from '../../src/typecheck';
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
    'map(_, fn(x ~> upper(x)))',
    'length(first(_))',
    'upper(at(_, 0))',
  ];

  for (const source of opaque) {
    it(`accepts ${source}`, () => {
      assert.deepStrictEqual(check(source), []);
    });
  }

  it('still reports a mistake made next to an opaque argument', () => {
    assert.deepStrictEqual(codes('upper(_) + upper(42)'), ['no-matching-signature']);
  });

  it('stops suppressing once the element type is known', () => {
    // The same expressions over a list literal are reportable, because the
    // element type is no longer a guess.
    assert.deepStrictEqual(codes('map([1, 2], fn(x ~> upper(x)))'), ['no-matching-signature']);
    assert.deepStrictEqual(codes('length(first([1, 2]))'), ['no-matching-signature']);
    assert.deepStrictEqual(codes('upper(at([1], 0))'), ['no-matching-signature']);
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
      // One-directional on purpose: following a declared type, the checker may
      // know more than the transform, which types `_ |> X` as `any`. It must
      // never know *less*.
      if (fromTransform.kind === 'any') return;
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
      'let a = 1 in '.repeat(40) + 'a',
      'guard true in '.repeat(40) + '1',
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

describe('Typecheck - source locations', () => {
  function located(source: string) {
    return typecheck(parse(source, { locations: true }));
  }

  it('carries no location when the AST was parsed without them', () => {
    // Locations are opt-in; a checker fed a plain AST must still work, just
    // without being able to say where.
    const [diagnostic] = typecheck(parse('upper(42)'));
    assert.strictEqual(diagnostic.loc, undefined);
  });

  it('locates a bad call at its name', () => {
    const [diagnostic] = located('upper(42)');
    assert.deepStrictEqual(diagnostic.loc, { line: 1, column: 1 });
  });

  it('locates a bad operator at the operator', () => {
    //         1234567890
    // source: 'ab' - 5
    const [diagnostic] = located("'ab' - 5");
    assert.deepStrictEqual(diagnostic.loc, { line: 1, column: 6 });
  });

  it('locates each problem separately', () => {
    const diagnostics = located("upper(42) + year('x')");
    assert.deepStrictEqual(diagnostics.map((d) => d.loc?.column), [1, 13]);
  });

  it('locates a problem on the right line of a multi-line expression', () => {
    const diagnostics = located("1 +\n  upper(42)");
    assert.deepStrictEqual(diagnostics[0].loc, { line: 2, column: 3 });
  });

  it('locates a non-bool condition at the condition', () => {
    const [diagnostic] = located('if 42 then 1 else 2');
    assert.deepStrictEqual(diagnostic.loc, { line: 1, column: 1 });
  });

  it('locates a unary operator mistake', () => {
    const [diagnostic] = located("-'hello'");
    assert.deepStrictEqual(diagnostic.loc, { line: 1, column: 1 });
  });

  it('formats a diagnostic with its position', () => {
    const [diagnostic] = located('upper(42)');
    assert.match(formatDiagnostic(diagnostic), /^1:1: error: No signature of upper/);
    assert.match(formatDiagnostic(diagnostic), /\[no-matching-signature\]$/);
  });

  it('formats a diagnostic without a position when there is none', () => {
    const [diagnostic] = typecheck(parse('upper(42)'));
    assert.match(formatDiagnostic(diagnostic), /^error: No signature of upper/);
  });

  it('locates an unknown field at the field name', () => {
    //                                1234567890123456789012345678901234567890
    const source = 'let X = { a: Int }, k = _ |> X in k.bb';
    const [diagnostic] = located(source);
    assert.strictEqual(diagnostic.code, 'unknown-field');
    assert.strictEqual(diagnostic.loc?.column, source.indexOf('bb') + 1);
  });

  it('locates an invalid member access at the field name', () => {
    const source = 'let X = { d: Datetime }, k = _ |> X in k.toMillis';
    const [diagnostic] = located(source);
    assert.strictEqual(diagnostic.loc?.column, source.indexOf('toMillis') + 1);
  });

  it('locates an unknown type at the type name', () => {
    const [diagnostic] = located('let X = { a: Nope } in 1');
    assert.strictEqual(diagnostic.code, 'unknown-type');
    assert.deepStrictEqual(diagnostic.loc, { line: 1, column: 5 });
  });

  it('gives every diagnostic kind a position', () => {
    // A diagnostic without a position is only usable for a one-line -e, so
    // every kind the checker can emit must carry one.
    const sources = [
      'foo(1)',
      "upper('a', 'b')",
      'upper(42)',
      "'a' - 1",
      'if 42 then 1 else 2',
      'let X = { a: Int }, k = _ |> X in k.bb',
      'let X = { d: Date }, k = _ |> X in k.nope',
      'let X = { a: Nope } in 1',
    ];
    const seen = new Set<string>();
    for (const source of sources) {
      for (const diagnostic of located(source)) {
        seen.add(diagnostic.code);
        assert.ok(diagnostic.loc, `${diagnostic.code} has no location: ${source}`);
      }
    }
    assert.ok(seen.size >= 7, `only exercised ${seen.size} diagnostic kinds`);
  });
});

describe('Parser - opt-in locations', () => {
  it('produces a plain AST by default', () => {
    // The ~80 deepStrictEqual assertions in parser.unit.test.ts depend on this,
    // and so does toEloCode and any AST built by hand.
    assert.deepStrictEqual(parse('1 + 2'), {
      type: 'binary',
      operator: '+',
      left: { type: 'literal', value: 1 },
      right: { type: 'literal', value: 2 },
    });
  });

  it('attaches locations when asked', () => {
    const ast = parse('1 + 2', { locations: true }) as any;
    assert.deepStrictEqual(ast.loc, { line: 1, column: 3 });
  });

  it('tracks columns across a line', () => {
    const ast = parse('upper(1) + lower(2)', { locations: true }) as any;
    assert.deepStrictEqual(ast.left.loc, { line: 1, column: 1 });
    assert.deepStrictEqual(ast.right.loc, { line: 1, column: 12 });
  });

  it('tracks lines', () => {
    const ast = parse('upper(1)\n  + lower(2)', { locations: true }) as any;
    assert.strictEqual(ast.left.loc.line, 1);
    assert.strictEqual(ast.right.loc.line, 2);
  });

  it('leaves the compile path indifferent to locations', () => {
    // An AST with locations must compile to exactly the same code as one
    // without, or the feature would not be free.
    const plain = transform(parse("upper('a') + 'b'"));
    const withLocs = transform(parse("upper('a') + 'b'", { locations: true }));
    assert.strictEqual(inferType(plain).kind, inferType(withLocs).kind);
  });
});

describe('Typecheck - declared schemas', () => {
  /**
   * The idiomatic Elo program declares a schema and coerces `_` through it.
   * The runtime validates and coerces against that declaration — it raises on
   * a wrong type and on an extra attribute — so past the coercion the value
   * provably has the declared shape. These are the diagnostics that become
   * possible once the checker reads the declaration the compiler throws away.
   */
  const schema = 'let X = { foo: Int, label: String }, k = _ |> X in ';

  it('types a declared field', () => {
    assert.deepStrictEqual(check(`${schema}k.foo + 1`), []);
    assert.deepStrictEqual(check(`${schema}upper(k.label)`), []);
  });

  it('reports a field the schema does not declare', () => {
    const [diagnostic] = check(`${schema}k.fooo`);
    assert.strictEqual(diagnostic.code, 'unknown-field');
    assert.match(diagnostic.message, /'fooo' is not a field of/);
    assert.match(diagnostic.message, /Declared: foo, label/);
  });

  it('reports a declared field used at the wrong type', () => {
    const [diagnostic] = check(`${schema}upper(k.foo)`);
    assert.strictEqual(diagnostic.code, 'no-matching-signature');
    assert.match(diagnostic.message, /upper\(Int\)/);
  });

  it('reports an operator applied to a declared field', () => {
    assert.deepStrictEqual(codes(`${schema}k.label * k.label`), ['operator-type-mismatch']);
  });

  it('follows a path through nested schemas', () => {
    const nested = 'let A = { x: Int }, B = { a: A }, k = _ |> B in ';
    assert.deepStrictEqual(check(`${nested}k.a.x + 1`), []);
    assert.deepStrictEqual(codes(`${nested}upper(k.a.x)`), ['no-matching-signature']);
    assert.deepStrictEqual(codes(`${nested}k.a.y`), ['unknown-field']);
  });

  it('reports an unknown field on an ignored-extras schema too', () => {
    // `...` lets extra attributes in but strips them from the coerced value,
    // so the field cannot be read downstream either.
    const [diagnostic] = check('let X = { foo: Int, ... }, k = _ |> X in k.bar');
    assert.strictEqual(diagnostic.code, 'unknown-field');
    assert.match(diagnostic.message, /stripped from the coerced value/);
  });

  it('accepts an undeclared field when extras are typed', () => {
    // `...: Int` allows extras and says what they are.
    assert.deepStrictEqual(check('let X = { foo: Int, ...: Int }, k = _ |> X in k.bar + 1'), []);
  });

  it('types extras at the declared extras type', () => {
    assert.deepStrictEqual(
      codes('let X = { foo: Int, ...: Int }, k = _ |> X in upper(k.bar)'),
      ['no-matching-signature']
    );
  });

  it('treats an optional field as possibly null', () => {
    // See the strict-null suite below: `:?` makes the field `Int|Null`, so
    // using it as an Int is reported and a null check or `|` clears it.
    assert.deepStrictEqual(codes('let X = { a :? Int }, k = _ |> X in k.a + 1'), [
      'nullable-misuse',
    ]);
    assert.deepStrictEqual(check('let X = { a :? Int }, k = _ |> X in (k.a | 0) + 1'), []);
  });

  it('reports reading a field off something that has none', () => {
    const [diagnostic] = check('let X = { d: Datetime }, k = _ |> X in k.d.toMillis');
    assert.strictEqual(diagnostic.code, 'invalid-member-access');
    assert.match(diagnostic.message, /not available on Datetime/);
  });

  it('reports an unknown type name without giving up on the rest', () => {
    const diagnostics = check('let X = { a: Nope } in upper(42)');
    assert.deepStrictEqual(diagnostics.map((d) => d.code), [
      'unknown-type',
      'no-matching-signature',
    ]);
  });
});

describe('Typecheck - object literals are open', () => {
  it('types the keys it was written with', () => {
    assert.deepStrictEqual(codes('upper({ a: 1 }.a)'), ['no-matching-signature']);
    assert.deepStrictEqual(check("upper({ a: 'x' }.a)"), []);
  });

  it('says nothing about a key it does not have', () => {
    // Reading an absent key yields null, which is how Elo expresses absence
    // (`isNull({}.budget)`). Only a declared schema makes it reportable.
    assert.deepStrictEqual(check('isNull({}.budget)'), []);
    assert.deepStrictEqual(check('{ a: 1 }.b'), []);
  });
});

describe('Typecheck - element types', () => {
  it('types a list literal by its elements', () => {
    assert.deepStrictEqual(codes('map([1, 2], fn(x ~> upper(x)))'), ['no-matching-signature']);
    assert.deepStrictEqual(check("map(['a'], fn(x ~> upper(x)))"), []);
  });

  it('types a lambda parameter from a declared list', () => {
    assert.deepStrictEqual(
      codes('let X = [Int], k = _ |> X in map(k, fn(x ~> upper(x)))'),
      ['no-matching-signature']
    );
  });

  it('types a lambda parameter from a declared field', () => {
    const schema = 'let X = { xs: [String] }, k = _ |> X in ';
    assert.deepStrictEqual(check(`${schema}map(k.xs, fn(s ~> upper(s)))`), []);
    assert.deepStrictEqual(codes(`${schema}map(k.xs, fn(s ~> s + 1))`), ['operator-type-mismatch']);
  });

  it('types the result of map from the lambda body', () => {
    assert.deepStrictEqual(
      codes("map([1, 2], fn(x ~> String(x))) |> join(', ') |> upper |> year"),
      ['no-matching-signature']
    );
  });

  it('types reduce from the seed and the element', () => {
    assert.deepStrictEqual(check('reduce([1, 2], 0, fn(acc, x ~> acc + x))'), []);
    assert.deepStrictEqual(
      codes("reduce([1, 2], 'seed', fn(acc, x ~> acc + x))"),
      ['operator-type-mismatch']
    );
  });

  it('keeps the element type through list transforms', () => {
    assert.deepStrictEqual(codes("upper(first(sort(['a', 'b'])))"), []);
    assert.deepStrictEqual(codes('upper(first(sort([1, 2])))'), ['no-matching-signature']);
  });

  it('takes a level of nesting off flat', () => {
    assert.deepStrictEqual(codes('upper(first(flat([[1], [2]])))'), ['no-matching-signature']);
  });

  it('gives a mixed list a union element type', () => {
    // [1, 'a'] really is a list of Int|String, so upper() is wrong for one of
    // the two members and worth reporting.
    assert.deepStrictEqual(codes("map([1, 'a'], fn(x ~> upper(x)))"), ['no-matching-signature']);
    assert.deepStrictEqual(check("map([1, 'a'], fn(x ~> String(x)))"), []);
  });
});

describe('Typecheck - unions', () => {
  it('accepts an operation every member supports', () => {
    assert.deepStrictEqual(check('let X = { x: Int|Float }, k = _ |> X in k.x + 1'), []);
  });

  it('reports an operation some member does not support', () => {
    const [diagnostic] = check('let X = { x: Int|String }, k = _ |> X in k.x + 1');
    assert.strictEqual(diagnostic.code, 'operator-type-mismatch');
    assert.match(diagnostic.message, /from Int\|String/);
  });

  it('collapses a union of one', () => {
    assert.deepStrictEqual(codes('let X = { x: Int|Int }, k = _ |> X in upper(k.x)'), [
      'no-matching-signature',
    ]);
  });
});

describe('Typecheck - subtype constraints', () => {
  it('checks the predicate against the base type', () => {
    assert.deepStrictEqual(check('let X = Int(i | i > 0) in 1'), []);
    assert.deepStrictEqual(codes('let X = Int(i | upper(i)) in 1'), ['no-matching-signature']);
  });

  it('requires the predicate to be a Bool', () => {
    assert.deepStrictEqual(codes('let X = Int(i | i + 1) in 1'), ['non-bool-condition']);
  });

  it('types a value coerced through a constrained type as its base', () => {
    assert.deepStrictEqual(check('let X = Int(i | i > 0), k = _ |> X in k + 1'), []);
    assert.deepStrictEqual(codes('let X = Int(i | i > 0), k = _ |> X in upper(k)'), [
      'no-matching-signature',
    ]);
  });
});

describe('Typecheck - refinements may only sharpen', () => {
  /**
   * The element-aware refinements in the checker are a second source of type
   * information alongside typedefs.ts, which is exactly the kind of thing that
   * drifts. The invariant that keeps it honest: a refined type must project
   * back to the same flat type the signature table returned, so a refinement
   * can add precision but never contradict.
   */
  const cases: Array<[string, string]> = [
    ["sort(['a'])", 'array'],
    ["reverse([1])", 'array'],
    ['unique([1])', 'array'],
    ["filter([1], fn(x ~> x > 0))", 'array'],
    ["sortBy([1], fn(x ~> x))", 'array'],
    ["map([1], fn(x ~> String(x)))", 'array'],
    ['flat([[1]])', 'array'],
    ['first([1])', 'int'],
    ['last([1])', 'int'],
    ['at([1], 0)', 'int'],
    ['min([1])', 'int'],
    ['max([1])', 'int'],
    ['sum([1])', 'int'],
    ["find([1], fn(x ~> x > 0))", 'int'],
  ];

  for (const [source, kind] of cases) {
    it(`${source} refines to ${kind} and still projects there`, () => {
      const ast = parse(source);
      assert.strictEqual(typeOf(source), kind);
      // Whatever the refinement knows, the transform must not disagree where
      // it has an opinion of its own.
      const fromTransform = inferType(transform(ast));
      if (fromTransform.kind !== 'any') {
        assert.strictEqual(typecheckWithType(ast).type.kind, fromTransform.kind);
      }
    });
  }
});

describe('Typecheck - strict mode', () => {
  /**
   * Without strict, an unknown argument type buys silence, which is what keeps
   * the checker quiet about an uncoerced `_`. Strict mode turns that silence
   * into a diagnostic, so it reads as a contract: *declare your input*.
   */
  function strict(source: string): string[] {
    return typecheck(parse(source), { strict: true }).map((d) => d.code);
  }

  it('reports a call that needs a type it cannot see', () => {
    assert.deepStrictEqual(strict('upper(_)'), ['unresolved-any']);
    assert.deepStrictEqual(check('upper(_)'), []);
  });

  it('reports reading a field of something unknown', () => {
    assert.deepStrictEqual(strict('_.foo'), ['unresolved-any']);
  });

  it('says how to satisfy it', () => {
    const [diagnostic] = typecheck(parse('upper(_)'), { strict: true });
    assert.match(diagnostic.message, /Coerce the input through a declared type/);
  });

  it('is satisfied by a declared schema', () => {
    assert.deepStrictEqual(
      strict('let X = { foo: String }, k = _ |> X in upper(k.foo)'),
      []
    );
  });

  it('stays quiet for functions that genuinely accept anything', () => {
    // No special-casing: isNull, isNotNull, typeOf and fetch declare `any`
    // signatures in the type table, so they resolve before the strict check is
    // ever reached.
    for (const source of ['isNull(_)', 'isNotNull(_)', 'typeOf(_)', "fetch(_, 'a')"]) {
      assert.deepStrictEqual(strict(source), [], source);
    }
  });

  it('reports assert on an unknown value', () => {
    // `assert` is declared on Bool, not on Any — asserting a non-condition is
    // a mistake, and Python refuses to compile `assert(1)`. So under strict
    // mode an argument of unknown type is reported, consistently with the rest
    // of the mode: declare your input.
    assert.deepStrictEqual(strict('assert(_)'), ['unresolved-any']);
    assert.deepStrictEqual(check('assert(_)'), []);
    assert.deepStrictEqual(strict('assert(1 > 0)'), []);
  });

  it('reports asserting something that is not a condition', () => {
    assert.deepStrictEqual(codes('assert(1)'), ['no-matching-signature']);
  });

  it('says nothing about a fully typed program', () => {
    assert.deepStrictEqual(strict("upper('a') + String(1)"), []);
  });

  it('still reports ordinary mistakes', () => {
    assert.deepStrictEqual(strict('upper(42)'), ['no-matching-signature']);
  });
});

describe('Typecheck - declaring the input type', () => {
  function withInput(source: string, type: string, strict = false): string[] {
    return typecheck(parse(source), { inputType: parseTypeExpr(type), strict }).map((d) => d.code);
  }

  it('types _ as declared', () => {
    assert.deepStrictEqual(withInput('upper(_)', 'String'), []);
    assert.deepStrictEqual(withInput('upper(_)', 'Int'), ['no-matching-signature']);
  });

  it('types the fields of a declared input schema', () => {
    assert.deepStrictEqual(withInput('_.total * 2', '{ total: Int }'), []);
    assert.deepStrictEqual(withInput('upper(_.total)', '{ total: Int }'), ['no-matching-signature']);
  });

  it('reports a field the declared input does not have', () => {
    assert.deepStrictEqual(withInput('_.totl', '{ total: Int }'), ['unknown-field']);
  });

  it('satisfies strict mode', () => {
    assert.deepStrictEqual(withInput('upper(_)', 'String', true), []);
  });

  it('accepts a list input', () => {
    assert.deepStrictEqual(withInput('map(_, fn(x ~> upper(x)))', '[String]'), []);
    assert.deepStrictEqual(
      withInput('map(_, fn(x ~> upper(x)))', '[Int]'),
      ['no-matching-signature']
    );
  });

  it('is one spelling of a schema, shared with _ |> X', () => {
    // The in-language form and the host-supplied form must agree.
    const viaLanguage = typecheck(parse('let X = { a: Int }, k = _ |> X in upper(k.a)'));
    const viaOption = typecheck(parse('upper(_.a)'), {
      inputType: parseTypeExpr('{ a: Int }'),
    });
    assert.deepStrictEqual(
      viaLanguage.map((d) => d.code),
      viaOption.map((d) => d.code)
    );
  });
});

describe('Typecheck - optional fields may be null', () => {
  /**
   * `:?` is the author's own statement that a field may be absent, so the
   * checker treats it as `T|Null` and reports using it as a T. Null is a bug
   * factory; this is the one place the checker insists.
   *
   * Which forces the checker's only flow sensitivity: without narrowing, every
   * correct program that *does* handle the null would be a false positive.
   */
  const schema = 'let X = { a :? Int, b :? Int, s: String }, k = _ |> X in ';

  it('reports using an optional field as its declared type', () => {
    const [diagnostic] = check(`${schema}k.a + 1`);
    assert.strictEqual(diagnostic.code, 'nullable-misuse');
    assert.match(diagnostic.message, /does not accept a value that may be null/);
  });

  it('says how to handle it', () => {
    const [diagnostic] = check(`${schema}k.a + 1`);
    assert.match(diagnostic.message, /'x \| fallback'/);
    assert.match(diagnostic.message, /isNotNull\(x\)/);
  });

  it('leaves a required field alone', () => {
    assert.deepStrictEqual(check(`${schema}upper(k.s)`), []);
  });

  it('accepts a null-accepting function', () => {
    assert.deepStrictEqual(check(`${schema}isNull(k.a)`), []);
    assert.deepStrictEqual(check(`${schema}isNotNull(k.a)`), []);
    assert.deepStrictEqual(check(`${schema}typeOf(k.a)`), []);
  });

  describe('narrowing', () => {
    it('accepts an | fallback', () => {
      assert.deepStrictEqual(check(`${schema}(k.a | 0) + 1`), []);
    });

    it('accepts the else branch of an isNull test', () => {
      assert.deepStrictEqual(check(`${schema}if isNull(k.a) then 0 else k.a + 1`), []);
    });

    it('accepts the then branch of an isNotNull test', () => {
      assert.deepStrictEqual(check(`${schema}if isNotNull(k.a) then k.a + 1 else 0`), []);
    });

    it('accepts a guard', () => {
      assert.deepStrictEqual(check(`${schema}guard isNotNull(k.a) in k.a + 1`), []);
    });

    it('accepts an && chain of guards', () => {
      assert.deepStrictEqual(
        check(`${schema}guard isNotNull(k.a) && isNotNull(k.b) in k.a + k.b`),
        []
      );
    });

    it('narrows only the path that was checked', () => {
      assert.deepStrictEqual(codes(`${schema}guard isNotNull(k.a) in k.b + 1`), [
        'nullable-misuse',
      ]);
    });

    it('does not narrow the wrong branch', () => {
      assert.deepStrictEqual(codes(`${schema}if isNull(k.a) then k.a + 1 else 0`), [
        'nullable-misuse',
      ]);
    });

    it('stops narrowing outside the region', () => {
      assert.deepStrictEqual(
        codes(`${schema}(if isNotNull(k.a) then k.a + 1 else 0) + k.a`),
        ['nullable-misuse']
      );
    });

    it('establishes nothing from an || of null checks', () => {
      // `isNotNull(a) || isNotNull(b)` says nothing certain about either, and
      // the checker deliberately does no boolean algebra.
      assert.deepStrictEqual(
        codes(`${schema}guard isNotNull(k.a) || isNotNull(k.b) in k.a + 1`),
        ['nullable-misuse']
      );
    });

    it('narrows a nested path', () => {
      const nested = 'let A = { x :? Int }, B = { a: A }, k = _ |> B in ';
      assert.deepStrictEqual(codes(`${nested}k.a.x + 1`), ['nullable-misuse']);
      assert.deepStrictEqual(check(`${nested}guard isNotNull(k.a.x) in k.a.x + 1`), []);
    });

    it('narrows a plain variable', () => {
      const bound = `${schema}let v = k.a in `;
      assert.deepStrictEqual(codes(`${bound}v + 1`), ['nullable-misuse']);
      assert.deepStrictEqual(check(`${bound}guard isNotNull(v) in v + 1`), []);
    });
  });

  it('types an | fallback as non-null', () => {
    // The result of `a | b` is never null, which is what makes it the compact
    // way to handle an optional field.
    assert.strictEqual(
      typecheckWithType(parse(`${schema}k.a | 0`)).type.kind,
      'int'
    );
  });
});
