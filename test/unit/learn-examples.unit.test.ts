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
    assert.strictEqual(compile("let age = 18 in if age >= 18 then 'Welcome!' else 'Sorry'", { runtime }), 'Welcome!');
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

describe('Learn Page Examples - Lesson 8: Functions', () => {
  it('should evaluate lambda examples', () => {
    assert.strictEqual(compile('let double = fn( x ~> x * 2 ) in double(5)', { runtime }), 10);
    assert.strictEqual(compile("let greet = fn( name ~> 'Hello, ' + name + '!' ) in greet('Elo')", { runtime }), 'Hello, Elo!');
    assert.strictEqual(compile('let add = fn( a, b ~> a + b ) in add(3, 4)', { runtime }), 7);
  });
});

describe('Learn Page Examples - Lesson 9: Pipes', () => {
  it('should evaluate pipe examples', () => {
    assert.strictEqual(compile("upper(trim('  hello  '))", { runtime }), 'HELLO');
    assert.strictEqual(compile("'  hello  ' |> trim |> upper", { runtime }), 'HELLO');
    assert.strictEqual(compile("'  elo is fun  ' |> trim |> upper |> length", { runtime }), 10);
  });
});
