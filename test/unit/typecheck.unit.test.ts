import { describe, it } from 'node:test';
import assert from 'node:assert';
import { transform } from '../../src/transform';
import { TypeCheckCollector } from '../../src/typecheck';
import {
  literal,
  stringLiteral,
  variable,
  binary,
  unary,
  functionCall,
  memberAccess,
  letExpr,
  lambda,
} from '../../src/ast';

describe('typecheck - type mismatches', () => {
  it('warns on string - int (no matching signature)', () => {
    const checker = new TypeCheckCollector();
    transform(binary('-', stringLiteral('hello'), literal(5)), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), true);
    assert.strictEqual(checker.warnings.length, 1);
    assert.strictEqual(checker.warnings[0].category, 'type_mismatch');
    assert.match(checker.warnings[0].message, /No matching signature for sub\(string, int\)/);
  });

  it('warns on bool + bool (no matching signature)', () => {
    const checker = new TypeCheckCollector();
    transform(binary('+', literal(true), literal(false)), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), true);
    assert.strictEqual(checker.warnings.length, 1);
    assert.strictEqual(checker.warnings[0].category, 'type_mismatch');
    assert.match(checker.warnings[0].message, /No matching signature for add\(bool, bool\)/);
  });

  it('no warning for int + int (valid signature)', () => {
    const checker = new TypeCheckCollector();
    transform(binary('+', literal(1), literal(2)), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), false);
  });

  it('no warning for string + string (valid signature)', () => {
    const checker = new TypeCheckCollector();
    transform(binary('+', stringLiteral('a'), stringLiteral('b')), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), false);
  });
});

describe('typecheck - any type warnings', () => {
  it('warns when left operand is any', () => {
    const checker = new TypeCheckCollector();
    // _.x + 1 should warn about any type
    transform(binary('+', memberAccess(variable('_'), 'x'), literal(1)), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), true);
    assert.strictEqual(checker.warnings[0].category, 'any_type');
    assert.match(checker.warnings[0].message, /Operation involves 'any' type: add\(any, int\)/);
  });

  it('warns when right operand is any', () => {
    const checker = new TypeCheckCollector();
    // 1 + _.x should warn about any type
    transform(binary('+', literal(1), memberAccess(variable('_'), 'x')), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), true);
    assert.strictEqual(checker.warnings[0].category, 'any_type');
    assert.match(checker.warnings[0].message, /Operation involves 'any' type: add\(int, any\)/);
  });

  it('warns when both operands are any', () => {
    const checker = new TypeCheckCollector();
    // _.x + _.y should warn about any type
    transform(binary('+', memberAccess(variable('_'), 'x'), memberAccess(variable('_'), 'y')), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), true);
    assert.strictEqual(checker.warnings[0].category, 'any_type');
    assert.match(checker.warnings[0].message, /Operation involves 'any' type: add\(any, any\)/);
  });

  it('warns on unary operator with any type', () => {
    const checker = new TypeCheckCollector();
    // -_.x should warn about any type
    transform(unary('-', memberAccess(variable('_'), 'x')), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), true);
    assert.strictEqual(checker.warnings[0].category, 'any_type');
    assert.match(checker.warnings[0].message, /Operation involves 'any' type: neg\(any\)/);
  });

  it('warns on function call with any argument', () => {
    const checker = new TypeCheckCollector();
    // upper(_.x) should warn about any type
    transform(functionCall('upper', [memberAccess(variable('_'), 'x')]), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), true);
    assert.strictEqual(checker.warnings[0].category, 'any_type');
    assert.match(checker.warnings[0].message, /Operation involves 'any' type: upper\(any\)/);
  });
});

describe('typecheck - unary operators', () => {
  it('no warning for negation of int', () => {
    const checker = new TypeCheckCollector();
    transform(unary('-', literal(5)), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), false);
  });

  it('no warning for negation of float', () => {
    const checker = new TypeCheckCollector();
    transform(unary('-', literal(3.14)), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), false);
  });

  it('no warning for not of bool', () => {
    const checker = new TypeCheckCollector();
    transform(unary('!', literal(true)), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), false);
  });

  it('warns on negation of string (no matching signature)', () => {
    const checker = new TypeCheckCollector();
    transform(unary('-', stringLiteral('hello')), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), true);
    assert.strictEqual(checker.warnings[0].category, 'type_mismatch');
    assert.match(checker.warnings[0].message, /No matching signature for neg\(string\)/);
  });
});

describe('typecheck - function calls', () => {
  it('no warning for length(string)', () => {
    const checker = new TypeCheckCollector();
    transform(functionCall('length', [stringLiteral('hello')]), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), false);
  });

  it('warns on upper(int) (type mismatch)', () => {
    const checker = new TypeCheckCollector();
    transform(functionCall('upper', [literal(42)]), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), true);
    assert.strictEqual(checker.warnings[0].category, 'type_mismatch');
    assert.match(checker.warnings[0].message, /No matching signature for upper\(int\)/);
  });
});

describe('typecheck - let expressions', () => {
  it('propagates types through let bindings', () => {
    const checker = new TypeCheckCollector();
    // let x = "hello" in -x should warn (negating string)
    transform(
      letExpr([{ name: 'x', value: stringLiteral('hello') }], unary('-', variable('x'))),
      new Map(), new Set(), { typeChecker: checker }
    );

    assert.strictEqual(checker.hasWarnings(), true);
    assert.strictEqual(checker.warnings[0].category, 'type_mismatch');
    assert.match(checker.warnings[0].message, /No matching signature for neg\(string\)/);
  });

  it('no warning when types are compatible', () => {
    const checker = new TypeCheckCollector();
    // let x = 5 in x + 1 should not warn
    transform(
      letExpr([{ name: 'x', value: literal(5) }], binary('+', variable('x'), literal(1))),
      new Map(), new Set(), { typeChecker: checker }
    );

    assert.strictEqual(checker.hasWarnings(), false);
  });
});

describe('typecheck - lambdas', () => {
  it('warns on lambda parameter (any type)', () => {
    const checker = new TypeCheckCollector();
    // fn(x ~> x + 1) - x is any, so should warn
    transform(lambda(['x'], binary('+', variable('x'), literal(1))), new Map(), new Set(), { typeChecker: checker });

    assert.strictEqual(checker.hasWarnings(), true);
    assert.strictEqual(checker.warnings[0].category, 'any_type');
    assert.match(checker.warnings[0].message, /Operation involves 'any' type: add\(any, int\)/);
  });
});

describe('typecheck - nested expressions', () => {
  it('collects multiple warnings', () => {
    const checker = new TypeCheckCollector();
    // (_.x + 1) + (_.y - 2) should have 2 warnings (both involve any)
    transform(
      binary('+',
        binary('+', memberAccess(variable('_'), 'x'), literal(1)),
        binary('-', memberAccess(variable('_'), 'y'), literal(2))
      ),
      new Map(), new Set(), { typeChecker: checker }
    );

    // Should have at least 2 warnings (one for each inner operation with any)
    assert.strictEqual(checker.warnings.length >= 2, true);
  });
});

describe('typecheck - no checker provided', () => {
  it('transform works without type checker', () => {
    // Should not throw, just work as before
    const ir = transform(binary('-', stringLiteral('hello'), literal(5)));
    assert.strictEqual(ir.type, 'call');
  });
});
