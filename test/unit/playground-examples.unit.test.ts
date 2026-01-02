import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compile } from '../../src/compile';
import { DateTime, Duration } from 'luxon';

const runtime = { DateTime, Duration };

/**
 * This test file validates that all examples in the Playground dropdown
 * are valid Elo code that compiles and evaluates successfully.
 *
 * These examples must stay in sync with:
 * web/src/scripts/controllers/playground_controller.ts
 */

describe('Playground Examples', () => {
  // Helper to compile and evaluate an expression (calling with null since _ is not used)
  const evaluate = <T>(code: string): T => compile<(_: null) => T>(code, { runtime })(null);

  it('arithmetic: should evaluate correctly', () => {
    const result = evaluate<number>('2 + 3 * 4');
    assert.strictEqual(result, 14);
  });

  it('strings: should evaluate correctly', () => {
    const code = `let greeting = 'hello world' in
  upper(greeting)`;
    const result = evaluate<string>(code);
    assert.strictEqual(result, 'HELLO WORLD');
  });

  it('booleans: should evaluate correctly', () => {
    const code = `let age = 25 in
  age >= 18 and age < 65`;
    const result = evaluate<boolean>(code);
    assert.strictEqual(result, true);
  });

  it('conditionals: should evaluate correctly', () => {
    const code = `let score = 85 in
  if score >= 90 then 'A'
  else if score >= 80 then 'B'
  else if score >= 70 then 'C'
  else 'F'`;
    const result = evaluate<string>(code);
    assert.strictEqual(result, 'B');
  });

  it('variables: should evaluate correctly', () => {
    const code = `let width = 10,
    height = 5,
    area = width * height
in area`;
    const result = evaluate<number>(code);
    assert.strictEqual(result, 50);
  });

  it('objects: should evaluate correctly', () => {
    const code = `let person = {
  name: 'Alice',
  age: 30,
  city: 'Brussels'
} in person.name`;
    const result = evaluate<string>(code);
    assert.strictEqual(result, 'Alice');
  });

  it('arrays: should evaluate correctly', () => {
    const code = `let numbers = [1, 2, 3, 4, 5] in {
  first: first(numbers),
  last: last(numbers),
  length: length(numbers)
}`;
    const result = evaluate<Record<string, unknown>>(code);
    assert.strictEqual(result.first, 1);
    assert.strictEqual(result.last, 5);
    assert.strictEqual(result.length, 5);
  });

  it('nulls: should evaluate correctly', () => {
    const code = `let value = null in
  value | 'default'`;
    const result = evaluate<string>(code);
    assert.strictEqual(result, 'default');
  });

  it('lambdas: should evaluate correctly', () => {
    const code = `let double = fn(x ~> x * 2),
    add = fn(a, b ~> a + b)
in add(double(5), 3)`;
    const result = evaluate<number>(code);
    assert.strictEqual(result, 13);
  });

  it('map-filter: should evaluate correctly', () => {
    const code = `let numbers = [1, 2, 3, 4, 5] in {
  doubled: map(numbers, fn(x ~> x * 2)),
  evens: filter(numbers, fn(x ~> x % 2 == 0)),
  sum: reduce(numbers, 0, fn(acc, x ~> acc + x))
}`;
    const result = evaluate<Record<string, unknown>>(code);
    assert.deepStrictEqual(result.doubled, [2, 4, 6, 8, 10]);
    assert.deepStrictEqual(result.evens, [2, 4]);
    assert.strictEqual(result.sum, 15);
  });

  it('pipes: should evaluate correctly', () => {
    const code = `'  hello world  '
  |> trim
  |> upper
  |> length`;
    const result = evaluate<number>(code);
    assert.strictEqual(result, 11);
  });

  it('dates: should evaluate correctly', () => {
    const code = `let today = TODAY,
    nextWeek = today + P7D
in {
  year: year(today),
  month: month(today)
}`;
    const result = evaluate<Record<string, unknown>>(code);
    assert.strictEqual(typeof result.year, 'number');
    assert.strictEqual(typeof result.month, 'number');
    assert.ok((result.month as number) >= 1 && (result.month as number) <= 12);
  });

  it('durations: should evaluate correctly', () => {
    const code = `P1D + PT2H`;
    const result = evaluate<unknown>(code);
    assert.ok(Duration.isDuration(result));
  });
});
