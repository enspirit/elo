/**
 * Type Specialization Tests
 *
 * These tests verify the type specialization feature in StdLib.lookup():
 * When argument types include 'any' (from lambda parameters, member access, etc.),
 * and no exact match is found through generalization, the lookup falls back to
 * finding any implementation with matching name and arity.
 *
 * This allows functions like abs(any) to find abs(int) or abs(float).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StdLib, typeGeneralizations, signatureKey } from '../../src/stdlib';
import { Types } from '../../src/types';
import { IRExpr, irInt, irVariable } from '../../src/ir';
import { compile } from '../../src/compile';
import { compileToJavaScript } from '../../src/compilers/javascript';
import { parse } from '../../src/parser';
import { DateTime, Duration } from 'luxon';

const runtime = { DateTime, Duration };

/** Helper: compile to JS (throws on error) */
function compileToJS(source: string): string {
  const ast = parse(source);
  return compileToJavaScript(ast);
}

describe('Type generalization (concrete → any)', () => {
  it('generalizes int to any', () => {
    const result = typeGeneralizations([Types.int]);
    assert.deepStrictEqual(result.map(ts => signatureKey('f', ts)), [
      'f:int',
      'f:any',
    ]);
  });

  it('generalizes [int, string] to all combinations', () => {
    const result = typeGeneralizations([Types.int, Types.string]);
    assert.deepStrictEqual(result.map(ts => signatureKey('f', ts)), [
      'f:int,string',
      'f:any,string',
      'f:int,any',
      'f:any,any',
    ]);
  });

  it('does NOT directly specialize any to concrete types', () => {
    const result = typeGeneralizations([Types.any]);
    // typeGeneralizations only returns [any], not [int], [float], etc.
    // The fallback mechanism in lookup() handles this
    assert.deepStrictEqual(result.map(ts => signatureKey('f', ts)), [
      'f:any',
    ]);
  });
});

describe('Type specialization fallback (any → concrete)', () => {
  it('finds abs(int) when called with abs(any)', () => {
    const lib = new StdLib<string>();
    lib.register('abs', [Types.int], () => 'abs_int');
    lib.register('abs', [Types.float], () => 'abs_float');

    // Looking up with concrete types works
    assert.strictEqual(lib.lookup('abs', [Types.int])?.([irInt(1)], null as any), 'abs_int');

    // Looking up with Any type now finds a matching implementation
    const absAny = lib.lookup('abs', [Types.any]);
    assert.ok(absAny, 'Should find an implementation for abs(any)');
    // It finds one of the registered implementations (order is implementation-dependent)
    const result = absAny?.([irVariable('x')], null as any);
    assert.ok(result === 'abs_int' || result === 'abs_float');
  });

  it('respects arity when finding specialization', () => {
    const lib = new StdLib<string>();
    lib.register('foo', [Types.int], () => 'foo_unary');
    lib.register('foo', [Types.int, Types.int], () => 'foo_binary');

    // foo(any) should find unary, not binary
    const fooAny = lib.lookup('foo', [Types.any]);
    assert.strictEqual(fooAny?.([irVariable('x')], null as any), 'foo_unary');

    // foo(any, any) should find binary, not unary
    const fooAnyAny = lib.lookup('foo', [Types.any, Types.any]);
    assert.strictEqual(fooAnyAny?.([irVariable('x'), irVariable('y')], null as any), 'foo_binary');
  });

  it('prefers explicit Any registration over fallback', () => {
    const lib = new StdLib<string>();
    lib.register('test', [Types.int], () => 'test_int');
    lib.register('test', [Types.any], () => 'test_any');

    // Should prefer the explicit Any registration
    const testAny = lib.lookup('test', [Types.any]);
    assert.strictEqual(testAny?.([irVariable('x')], null as any), 'test_any');
  });
});

describe('Compilation with Any types in lambdas', () => {
  describe('Numeric functions', () => {
    it('compiles abs inside lambda', () => {
      const js = compileToJS('[1, 2, 3] |> map(fn(x ~> abs(x)))');
      assert.ok(js.includes('Math.abs'));
    });

    it('compiles round inside lambda', () => {
      const js = compileToJS('[1.1, 2.2] |> map(fn(x ~> round(x)))');
      assert.ok(js.includes('round') || js.includes('Math.round') || js.includes('=> x'));
    });

    it('compiles floor inside lambda', () => {
      const js = compileToJS('[1.1, 2.2] |> map(fn(x ~> floor(x)))');
      assert.ok(js.includes('floor') || js.includes('Math.floor') || js.includes('=> x'));
    });

    it('compiles ceil inside lambda', () => {
      const js = compileToJS('[1.1, 2.2] |> map(fn(x ~> ceil(x)))');
      assert.ok(js.includes('ceil') || js.includes('Math.ceil') || js.includes('=> x'));
    });
  });

  describe('Temporal extraction functions', () => {
    it('compiles year inside lambda', () => {
      const js = compileToJS('fn(x ~> year(x))');
      assert.ok(js.includes('.year'));
    });

    it('compiles month inside lambda', () => {
      const js = compileToJS('fn(x ~> month(x))');
      assert.ok(js.includes('.month'));
    });

    it('compiles day inside lambda', () => {
      const js = compileToJS('fn(x ~> day(x))');
      assert.ok(js.includes('.day'));
    });

    it('compiles hour inside lambda', () => {
      const js = compileToJS('fn(x ~> hour(x))');
      assert.ok(js.includes('.toUTC().hour'));
    });

    it('compiles minute inside lambda', () => {
      const js = compileToJS('fn(x ~> minute(x))');
      assert.ok(js.includes('.toUTC().minute'));
    });
  });

  describe('String functions (already worked, still work)', () => {
    it('compiles upper inside lambda', () => {
      const fn = compile<(_: null) => (arr: string[]) => string[]>(
        "fn(arr ~> arr |> map(fn(x ~> upper(x))))",
        { runtime }
      )(null);
      assert.deepStrictEqual(fn(['a', 'b']), ['A', 'B']);
    });

    it('compiles lower inside lambda', () => {
      const fn = compile<(_: null) => (arr: string[]) => string[]>(
        "fn(arr ~> arr |> map(fn(x ~> lower(x))))",
        { runtime }
      )(null);
      assert.deepStrictEqual(fn(['A', 'B']), ['a', 'b']);
    });
  });

  describe('Arithmetic operators (already worked, still work)', () => {
    it('compiles add inside lambda', () => {
      const fn = compile<(_: null) => (arr: number[]) => number[]>(
        "fn(arr ~> arr |> map(fn(x ~> x + 1)))",
        { runtime }
      )(null);
      assert.deepStrictEqual(fn([1, 2, 3]), [2, 3, 4]);
    });
  });
});

describe('Runtime behavior with specialization', () => {
  it('abs works correctly at runtime', () => {
    const fn = compile<(_: null) => (x: number) => number>(
      "fn(x ~> abs(x))",
      { runtime }
    )(null);
    assert.strictEqual(fn(-5), 5);
    assert.strictEqual(fn(5), 5);
  });

  it('round works correctly at runtime', () => {
    const fn = compile<(_: null) => (x: number) => number>(
      "fn(x ~> round(x))",
      { runtime }
    )(null);
    assert.strictEqual(fn(1.4), 1);
    assert.strictEqual(fn(1.6), 2);
  });

  it('floor works correctly at runtime', () => {
    const fn = compile<(_: null) => (x: number) => number>(
      "fn(x ~> floor(x))",
      { runtime }
    )(null);
    assert.strictEqual(fn(1.9), 1);
    assert.strictEqual(fn(-1.1), -2);
  });

  it('ceil works correctly at runtime', () => {
    const fn = compile<(_: null) => (x: number) => number>(
      "fn(x ~> ceil(x))",
      { runtime }
    )(null);
    assert.strictEqual(fn(1.1), 2);
    assert.strictEqual(fn(-1.9), -1);
  });
});
