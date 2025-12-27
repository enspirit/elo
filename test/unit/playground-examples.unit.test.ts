import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compile } from '../../src/compile';

// Configure dayjs with required plugins
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import utc from 'dayjs/plugin/utc';
dayjs.extend(duration);
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);
dayjs.extend(utc);

const runtime = { dayjs };

/**
 * This test file validates that all examples in the Playground dropdown
 * are valid Elo code that compiles and evaluates successfully.
 *
 * These examples must stay in sync with:
 * web/src/scripts/controllers/playground_controller.ts
 */

describe('Playground Examples', () => {
  it('arithmetic: should evaluate correctly', () => {
    const result = compile('2 + 3 * 4', { runtime });
    assert.strictEqual(result, 14);
  });

  it('strings: should evaluate correctly', () => {
    const code = `let greeting = 'hello world' in
  upper(greeting)`;
    const result = compile(code, { runtime });
    assert.strictEqual(result, 'HELLO WORLD');
  });

  it('booleans: should evaluate correctly', () => {
    const code = `let age = 25 in
  age >= 18 and age < 65`;
    const result = compile(code, { runtime });
    assert.strictEqual(result, true);
  });

  it('conditionals: should evaluate correctly', () => {
    const code = `let score = 85 in
  if score >= 90 then 'A'
  else if score >= 80 then 'B'
  else if score >= 70 then 'C'
  else 'F'`;
    const result = compile(code, { runtime });
    assert.strictEqual(result, 'B');
  });

  it('variables: should evaluate correctly', () => {
    const code = `let width = 10,
    height = 5,
    area = width * height
in area`;
    const result = compile(code, { runtime });
    assert.strictEqual(result, 50);
  });

  it('objects: should evaluate correctly', () => {
    const code = `let person = {
  name: 'Alice',
  age: 30,
  city: 'Brussels'
} in person.name`;
    const result = compile(code, { runtime });
    assert.strictEqual(result, 'Alice');
  });

  it('arrays: should evaluate correctly', () => {
    const code = `let numbers = [1, 2, 3, 4, 5] in {
  first: first(numbers),
  last: last(numbers),
  length: length(numbers)
}`;
    const result = compile(code, { runtime }) as Record<string, unknown>;
    assert.strictEqual(result.first, 1);
    assert.strictEqual(result.last, 5);
    assert.strictEqual(result.length, 5);
  });

  it('nulls: should evaluate correctly', () => {
    const code = `let value = null in
  value | 'default'`;
    const result = compile(code, { runtime });
    assert.strictEqual(result, 'default');
  });

  it('lambdas: should evaluate correctly', () => {
    const code = `let double = fn(x ~> x * 2),
    add = fn(a, b ~> a + b)
in add(double(5), 3)`;
    const result = compile(code, { runtime });
    assert.strictEqual(result, 13);
  });

  it('map-filter: should evaluate correctly', () => {
    const code = `let numbers = [1, 2, 3, 4, 5] in {
  doubled: map(numbers, fn(x ~> x * 2)),
  evens: filter(numbers, fn(x | x % 2 == 0)),
  sum: reduce(numbers, 0, fn(acc, x ~> acc + x))
}`;
    const result = compile(code, { runtime }) as Record<string, unknown>;
    assert.deepStrictEqual(result.doubled, [2, 4, 6, 8, 10]);
    assert.deepStrictEqual(result.evens, [2, 4]);
    assert.strictEqual(result.sum, 15);
  });

  it('pipes: should evaluate correctly', () => {
    const code = `'  hello world  '
  |> trim
  |> upper
  |> length`;
    const result = compile(code, { runtime });
    assert.strictEqual(result, 11);
  });

  it('dates: should evaluate correctly', () => {
    const code = `let today = TODAY,
    nextWeek = today + P7D
in {
  year: year(today),
  month: month(today)
}`;
    const result = compile(code, { runtime }) as Record<string, unknown>;
    assert.strictEqual(typeof result.year, 'number');
    assert.strictEqual(typeof result.month, 'number');
    assert.ok((result.month as number) >= 1 && (result.month as number) <= 12);
  });

  it('durations: should evaluate correctly', () => {
    const code = `P1D + PT2H`;
    const result = compile(code, { runtime });
    assert.ok(dayjs.isDuration(result));
  });
});
