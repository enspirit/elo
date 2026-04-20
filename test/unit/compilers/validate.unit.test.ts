import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  assertNumericLiteral,
  assertSafeIdentifier,
  assertSafeDatapathSegment,
} from '../../../src/compilers/_validate';

describe('assertNumericLiteral', () => {
  it('accepts finite numbers', () => {
    assert.strictEqual(assertNumericLiteral(0), 0);
    assert.strictEqual(assertNumericLiteral(42), 42);
    assert.strictEqual(assertNumericLiteral(-3.14), -3.14);
  });

  it('throws on string-typed AST values (the AST-API injection primitive)', () => {
    assert.throws(
      () => assertNumericLiteral('1); alert(1); (1' as unknown),
      /Invalid numeric literal/
    );
  });

  it('throws on NaN and Infinity', () => {
    assert.throws(() => assertNumericLiteral(NaN), /Invalid numeric literal/);
    assert.throws(() => assertNumericLiteral(Infinity), /Invalid numeric literal/);
  });

  it('throws on objects, null, and undefined', () => {
    assert.throws(() => assertNumericLiteral(null), /Invalid numeric literal/);
    assert.throws(() => assertNumericLiteral(undefined), /Invalid numeric literal/);
    assert.throws(() => assertNumericLiteral({}), /Invalid numeric literal/);
  });
});

describe('assertSafeIdentifier', () => {
  it('accepts valid Elo identifiers', () => {
    for (const id of ['x', 'foo_bar', '_', '_p_Type', 'Camel', 'x0', 'a1b2c3']) {
      assert.strictEqual(assertSafeIdentifier(id, 'test'), id);
    }
  });

  it('rejects identifiers that would break out of emitter context', () => {
    const injections = [
      '_); alert("PWN"); (_',
      'x; DROP TABLE users; --',
      'a || b',
      'foo.bar',
      'foo bar',
      'x:1, y',
      '1badstart',
      '',
      'x-y',
    ];
    for (const bad of injections) {
      assert.throws(
        () => assertSafeIdentifier(bad, 'test'),
        /Invalid test/,
        `expected injection payload to be rejected: ${JSON.stringify(bad)}`
      );
    }
  });

  it('rejects non-string types', () => {
    assert.throws(() => assertSafeIdentifier(123 as unknown, 'test'), /Invalid test/);
    assert.throws(() => assertSafeIdentifier(null, 'test'), /Invalid test/);
    assert.throws(() => assertSafeIdentifier(undefined, 'test'), /Invalid test/);
  });
});

describe('assertSafeDatapathSegment', () => {
  it('accepts integer indices and identifier strings', () => {
    assert.strictEqual(assertSafeDatapathSegment(0), 0);
    assert.strictEqual(assertSafeDatapathSegment(42), 42);
    assert.strictEqual(assertSafeDatapathSegment('foo'), 'foo');
    assert.strictEqual(assertSafeDatapathSegment('foo_bar'), 'foo_bar');
  });

  it('rejects SQL injection payloads', () => {
    assert.throws(
      () => assertSafeDatapathSegment("a'; DROP TABLE users; --"),
      /Invalid datapath segment/
    );
  });

  it('rejects Ruby shell-exec payloads', () => {
    assert.throws(
      () => assertSafeDatapathSegment('a, system(`id`), :b'),
      /Invalid datapath segment/
    );
  });

  it('rejects non-integer numbers and non-identifier strings', () => {
    assert.throws(() => assertSafeDatapathSegment(3.14), /Invalid datapath segment/);
    assert.throws(() => assertSafeDatapathSegment('x.y'), /Invalid datapath segment/);
    assert.throws(() => assertSafeDatapathSegment(''), /Invalid datapath segment/);
  });
});

describe('AST API injection — compilers reject unsafe inputs', () => {
  const { compileToJavaScript } = require('../../../src/compilers/javascript');
  const { compileToRuby } = require('../../../src/compilers/ruby');
  const { compileToPython } = require('../../../src/compilers/python');
  const { compileToSQL } = require('../../../src/compilers/sql');

  it('rejects a string-valued numeric literal in every backend', () => {
    const evil = { type: 'literal', value: "1); alert(1); (1" };
    for (const compile of [compileToJavaScript, compileToRuby, compileToPython, compileToSQL]) {
      assert.throws(() => compile(evil), /Invalid numeric literal/);
    }
  });

  it('rejects an injection-bearing variable name in SQL', () => {
    const evil = { type: 'variable', name: '1; DROP TABLE users; --' };
    assert.throws(() => compileToSQL(evil), /Invalid variable name/);
  });

  it('rejects an injection-bearing member_access property in JS and Ruby', () => {
    const evil = {
      type: 'member_access',
      object: { type: 'variable', name: '_' },
      property: 'a || (alert(1), 1)',
    };
    assert.throws(() => compileToJavaScript(evil), /Invalid member_access property/);
    assert.throws(() => compileToRuby(evil), /Invalid member_access property/);
  });

  it('rejects an injection-bearing object_literal key in JS, Ruby, SQL', () => {
    const evil = { type: 'object', properties: [{ key: 'x, alert(1), y', value: { type: 'literal', value: 1 } }] };
    assert.throws(() => compileToJavaScript(evil), /Invalid object_literal key/);
    assert.throws(() => compileToRuby(evil), /Invalid object_literal key/);
    assert.throws(() => compileToSQL(evil), /Invalid object_literal key/);
  });

  it('rejects an injection-bearing datapath segment in all backends', () => {
    const evilRuby = { type: 'datapath', segments: ['a, system(`id`)'] };
    const evilSQL = { type: 'datapath', segments: ["a', (SELECT version()), 'b"] };
    assert.throws(() => compileToRuby(evilRuby), /Invalid datapath segment/);
    assert.throws(() => compileToSQL(evilSQL), /Invalid datapath segment/);
  });

  it('rejects an injection-bearing lambda parameter name in JS, Ruby, Python', () => {
    const evil = { type: 'lambda', params: [{ name: 'x); alert(1); (' }], body: { type: 'literal', value: 1 } };
    assert.throws(() => compileToJavaScript(evil), /Invalid lambda parameter/);
    assert.throws(() => compileToRuby(evil), /Invalid lambda parameter/);
    assert.throws(() => compileToPython(evil), /Invalid lambda parameter/);
  });

  it('rejects an injection-bearing let binding name in all backends', () => {
    const evil = {
      type: 'let',
      bindings: [{ name: 'x; alert(1); y', value: { type: 'literal', value: 1 } }],
      body: { type: 'literal', value: 0 },
    };
    assert.throws(() => compileToJavaScript(evil), /Invalid let binding name/);
    assert.throws(() => compileToRuby(evil), /Invalid let binding name/);
    assert.throws(() => compileToPython(evil), /Invalid let binding name/);
    assert.throws(() => compileToSQL(evil), /Invalid let binding name/);
  });
});
