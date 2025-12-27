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
 * This test file validates that all examples shown on the Learn page
 * are valid Elo code that compiles and evaluates successfully.
 *
 * Each example from the Learn page should be listed here.
 * If a test fails, the Learn page must be updated.
 */

describe('Learn Page Examples - Lesson 1: Numbers', () => {
  it('should evaluate arithmetic', () => {
    assert.strictEqual(compile('2 + 3 * 4', { runtime }), 14);
    assert.strictEqual(compile('(2 + 3) * 4', { runtime }), 20);
    assert.strictEqual(compile('20 / 4 + 6 * 7', { runtime }), 47);
  });
});

describe('Learn Page Examples - Lesson 2: Strings', () => {
  it('should evaluate string examples', () => {
    assert.strictEqual(compile("'Hello, World!'", { runtime }), 'Hello, World!');
    assert.strictEqual(compile("'Hello, ' + 'World!'", { runtime }), 'Hello, World!');
    assert.strictEqual(compile("upper('hello')", { runtime }), 'HELLO');
    assert.strictEqual(compile("trim('  spaces  ')", { runtime }), 'spaces');
  });
});

describe('Learn Page Examples - Lesson 3: Booleans', () => {
  it('should evaluate boolean examples', () => {
    assert.strictEqual(compile('5 > 3', { runtime }), true);
    assert.strictEqual(compile('10 <= 10', { runtime }), true);
    assert.strictEqual(compile('true and false', { runtime }), false);
    assert.strictEqual(compile('5 > 3 or 2 == 2', { runtime }), true);
  });
});

describe('Learn Page Examples - Lesson 4: Decisions', () => {
  it('should evaluate if expressions', () => {
    assert.strictEqual(compile("if 5 > 3 then 'yes' else 'no'", { runtime }), 'yes');
    assert.strictEqual(compile("if 10 > 100 then 'big' else 'small'", { runtime }), 'small');
  });
});

describe('Learn Page Examples - Lesson 5: Variables', () => {
  it('should evaluate let expressions', () => {
    assert.strictEqual(compile('let price = 100 in price * 1.21', { runtime }), 121);
    assert.strictEqual(compile("let name = 'World' in 'Hello, ' + name + '!'", { runtime }), 'Hello, World!');
    assert.strictEqual(compile('let width = 10, height = 5 in width * height', { runtime }), 50);
  });
});

describe('Learn Page Examples - Lesson 6: Dates', () => {
  it('should evaluate date examples', () => {
    const christmas = compile('D2024-12-25', { runtime });
    assert.ok(dayjs.isDayjs(christmas));

    const today = compile('TODAY', { runtime });
    assert.ok(dayjs.isDayjs(today));

    const future = compile('TODAY + P30D', { runtime });
    assert.ok(dayjs.isDayjs(future));

    const later = compile('NOW + PT2H30M', { runtime });
    assert.ok(dayjs.isDayjs(later));

    const year = compile<number>('year(TODAY)', { runtime });
    assert.strictEqual(typeof year, 'number');

    const month = compile<number>('month(TODAY)', { runtime });
    assert.ok(month >= 1 && month <= 12);
  });
});

describe('Learn Page Examples - Lesson 7: Objects', () => {
  it('should evaluate object examples', () => {
    const obj = compile("{ name: 'Alice', age: 30, city: 'Brussels' }", { runtime }) as Record<string, unknown>;
    assert.strictEqual(obj.name, 'Alice');
    assert.strictEqual(obj.age, 30);

    assert.strictEqual(compile("let person = { name: 'Alice', age: 30 } in person.name", { runtime }), 'Alice');
    assert.strictEqual(compile("let person = { name: 'Bob', age: 25 } in person.age >= 18", { runtime }), true);
  });
});

describe('Learn Page Examples - Lesson 8: Arrays', () => {
  it('should evaluate array examples', () => {
    assert.deepStrictEqual(compile('[1, 2, 3, 4, 5]', { runtime }), [1, 2, 3, 4, 5]);
    assert.deepStrictEqual(compile("['apple', 'banana', 'cherry']", { runtime }), ['apple', 'banana', 'cherry']);
    assert.strictEqual(compile('length([1, 2, 3, 4, 5])', { runtime }), 5);
    assert.strictEqual(compile("let fruits = ['apple', 'banana'] in length(fruits)", { runtime }), 2);
  });
});

describe('Learn Page Examples - Lesson 9: Functions', () => {
  it('should evaluate lambda examples', () => {
    assert.strictEqual(compile('let double = fn( x ~> x * 2 ) in double(5)', { runtime }), 10);
    assert.strictEqual(compile("let greet = fn( name ~> 'Hello, ' + name + '!' ) in greet('Elo')", { runtime }), 'Hello, Elo!');
    assert.strictEqual(compile('let add = fn( a, b ~> a + b ) in add(3, 4)', { runtime }), 7);
  });
});

describe('Learn Page Examples - Lesson 10: Pipes', () => {
  it('should evaluate pipe examples', () => {
    assert.strictEqual(compile("upper(trim('  hello  '))", { runtime }), 'HELLO');
    assert.strictEqual(compile("'  hello  ' |> trim |> upper", { runtime }), 'HELLO');
    assert.strictEqual(compile("'  elo is fun  ' |> trim |> upper |> length", { runtime }), 10);
  });
});

describe('Learn Page Examples - Lesson 11: Transforming Lists', () => {
  it('should evaluate map, filter, reduce examples', () => {
    assert.deepStrictEqual(compile('map([1, 2, 3], fn(x ~> x * 2))', { runtime }), [2, 4, 6]);
    assert.deepStrictEqual(compile("map(['hello', 'world'], fn(s ~> upper(s)))", { runtime }), ['HELLO', 'WORLD']);
    assert.deepStrictEqual(compile('filter([1, 2, 3, 4, 5], fn(x | x > 2))', { runtime }), [3, 4, 5]);
    assert.strictEqual(compile('reduce([1, 2, 3, 4], 0, fn(sum, x ~> sum + x))', { runtime }), 10);
  });
});

describe('Learn Page Examples - Lesson 12: Checking Lists', () => {
  it('should evaluate any, all examples', () => {
    assert.strictEqual(compile('any([1, 2, 3], fn(x | x > 2))', { runtime }), true);
    assert.strictEqual(compile('all([1, 2, 3], fn(x | x > 0))', { runtime }), true);
    assert.strictEqual(compile('let prices = [10, 25, 5, 30] in all(prices, fn(p | p < 100))', { runtime }), true);
  });
});

describe('Learn Page Examples - Lesson 13: Handling Nulls', () => {
  it('should evaluate null examples', () => {
    assert.strictEqual(compile('null', { runtime }), null);
    assert.strictEqual(compile('isNull(null)', { runtime }), true);
    assert.strictEqual(compile("null | 'default value'", { runtime }), 'default value');
    assert.strictEqual(compile('let x = null in x | 0', { runtime }), 0);
  });
});

describe('Learn Page Examples - Lesson 14: Time Ranges', () => {
  it('should evaluate time range examples', () => {
    // These should return booleans (in operator with ranges)
    assert.strictEqual(typeof compile('TODAY in SOW .. EOW', { runtime }), 'boolean');
    assert.strictEqual(typeof compile('TODAY in SOM .. EOM', { runtime }), 'boolean');
    assert.strictEqual(typeof compile('TODAY in SOY .. EOY', { runtime }), 'boolean');
  });
});

describe('Learn Page Examples - Lesson 15: Parsing Data', () => {
  it('should evaluate type selector examples', () => {
    assert.strictEqual(compile("Int('42')", { runtime }), 42);
    const date = compile("Date('2024-12-25')", { runtime });
    assert.ok(dayjs.isDayjs(date));
    const dur = compile("Duration('P1D')", { runtime });
    assert.ok(dayjs.isDuration(dur));
    assert.strictEqual(compile("Int('not a number') | 0", { runtime }), 0);
  });
});
