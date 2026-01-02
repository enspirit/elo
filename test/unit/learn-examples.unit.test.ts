import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compile } from '../../src/compile';
import { DateTime, Duration } from 'luxon';

const runtime = { DateTime, Duration };

// Helper to compile and evaluate an expression (calling with null since _ is not used)
const evaluate = <T>(code: string): T => compile<(_: null) => T>(code, { runtime })(null);

/**
 * This test file validates that all examples shown on the Learn page
 * are valid Elo code that compiles and evaluates successfully.
 *
 * Each example from the Learn page should be listed here.
 * If a test fails, the Learn page must be updated.
 */

describe('Learn Page Examples - Lesson 1: Numbers', () => {
  it('should evaluate arithmetic', () => {
    assert.strictEqual(evaluate('2 + 3 * 4'), 14);
    assert.strictEqual(evaluate('(2 + 3) * 4'), 20);
    assert.strictEqual(evaluate('20 / 4 + 6 * 7'), 47);
  });
});

describe('Learn Page Examples - Lesson 2: Strings', () => {
  it('should evaluate string examples', () => {
    assert.strictEqual(evaluate("'Hello, World!'"), 'Hello, World!');
    assert.strictEqual(evaluate("'Hello, ' + 'World!'"), 'Hello, World!');
    assert.strictEqual(evaluate("upper('hello')"), 'HELLO');
    assert.strictEqual(evaluate("trim('  spaces  ')"), 'spaces');
  });
});

describe('Learn Page Examples - Lesson 3: Booleans', () => {
  it('should evaluate boolean examples', () => {
    assert.strictEqual(evaluate('5 > 3'), true);
    assert.strictEqual(evaluate('10 <= 10'), true);
    assert.strictEqual(evaluate('true and false'), false);
    assert.strictEqual(evaluate('5 > 3 or 2 == 2'), true);
  });
});

describe('Learn Page Examples - Lesson 4: Decisions', () => {
  it('should evaluate if expressions', () => {
    assert.strictEqual(evaluate("if 5 > 3 then 'yes' else 'no'"), 'yes');
    assert.strictEqual(evaluate("if 10 > 100 then 'big' else 'small'"), 'small');
  });
});

describe('Learn Page Examples - Lesson 5: Variables', () => {
  it('should evaluate let expressions', () => {
    assert.strictEqual(evaluate('let price = 100 in price * 1.21'), 121);
    assert.strictEqual(evaluate("let name = 'World' in 'Hello, ' + name + '!'"), 'Hello, World!');
    assert.strictEqual(evaluate('let width = 10, height = 5 in width * height'), 50);
  });
});

describe('Learn Page Examples - Lesson 6: Dates', () => {
  it('should evaluate date examples', () => {
    const christmas = evaluate('D2024-12-25');
    assert.ok(DateTime.isDateTime(christmas));

    const today = evaluate('TODAY');
    assert.ok(DateTime.isDateTime(today));

    const future = evaluate('TODAY + P30D');
    assert.ok(DateTime.isDateTime(future));

    const later = evaluate('NOW + PT2H30M');
    assert.ok(DateTime.isDateTime(later));

    const year = evaluate<number>('year(TODAY)');
    assert.strictEqual(typeof year, 'number');

    const month = evaluate<number>('month(TODAY)');
    assert.ok(month >= 1 && month <= 12);
  });
});

describe('Learn Page Examples - Lesson 7: Objects', () => {
  it('should evaluate object examples', () => {
    const obj = evaluate<Record<string, unknown>>("{ name: 'Alice', age: 30, city: 'Brussels' }");
    assert.strictEqual(obj.name, 'Alice');
    assert.strictEqual(obj.age, 30);

    assert.strictEqual(evaluate("let person = { name: 'Alice', age: 30 } in person.name"), 'Alice');
    assert.strictEqual(evaluate("let person = { name: 'Bob', age: 25 } in person.age >= 18"), true);
  });
});

describe('Learn Page Examples - Lesson 8: Arrays', () => {
  it('should evaluate array examples', () => {
    assert.deepStrictEqual(evaluate('[1, 2, 3, 4, 5]'), [1, 2, 3, 4, 5]);
    assert.deepStrictEqual(evaluate("['apple', 'banana', 'cherry']"), ['apple', 'banana', 'cherry']);
    assert.strictEqual(evaluate('length([1, 2, 3, 4, 5])'), 5);
    assert.strictEqual(evaluate("let fruits = ['apple', 'banana'] in length(fruits)"), 2);
  });
});

describe('Learn Page Examples - Lesson 9: Functions', () => {
  it('should evaluate lambda examples', () => {
    assert.strictEqual(evaluate('let double = fn( x ~> x * 2 ) in double(5)'), 10);
    assert.strictEqual(evaluate("let greet = fn( name ~> 'Hello, ' + name + '!' ) in greet('Elo')"), 'Hello, Elo!');
    assert.strictEqual(evaluate('let add = fn( a, b ~> a + b ) in add(3, 4)'), 7);
  });
});

describe('Learn Page Examples - Lesson 10: Pipes', () => {
  it('should evaluate pipe examples', () => {
    assert.strictEqual(evaluate("upper(trim('  hello  '))"), 'HELLO');
    assert.strictEqual(evaluate("'  hello  ' |> trim |> upper"), 'HELLO');
    assert.strictEqual(evaluate("'  elo is fun  ' |> trim |> upper |> length"), 10);
  });
});

describe('Learn Page Examples - Lesson 11: Transforming Lists', () => {
  it('should evaluate map, filter, reduce examples', () => {
    assert.deepStrictEqual(evaluate('map([1, 2, 3], fn(x ~> x * 2))'), [2, 4, 6]);
    assert.deepStrictEqual(evaluate("map(['hello', 'world'], fn(s ~> upper(s)))"), ['HELLO', 'WORLD']);
    assert.deepStrictEqual(evaluate('filter([1, 2, 3, 4, 5], fn(x ~> x > 2))'), [3, 4, 5]);
    assert.strictEqual(evaluate('reduce([1, 2, 3, 4], 0, fn(sum, x ~> sum + x))'), 10);
  });
});

describe('Learn Page Examples - Lesson 12: Checking Lists', () => {
  it('should evaluate any, all examples', () => {
    assert.strictEqual(evaluate('any([1, 2, 3], fn(x ~> x > 2))'), true);
    assert.strictEqual(evaluate('all([1, 2, 3], fn(x ~> x > 0))'), true);
    assert.strictEqual(evaluate('let prices = [10, 25, 5, 30] in all(prices, fn(p ~> p < 100))'), true);
  });
});

describe('Learn Page Examples - Lesson 13: Handling Nulls', () => {
  it('should evaluate null examples', () => {
    assert.strictEqual(evaluate('null'), null);
    assert.strictEqual(evaluate('isNull(null)'), true);
    assert.strictEqual(evaluate("null | 'default value'"), 'default value');
    assert.strictEqual(evaluate('let x = null in x | 0'), 0);
  });
});

describe('Learn Page Examples - Lesson 14: Time Ranges', () => {
  it('should evaluate time range examples', () => {
    // These should return booleans (in operator with ranges)
    assert.strictEqual(typeof evaluate('TODAY in SOW .. EOW'), 'boolean');
    assert.strictEqual(typeof evaluate('TODAY in SOM .. EOM'), 'boolean');
    assert.strictEqual(typeof evaluate('TODAY in SOY .. EOY'), 'boolean');
  });
});

describe('Learn Page Examples - Lesson 15: Parsing Data', () => {
  it('should evaluate type selector examples', () => {
    assert.strictEqual(evaluate("Int('42')"), 42);
    const date = evaluate("Date('2024-12-25')");
    assert.ok(DateTime.isDateTime(date));
    const dur = evaluate("Duration('P1D')");
    assert.ok(Duration.isDuration(dur));
    // Type selectors throw on invalid input (Finitio semantics)
    assert.throws(() => evaluate("Int('not a number')"), /expected Int/);
  });
});

/**
 * Exercise Solutions
 * These tests verify that all exercise solutions on the Learn page
 * are valid Elo code that compiles and evaluates successfully.
 */

describe('Learn Page Exercises - Build a Greeting', () => {
  it('should pass the greeting assertion', () => {
    assert.strictEqual(evaluate("assert('Hello, ' + 'World!' == 'Hello, World!')"), true);
  });
});

describe('Learn Page Exercises - Product Total', () => {
  it('should pass the product total assertion', () => {
    assert.strictEqual(evaluate("assert({ price: 25, quantity: 4 }.price * { price: 25, quantity: 4 }.quantity == 100)"), true);
  });
});

describe('Learn Page Exercises - Text Transform', () => {
  it('should pass the text transform assertion', () => {
    assert.strictEqual(evaluate("assert(upper(trim('  hello  ')) == 'HELLO')"), true);
  });
});

describe('Learn Page Exercises - Rectangle Area', () => {
  it('should pass the rectangle area assertion', () => {
    assert.strictEqual(evaluate("let width = 8, height = 5 in assert(width * height == 40)"), true);
  });
});

describe('Learn Page Exercises - Filter and Double', () => {
  it('should pass the filter and double assertion', () => {
    assert.strictEqual(evaluate("assert(([5, 12, 8, 20, 3, 15] |> filter(x ~> x > 10) |> map(x ~> x * 2)) == [24, 40, 30])"), true);
  });
});

describe('Learn Page Exercises - Order Total', () => {
  it('should pass the order total assertion', () => {
    assert.strictEqual(evaluate("let order = { price: 50, quantity: 3 } in assert(order.price * order.quantity == 150)"), true);
  });
});

describe('Learn Page Exercises - Validate Data', () => {
  it('should pass the validate data assertion', () => {
    assert.strictEqual(evaluate("let Product = { name: String, price: Int } in assert(({ name: 'Widget', price: '99' } |> Product) == { name: 'Widget', price: 99 })"), true);
  });
});
