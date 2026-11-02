import { describe, it } from 'node:test';
import assert from 'node:assert';
import { transform, TypeEnv } from '../../src/transform';
import { parse } from '../../src/parser';
import { compileToJavaScript } from '../../src/compilers/javascript';
import {
  literal,
  stringLiteral,
  dateLiteral,
  dateTimeLiteral,
  durationLiteral,
  variable,
  binary,
  unary,
  temporalKeyword,
  functionCall,
  memberAccess,
  letExpr,
  lambda,
  apply,
  typeDef,
  typeRef,
  arrayType,
  unionType,
} from '../../src/ast';
import { Types } from '../../src/types';
import { inferType } from '../../src/ir';

describe('transform - literals', () => {
  it('transforms integer literal', () => {
    const ir = transform(literal(42));
    assert.deepStrictEqual(ir, { type: 'int_literal', value: 42 });
  });

  it('transforms zero as integer', () => {
    const ir = transform(literal(0));
    assert.deepStrictEqual(ir, { type: 'int_literal', value: 0 });
  });

  it('transforms negative integer', () => {
    const ir = transform(literal(-5));
    assert.deepStrictEqual(ir, { type: 'int_literal', value: -5 });
  });

  it('transforms float literal', () => {
    const ir = transform(literal(3.14));
    assert.deepStrictEqual(ir, { type: 'float_literal', value: 3.14 });
  });

  it('transforms boolean true', () => {
    const ir = transform(literal(true));
    assert.deepStrictEqual(ir, { type: 'bool_literal', value: true });
  });

  it('transforms boolean false', () => {
    const ir = transform(literal(false));
    assert.deepStrictEqual(ir, { type: 'bool_literal', value: false });
  });

  it('transforms string literal', () => {
    const ir = transform(stringLiteral('hello'));
    assert.deepStrictEqual(ir, { type: 'string_literal', value: 'hello' });
  });

  it('transforms date literal', () => {
    const ir = transform(dateLiteral('2024-01-15'));
    assert.deepStrictEqual(ir, { type: 'date_literal', value: '2024-01-15' });
  });

  it('transforms datetime literal', () => {
    const ir = transform(dateTimeLiteral('2024-01-15T10:30:00'));
    assert.deepStrictEqual(ir, { type: 'datetime_literal', value: '2024-01-15T10:30:00' });
  });

  it('transforms duration literal', () => {
    const ir = transform(durationLiteral('P1D'));
    assert.deepStrictEqual(ir, { type: 'duration_literal', value: 'P1D' });
  });
});

describe('transform - variables', () => {
  it('transforms _ (input variable) to any type', () => {
    const ir = transform(variable('_'));
    assert.strictEqual(ir.type, 'variable');
    if (ir.type === 'variable') {
      assert.strictEqual(ir.name, '_');
      assert.deepStrictEqual(ir.inferredType, Types.any);
    }
  });

  it('transforms variable with known type from env', () => {
    const env: TypeEnv = new Map([['x', Types.int]]);
    const ir = transform(variable('x'), env);
    assert.strictEqual(ir.type, 'variable');
    if (ir.type === 'variable') {
      assert.strictEqual(ir.name, 'x');
      assert.deepStrictEqual(ir.inferredType, Types.int);
    }
  });

  it('rejects undefined variables to prevent access to host globals', () => {
    assert.throws(
      () => transform(variable('window')),
      /Undefined variable: 'window'/
    );
  });

  it('rejects any undefined variable', () => {
    assert.throws(
      () => transform(variable('foo')),
      /Undefined variable: 'foo'/
    );
  });
});

describe('transform - binary operators with integers', () => {
  it('transforms int + int', () => {
    const ir = transform(binary('+', literal(1), literal(2)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'add');
      assert.strictEqual(ir.args.length, 2);
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.int]);
      assert.deepStrictEqual(ir.resultType, Types.int);
    }
  });

  it('transforms int - int', () => {
    const ir = transform(binary('-', literal(5), literal(3)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'sub');
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.int]);
      assert.deepStrictEqual(ir.resultType, Types.int);
    }
  });

  it('transforms int * int', () => {
    const ir = transform(binary('*', literal(4), literal(3)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'mul');
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.int]);
      assert.deepStrictEqual(ir.resultType, Types.int);
    }
  });

  it('transforms int / int to float result', () => {
    const ir = transform(binary('/', literal(10), literal(3)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'div');
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.int]);
      assert.deepStrictEqual(ir.resultType, Types.float);
    }
  });

  it('transforms int % int', () => {
    const ir = transform(binary('%', literal(10), literal(3)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'mod');
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.int]);
      assert.deepStrictEqual(ir.resultType, Types.int);
    }
  });

  it('transforms int ^ int, whose result is a Float', () => {
    // Elo cannot know the exponent's sign statically and `2 ^ -1` is 0.5, so
    // the declared result is Float even on two Ints.
    const ir = transform(binary('^', literal(2), literal(3)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'pow');
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.int]);
      assert.deepStrictEqual(ir.resultType, Types.float);
    }
  });
});

describe('transform - binary operators with floats', () => {
  it('transforms float + float', () => {
    const ir = transform(binary('+', literal(1.5), literal(2.5)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'add');
      assert.deepStrictEqual(ir.argTypes, [Types.float, Types.float]);
      assert.deepStrictEqual(ir.resultType, Types.float);
    }
  });

  it('transforms int + float to float result', () => {
    const ir = transform(binary('+', literal(1), literal(2.5)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'add');
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.float]);
      assert.deepStrictEqual(ir.resultType, Types.float);
    }
  });
});

describe('transform - comparison operators', () => {
  it('transforms int < int to bool', () => {
    const ir = transform(binary('<', literal(1), literal(2)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'lt');
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.int]);
      assert.deepStrictEqual(ir.resultType, Types.bool);
    }
  });

  it('transforms int > int to bool', () => {
    const ir = transform(binary('>', literal(1), literal(2)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'gt');
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.int]);
      assert.deepStrictEqual(ir.resultType, Types.bool);
    }
  });

  it('transforms int <= int to bool', () => {
    const ir = transform(binary('<=', literal(1), literal(2)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'lte');
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.int]);
      assert.deepStrictEqual(ir.resultType, Types.bool);
    }
  });

  it('transforms int >= int to bool', () => {
    const ir = transform(binary('>=', literal(1), literal(2)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'gte');
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.int]);
      assert.deepStrictEqual(ir.resultType, Types.bool);
    }
  });

  it('transforms int == int to bool', () => {
    const ir = transform(binary('==', literal(1), literal(2)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'eq');
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.int]);
      assert.deepStrictEqual(ir.resultType, Types.bool);
    }
  });

  it('transforms int != int to bool', () => {
    const ir = transform(binary('!=', literal(1), literal(2)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'neq');
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.int]);
      assert.deepStrictEqual(ir.resultType, Types.bool);
    }
  });
});

describe('transform - logical operators', () => {
  it('transforms bool && bool', () => {
    const ir = transform(binary('&&', literal(true), literal(false)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'and');
      assert.deepStrictEqual(ir.argTypes, [Types.bool, Types.bool]);
      assert.deepStrictEqual(ir.resultType, Types.bool);
    }
  });

  it('transforms bool || bool', () => {
    const ir = transform(binary('||', literal(true), literal(false)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'or');
      assert.deepStrictEqual(ir.argTypes, [Types.bool, Types.bool]);
      assert.deepStrictEqual(ir.resultType, Types.bool);
    }
  });
});

describe('transform - temporal arithmetic', () => {
  it('transforms date + duration', () => {
    const ir = transform(binary('+', dateLiteral('2024-01-15'), durationLiteral('P1D')));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'add');
      assert.deepStrictEqual(ir.argTypes, [Types.date, Types.duration]);
      assert.deepStrictEqual(ir.resultType, Types.date);
    }
  });

  it('transforms datetime + duration', () => {
    const ir = transform(binary('+', dateTimeLiteral('2024-01-15T10:00:00'), durationLiteral('PT1H')));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'add');
      assert.deepStrictEqual(ir.argTypes, [Types.datetime, Types.duration]);
      assert.deepStrictEqual(ir.resultType, Types.datetime);
    }
  });

  it('transforms duration + duration', () => {
    const ir = transform(binary('+', durationLiteral('P1D'), durationLiteral('P2D')));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'add');
      assert.deepStrictEqual(ir.argTypes, [Types.duration, Types.duration]);
      assert.deepStrictEqual(ir.resultType, Types.duration);
    }
  });
});

describe('transform - string operations', () => {
  it('transforms string + string', () => {
    const ir = transform(binary('+', stringLiteral('hello'), stringLiteral(' world')));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'add');
      assert.deepStrictEqual(ir.argTypes, [Types.string, Types.string]);
      assert.deepStrictEqual(ir.resultType, Types.string);
    }
  });
});

describe('transform - unknown types', () => {
  it('transforms _ + _ to any result', () => {
    // Use _ (input variable) which is always in scope with any type
    const ir = transform(binary('+', memberAccess(variable('_'), 'a'), memberAccess(variable('_'), 'b')));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'add');
      assert.deepStrictEqual(ir.argTypes, [Types.any, Types.any]);
      assert.deepStrictEqual(ir.resultType, Types.any);
    }
  });

  it('transforms known + env variable to any result', () => {
    // Variables from env are allowed
    const env: TypeEnv = new Map([['x', Types.any]]);
    const ir = transform(binary('+', literal(1), variable('x')), env);
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'add');
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.any]);
      assert.deepStrictEqual(ir.resultType, Types.any);
    }
  });
});

describe('transform - unary operators', () => {
  it('transforms -int', () => {
    const ir = transform(unary('-', literal(5)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'neg');
      assert.deepStrictEqual(ir.argTypes, [Types.int]);
      assert.deepStrictEqual(ir.resultType, Types.int);
    }
  });

  it('transforms -float', () => {
    const ir = transform(unary('-', literal(3.14)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'neg');
      assert.deepStrictEqual(ir.argTypes, [Types.float]);
      assert.deepStrictEqual(ir.resultType, Types.float);
    }
  });

  it('transforms +int', () => {
    const ir = transform(unary('+', literal(5)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'pos');
      assert.deepStrictEqual(ir.argTypes, [Types.int]);
      assert.deepStrictEqual(ir.resultType, Types.int);
    }
  });

  it('transforms !bool', () => {
    const ir = transform(unary('!', literal(true)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'not');
      assert.deepStrictEqual(ir.argTypes, [Types.bool]);
      assert.deepStrictEqual(ir.resultType, Types.bool);
    }
  });

  it('transforms -unknown to any', () => {
    // Use _ (input variable) which is always in scope with any type
    const ir = transform(unary('-', variable('_')));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'neg');
      assert.deepStrictEqual(ir.argTypes, [Types.any]);
      assert.deepStrictEqual(ir.resultType, Types.any);
    }
  });
});

describe('transform - temporal keywords', () => {
  it('transforms TODAY', () => {
    const ir = transform(temporalKeyword('TODAY'));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'today');
      assert.strictEqual(ir.args.length, 0);
      assert.deepStrictEqual(ir.resultType, Types.date);
    }
  });

  it('transforms NOW', () => {
    const ir = transform(temporalKeyword('NOW'));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'now');
      assert.strictEqual(ir.args.length, 0);
      assert.deepStrictEqual(ir.resultType, Types.datetime);
    }
  });

  it('transforms TOMORROW as today + P1D', () => {
    const ir = transform(temporalKeyword('TOMORROW'));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'add');
      assert.strictEqual(ir.args.length, 2);
      assert.deepStrictEqual(ir.argTypes, [Types.date, Types.duration]);
      assert.deepStrictEqual(ir.resultType, Types.date);
      // First arg should be today()
      const todayCall = ir.args[0];
      assert.strictEqual(todayCall.type, 'call');
      if (todayCall.type === 'call') {
        assert.strictEqual(todayCall.fn, 'today');
      }
    }
  });

  it('transforms YESTERDAY as today - P1D', () => {
    const ir = transform(temporalKeyword('YESTERDAY'));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'sub');
      assert.strictEqual(ir.args.length, 2);
      assert.deepStrictEqual(ir.argTypes, [Types.date, Types.duration]);
      assert.deepStrictEqual(ir.resultType, Types.date);
    }
  });

  it('transforms SOD', () => {
    const ir = transform(temporalKeyword('SOD'));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'start_of_day');
      assert.deepStrictEqual(ir.resultType, Types.datetime);
    }
  });

  it('transforms EOD', () => {
    const ir = transform(temporalKeyword('EOD'));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'end_of_day');
      assert.deepStrictEqual(ir.resultType, Types.datetime);
    }
  });

  it('transforms SOW', () => {
    const ir = transform(temporalKeyword('SOW'));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'start_of_week');
    }
  });

  it('transforms EOW', () => {
    const ir = transform(temporalKeyword('EOW'));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'end_of_week');
    }
  });

  it('transforms SOM', () => {
    const ir = transform(temporalKeyword('SOM'));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'start_of_month');
    }
  });

  it('transforms EOM', () => {
    const ir = transform(temporalKeyword('EOM'));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'end_of_month');
    }
  });

  it('transforms SOQ', () => {
    const ir = transform(temporalKeyword('SOQ'));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'start_of_quarter');
    }
  });

  it('transforms EOQ', () => {
    const ir = transform(temporalKeyword('EOQ'));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'end_of_quarter');
    }
  });

  it('transforms SOY', () => {
    const ir = transform(temporalKeyword('SOY'));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'start_of_year');
    }
  });

  it('transforms EOY', () => {
    const ir = transform(temporalKeyword('EOY'));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'end_of_year');
    }
  });
});

describe('transform - function calls', () => {
  it('transforms function call with no args', () => {
    const ir = transform(functionCall('foo', []));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'foo');
      assert.strictEqual(ir.args.length, 0);
      assert.deepStrictEqual(ir.resultType, Types.any);
    }
  });

  it('transforms function call with args', () => {
    const ir = transform(functionCall('max', [literal(1), literal(2)]));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'max');
      assert.strictEqual(ir.args.length, 2);
    }
  });
});

describe('transform - member access', () => {
  it('transforms member access on data (any type)', () => {
    // Use _ (input variable) which is always in scope with any type
    const ir = transform(memberAccess(variable('_'), 'property'));
    assert.strictEqual(ir.type, 'member_access');
    if (ir.type === 'member_access') {
      assert.strictEqual(ir.property, 'property');
    }
  });

  it('transforms nested member access on data', () => {
    // _.person.name - nested access on any type
    const ir = transform(memberAccess(memberAccess(variable('_'), 'person'), 'name'));
    assert.strictEqual(ir.type, 'member_access');
  });

  it('transforms member access on object literal', () => {
    // {x: 1}.x
    const obj = { type: 'object', properties: [{ key: 'x', value: literal(1) }] } as any;
    const ir = transform(memberAccess(obj, 'x'));
    assert.strictEqual(ir.type, 'member_access');
  });

  it('rejects member access on date type', () => {
    // D2024-01-01.year should fail
    assert.throws(
      () => transform(memberAccess(dateLiteral('2024-01-01'), 'year')),
      /Member access '\.year' is not allowed on date type/
    );
  });

  it('rejects member access on datetime type', () => {
    // D2024-01-01T00:00:00Z.hour should fail
    assert.throws(
      () => transform(memberAccess(dateTimeLiteral('2024-01-01T00:00:00Z'), 'hour')),
      /Member access '\.hour' is not allowed on datetime type/
    );
  });

  it('rejects member access on duration type', () => {
    // PT1H.minutes should fail
    assert.throws(
      () => transform(memberAccess(durationLiteral('PT1H'), 'minutes')),
      /Member access '\.minutes' is not allowed on duration type/
    );
  });

  it('rejects member access on string type', () => {
    // 'hello'.length should fail
    assert.throws(
      () => transform(memberAccess(stringLiteral('hello'), 'length')),
      /Member access '\.length' is not allowed on string type/
    );
  });

  it('rejects member access on int type', () => {
    // 42.toString should fail
    assert.throws(
      () => transform(memberAccess(literal(42), 'toString')),
      /Member access '\.toString' is not allowed on int type/
    );
  });

  it('rejects member access on bool type', () => {
    // true.valueOf should fail
    assert.throws(
      () => transform(memberAccess(literal(true), 'valueOf')),
      /Member access '\.valueOf' is not allowed on bool type/
    );
  });

  it('rejects member access on function type', () => {
    // fn(x ~> x).name should fail
    assert.throws(
      () => transform(memberAccess(lambda(['x'], variable('x')), 'name')),
      /Member access '\.name' is not allowed on fn type/
    );
  });
});

describe('transform - method calls (apply on member access)', () => {
  it('allows calling function stored in data', () => {
    // _.callback() - calling a function stored in data should work
    const ir = transform(apply(memberAccess(variable('_'), 'callback'), []));
    assert.strictEqual(ir.type, 'apply');
  });

  it('rejects method call on datetime (caught by member access restriction)', () => {
    // D2024-01-01T00:00:00Z.diff(D2024-01-02T00:00:00Z) should fail
    // The member access '.diff' is rejected before apply is processed
    assert.throws(
      () => transform(apply(
        memberAccess(dateTimeLiteral('2024-01-01T00:00:00Z'), 'diff'),
        [dateTimeLiteral('2024-01-02T00:00:00Z')]
      )),
      /Member access '\.diff' is not allowed on datetime type/
    );
  });

  it('rejects method call on string (caught by member access restriction)', () => {
    // 'hello'.toUpperCase() should fail
    // The member access '.toUpperCase' is rejected before apply is processed
    assert.throws(
      () => transform(apply(
        memberAccess(stringLiteral('hello'), 'toUpperCase'),
        []
      )),
      /Member access '\.toUpperCase' is not allowed on string type/
    );
  });

  it('rejects method call on duration (caught by member access restriction)', () => {
    // PT1H.toMillis() should fail
    // The member access '.toMillis' is rejected before apply is processed
    assert.throws(
      () => transform(apply(
        memberAccess(durationLiteral('PT1H'), 'toMillis'),
        []
      )),
      /Member access '\.toMillis' is not allowed on duration type/
    );
  });
});

describe('transform - apply recursion guard (security)', () => {
  // Elo guarantees every expression terminates. Applying a lambda parameter to
  // itself ((x)(x)) builds a Y-combinator whose compiled form never finishes.
  // Because params are typed `any`, this slipped past the function_call
  // recursion check, which only inspects named calls.

  it('rejects self-application of a lambda parameter', () => {
    assert.throws(
      () => transform(parse('fn(x ~> (x)(x))')),
      /cannot be called as a function|not a function|recursion/i
    );
  });

  it('rejects the Y-combinator term', () => {
    assert.throws(
      () => transform(parse('(fn(x ~> (x)(x)))(fn(x ~> (x)(x)))')),
      /cannot be called as a function|not a function|recursion/i
    );
  });

  it('still allows immediately-invoked lambdas', () => {
    assert.strictEqual(transform(parse('(fn(x ~> x))(5)')).type, 'apply');
  });

  it('still allows applying a let-bound function through parentheses', () => {
    assert.strictEqual(transform(parse('let f = fn(x ~> x) in (f)(5)')).type, 'let');
  });

  it('still allows calling a function stored in data', () => {
    assert.strictEqual(
      transform(apply(memberAccess(variable('_'), 'callback'), [])).type,
      'apply'
    );
  });
});

describe('transform - let expressions', () => {
  it('transforms let with single binding', () => {
    const ir = transform(letExpr([{ name: 'x', value: literal(1) }], variable('x')));
    assert.strictEqual(ir.type, 'let');
    if (ir.type === 'let') {
      assert.strictEqual(ir.bindings.length, 1);
      assert.strictEqual(ir.bindings[0].name, 'x');
      // Body should have x with int type
      assert.strictEqual(ir.body.type, 'variable');
      if (ir.body.type === 'variable') {
        assert.deepStrictEqual(ir.body.inferredType, Types.int);
      }
    }
  });

  it('propagates types through let bindings', () => {
    // let x = 1 in x + 2
    const ir = transform(
      letExpr(
        [{ name: 'x', value: literal(1) }],
        binary('+', variable('x'), literal(2))
      )
    );
    assert.strictEqual(ir.type, 'let');
    if (ir.type === 'let') {
      // Body should be add with [int, int] since x is known to be int
      assert.strictEqual(ir.body.type, 'call');
      if (ir.body.type === 'call') {
        assert.strictEqual(ir.body.fn, 'add');
        assert.deepStrictEqual(ir.body.argTypes, [Types.int, Types.int]);
        assert.deepStrictEqual(ir.body.resultType, Types.int);
      }
    }
  });

  it('handles nested let bindings', () => {
    // let x = 1 in let y = 2 in x + y
    const ir = transform(
      letExpr(
        [{ name: 'x', value: literal(1) }],
        letExpr(
          [{ name: 'y', value: literal(2) }],
          binary('+', variable('x'), variable('y'))
        )
      )
    );
    assert.strictEqual(ir.type, 'let');
    if (ir.type === 'let') {
      assert.strictEqual(ir.body.type, 'let');
      if (ir.body.type === 'let') {
        assert.strictEqual(ir.body.body.type, 'call');
        if (ir.body.body.type === 'call') {
          assert.strictEqual(ir.body.body.fn, 'add');
          assert.deepStrictEqual(ir.body.body.argTypes, [Types.int, Types.int]);
        }
      }
    }
  });
});

describe('transform - shadowing', () => {
  // A binding that shadows another is emitted under a name of its own. The
  // targets share one scope between the two otherwise, and each gets it wrong
  // in its own way: JavaScript reads the name it is declaring, Ruby and Python
  // overwrite the outer binding for good.

  it('renames a binding that shadows another, and not the one it shadows', () => {
    const ir = transform(parse('let x = 1 in let x = x + 1 in x'));
    assert.strictEqual(ir.type, 'let');
    if (ir.type !== 'let') return;
    assert.strictEqual(ir.bindings[0].name, 'x');
    assert.strictEqual(ir.body.type, 'let');
    if (ir.body.type !== 'let') return;
    assert.strictEqual(ir.body.bindings[0].name, 'x__2');
    // The value reads what the binding shadows, under its own name
    const value = ir.body.bindings[0].value;
    assert.strictEqual(value.type, 'call');
    if (value.type === 'call') {
      assert.deepStrictEqual(value.args[0], { type: 'variable', name: 'x', inferredType: Types.int });
    }
    // And the body reads the shadowing binding
    assert.deepStrictEqual(ir.body.body, { type: 'variable', name: 'x__2', inferredType: Types.int });
  });

  it('leaves a name alone when there is nothing to shadow', () => {
    // Sibling scopes are not nested, so both may answer to `x`
    const ir = transform(parse('(let x = 1 in x) + (let x = 2 in x)'));
    assert.strictEqual(ir.type, 'call');
    if (ir.type !== 'call') return;
    for (const arg of ir.args) {
      assert.strictEqual(arg.type, 'let');
      if (arg.type === 'let') assert.strictEqual(arg.bindings[0].name, 'x');
    }
  });

  it('keeps a shadowing parameter name, since a parameter has its own scope', () => {
    const ir = transform(parse('let x = 1 in fn( x ~> x )'));
    assert.strictEqual(ir.type, 'let');
    if (ir.type !== 'let') return;
    assert.strictEqual(ir.body.type, 'lambda');
    if (ir.body.type === 'lambda') {
      assert.deepStrictEqual(ir.body.params.map(p => p.name), ['x']);
      assert.deepStrictEqual(ir.body.body, { type: 'variable', name: 'x', inferredType: Types.any });
    }
  });

  it('renames a binding that shadows one still being defined', () => {
    // The inner `x` is inside the value of the outer one, which Ruby and
    // Python would overwrite — the lambda would stop being callable.
    const ir = transform(parse('let x = fn( q ~> let x = q + 1 in x ) in x(1)'));
    assert.strictEqual(ir.type, 'let');
    if (ir.type !== 'let') return;
    assert.strictEqual(ir.bindings[0].name, 'x');
    const lambda = ir.bindings[0].value;
    assert.strictEqual(lambda.type, 'lambda');
    if (lambda.type === 'lambda') {
      assert.strictEqual(lambda.body.type, 'let');
      if (lambda.body.type === 'let') {
        assert.strictEqual(lambda.body.bindings[0].name, 'x__2');
      }
    }
  });

  it('lets a lambda bound to a shadowing name call the one it shadows', () => {
    // Resolving the name first is what tells this from a recursive call
    assert.doesNotThrow(() =>
      transform(parse('let f = fn( x ~> x + 1 ) in let f = fn( x ~> f(x) * 2 ) in f(1)')));
  });

  it('still refuses a lambda that calls itself', () => {
    assert.throws(
      () => transform(parse('let f = fn( x ~> f(x) ) in f(1)')),
      /cannot call itself/
    );
  });

  it('renames a constraint variable that shadows a binding', () => {
    // Ruby assigns the constraint variable inside the parser lambda, which
    // captures the enclosing locals, so `i` must not be the same name twice.
    const ir = transform(parse('let i = 100 in let T = Int(i | i > 0) in i'));
    assert.strictEqual(ir.type, 'let');
    if (ir.type !== 'let') return;
    assert.strictEqual(ir.body.type, 'typedef');
    if (ir.body.type === 'typedef') {
      const typeExpr = ir.body.definitions[0].typeExpr;
      assert.strictEqual(typeExpr.kind, 'subtype_constraint');
      if (typeExpr.kind === 'subtype_constraint') {
        assert.strictEqual(typeExpr.variable, 'i__2');
      }
    }
  });
});

describe('transform - complex expressions', () => {
  it('transforms nested arithmetic', () => {
    // (1 + 2) * 3
    const ir = transform(binary('*', binary('+', literal(1), literal(2)), literal(3)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'mul');
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.int]);
      // First arg is the nested add
      assert.strictEqual(ir.args[0].type, 'call');
      if (ir.args[0].type === 'call') {
        assert.strictEqual(ir.args[0].fn, 'add');
        assert.deepStrictEqual(ir.args[0].argTypes, [Types.int, Types.int]);
      }
    }
  });

  it('transforms TODAY + P1D', () => {
    const ir = transform(binary('+', temporalKeyword('TODAY'), durationLiteral('P1D')));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'add');
      assert.deepStrictEqual(ir.argTypes, [Types.date, Types.duration]);
      assert.deepStrictEqual(ir.resultType, Types.date);
    }
  });

  it('infers correct type through entire expression', () => {
    // let start = TODAY in start + P1D
    const ir = transform(
      letExpr(
        [{ name: 'start', value: temporalKeyword('TODAY') }],
        binary('+', variable('start'), durationLiteral('P1D'))
      )
    );
    assert.strictEqual(inferType(ir), Types.date);
  });
});

describe('transform - recursion detection', () => {
  it('rejects direct recursive lambda call', () => {
    // let f = fn(x ~> f(x)) in f(1) should fail
    assert.throws(
      () => transform(
        letExpr(
          [{ name: 'f', value: lambda(['x'], functionCall('f', [variable('x')])) }],
          functionCall('f', [literal(1)])
        )
      ),
      /Recursive function calls are not allowed: 'f' cannot call itself/
    );
  });

  it('allows non-recursive lambda', () => {
    // let f = fn(x ~> x + 1) in f(1) should work
    const ir = transform(
      letExpr(
        [{ name: 'f', value: lambda(['x'], binary('+', variable('x'), literal(1))) }],
        functionCall('f', [literal(1)])
      )
    );
    assert.strictEqual(ir.type, 'let');
  });

  it('allows calling a different function', () => {
    // let f = fn(x ~> g(x)) in f(1) should work (g is stdlib)
    const ir = transform(
      letExpr(
        [{ name: 'f', value: lambda(['x'], functionCall('abs', [variable('x')])) }],
        functionCall('f', [literal(1)])
      )
    );
    assert.strictEqual(ir.type, 'let');
  });
});

describe('transform - depth limits', () => {
  it('transforms expressions within depth limit', () => {
    // Simple nested expression with maxDepth=10 should work
    const ast = binary('+', binary('+', binary('+', literal(1), literal(2)), literal(3)), literal(4));
    const ir = transform(ast, new Map(), new Set(), { maxDepth: 10 });
    assert.strictEqual(ir.type, 'call');
  });

  it('throws when depth limit exceeded with deeply nested binary ops', () => {
    // Create deeply nested binary expression: ((((1+2)+3)+4)+5)+...
    let ast: any = literal(1);
    for (let i = 0; i < 20; i++) {
      ast = binary('+', ast, literal(i));
    }
    assert.throws(
      () => transform(ast, new Map(), new Set(), { maxDepth: 5 }),
      /Maximum transform depth exceeded \(5\)/
    );
  });

  it('throws when depth limit exceeded with nested let expressions', () => {
    // Nested let: let a = let b = let c = ... in c in b in a
    let ast: any = literal(1);
    for (let i = 0; i < 10; i++) {
      ast = letExpr([{ name: `v${i}`, value: literal(i) }], ast);
    }
    assert.throws(
      () => transform(ast, new Map(), new Set(), { maxDepth: 5 }),
      /Maximum transform depth exceeded \(5\)/
    );
  });

  it('uses default maxDepth of 100', () => {
    // 50 levels should work with default maxDepth
    let ast: any = literal(1);
    for (let i = 0; i < 50; i++) {
      ast = binary('+', ast, literal(i));
    }
    const ir = transform(ast);
    assert.strictEqual(ir.type, 'call');
  });

  it('throws when depth limit exceeded in nested type expressions', () => {
    // Type expressions ([[[...Int...]]]) recurse in parallel to value
    // expressions. The guard historically did not count this descent, so deep
    // type nesting overflowed the host call stack instead of raising a typed
    // error.
    let typeExpr: any = typeRef('Int');
    for (let i = 0; i < 20; i++) {
      typeExpr = arrayType(typeExpr);
    }
    assert.throws(
      () => transform(typeDef([{ name: 'T', typeExpr }], literal(1)), new Map(), new Set(), { maxDepth: 5 }),
      /Maximum transform depth exceeded \(5\)/
    );
  });

  it('transforms nested type expressions within the depth limit', () => {
    let typeExpr: any = typeRef('Int');
    for (let i = 0; i < 3; i++) {
      typeExpr = arrayType(typeExpr);
    }
    const ir = transform(typeDef([{ name: 'T', typeExpr }], literal(1)), new Map(), new Set(), { maxDepth: 10 });
    assert.strictEqual(ir.type, 'typedef');
  });
});

describe('transform - array multiplication is rejected (security)', () => {
  // `[1] * n` is not a supported operation: it means nothing on SQL, coerces to
  // NaN on JS, and on Ruby/Python repeats the array — an unbounded allocation
  // (`[1] * 1000000000` OOMs the host). Multiplication is numeric (plus the
  // documented String*Number); an array operand is a type error.

  it('rejects an array literal multiplied by an int', () => {
    assert.throws(() => transform(parse('[1] * 3')), /multiplication|cannot be multiplied|array/i);
  });

  it('rejects a data-driven repetition count ([1] * Int(_))', () => {
    assert.throws(() => transform(parse('[1] * Int(_)')), /multiplication|cannot be multiplied|array/i);
  });

  it('rejects array on either side', () => {
    assert.throws(() => transform(parse('3 * [1]')), /multiplication|cannot be multiplied|array/i);
  });

  it('still allows numeric, string and duration multiplication', () => {
    assert.doesNotThrow(() => transform(parse('2 * 3')));
    assert.doesNotThrow(() => transform(parse("'ab' * 3")));
    assert.doesNotThrow(() => transform(parse('P1D * 2')));
  });
});

describe('transform - type definitions', () => {
  it('transforms typedef with built-in type selector Int', () => {
    // let T = Int in 42
    const ir = transform(typeDef([{ name: 'T', typeExpr: typeRef('Int') }], literal(42)));
    assert.strictEqual(ir.type, 'typedef');
    if (ir.type === 'typedef') {
      assert.strictEqual(ir.definitions[0].name, 'T');
      const typeExpr = ir.definitions[0].typeExpr;
      assert.strictEqual(typeExpr.kind, 'type_ref');
      if (typeExpr.kind === 'type_ref') {
        assert.strictEqual(typeExpr.name, 'Int');
      }
    }
  });

  it('transforms typedef with built-in type selector Null', () => {
    // let T = Null in null
    const ir = transform(typeDef([{ name: 'T', typeExpr: typeRef('Null') }], literal(null as any)));
    assert.strictEqual(ir.type, 'typedef');
    if (ir.type === 'typedef') {
      assert.strictEqual(ir.definitions[0].name, 'T');
      const typeExpr = ir.definitions[0].typeExpr;
      assert.strictEqual(typeExpr.kind, 'type_ref');
      if (typeExpr.kind === 'type_ref') {
        assert.strictEqual(typeExpr.name, 'Null');
      }
    }
  });

  it('transforms typedef with all built-in type selectors', () => {
    // All built-in types should work: Any, Null, String, Int, Float, Bool, Boolean, Date, Datetime
    const builtinTypes = ['Any', 'Null', 'String', 'Int', 'Float', 'Bool', 'Boolean', 'Date', 'Datetime'];
    for (const typeName of builtinTypes) {
      const ir = transform(typeDef([{ name: 'T', typeExpr: typeRef(typeName) }], literal(42)));
      assert.strictEqual(ir.type, 'typedef');
      if (ir.type === 'typedef') {
        const typeExpr = ir.definitions[0].typeExpr;
        assert.strictEqual(typeExpr.kind, 'type_ref');
        if (typeExpr.kind === 'type_ref') {
          assert.strictEqual(typeExpr.name, typeName);
        }
      }
    }
  });

  it('rejects unknown type selector', () => {
    // let T = Foo in 42 should fail with "Unknown type selector"
    assert.throws(
      () => transform(typeDef([{ name: 'T', typeExpr: typeRef('Foo') }], literal(42))),
      /Unknown type selector: 'Foo'/
    );
  });

  it('rejects unknown type selector in union type', () => {
    // let T = Int|Foo in 42 should fail with "Unknown type selector"
    assert.throws(
      () => transform(typeDef([{ name: 'T', typeExpr: unionType([typeRef('Int'), typeRef('Foo')]) }], literal(42))),
      /Unknown type selector: 'Foo'/
    );
  });

  it('allows a definition to refer to one before it', () => {
    // let A = String, B = A in body
    const ir = transform(
      typeDef([
        { name: 'A', typeExpr: typeRef('String') },
        { name: 'B', typeExpr: typeRef('A') },
      ], literal(42))
    );
    assert.strictEqual(ir.type, 'typedef');
    if (ir.type === 'typedef') {
      assert.deepStrictEqual(ir.definitions.map(d => d.name), ['A', 'B']);
      const b = ir.definitions[1].typeExpr;
      assert.strictEqual(b.kind, 'type_ref');
      if (b.kind === 'type_ref') {
        assert.strictEqual(b.name, 'A');
      }
    }
  });

  it('rejects a definition referring to one after it', () => {
    // let B = A, A = String in body: A is not in scope where B is defined
    assert.throws(
      () => transform(
        typeDef([
          { name: 'B', typeExpr: typeRef('A') },
          { name: 'A', typeExpr: typeRef('String') },
        ], literal(42))
      ),
      /Unknown type selector: 'A'/
    );
  });

  it('allows user-defined type in union with built-in types', () => {
    // let Foo = Bool, X = Int|Foo in body
    const ir = transform(
      typeDef([
        { name: 'Foo', typeExpr: typeRef('Bool') },
        { name: 'X', typeExpr: unionType([typeRef('Int'), typeRef('Foo')]) },
      ], literal(42))
    );
    assert.strictEqual(ir.type, 'typedef');
    if (ir.type === 'typedef') {
      assert.strictEqual(ir.definitions[1].typeExpr.kind, 'union_type');
    }
  });

  it('does not count a definition as a level of nesting', () => {
    // A file's prelude is as long as the file needs; the depth guard is there
    // for deeply nested expressions, not for how many types are declared.
    const definitions = Array.from({ length: 120 }, (_, i) => ({
      name: `T${i}`,
      typeExpr: typeRef('Int'),
    }));
    const ir = transform(typeDef(definitions, literal(42)), new Map(), new Set(), { maxDepth: 5 });
    assert.strictEqual(ir.type, 'typedef');
    if (ir.type === 'typedef') {
      assert.strictEqual(ir.definitions.length, 120);
    }
  });

  it('rejects self-referential type in single typedef', () => {
    // let Foo = Foo in 42 should fail (Foo is not yet defined when its type expr is parsed)
    assert.throws(
      () => transform(typeDef([{ name: 'Foo', typeExpr: typeRef('Foo') }], literal(42))),
      /Unknown type selector: 'Foo'/
    );
  });
});

describe('transform - extract validation', () => {
  it('transforms valid extract call', () => {
    const ir = transform(functionCall('extract', [
      stringLiteral('From: John <john@acme.com>'),
      stringLiteral('From: {{name}} <{{email}}>')
    ]));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'extract');
      assert.deepStrictEqual(ir.resultType, Types.object);
    }
  });

  it('rejects extract with non-literal template', () => {
    assert.throws(
      () => transform(functionCall('extract', [
        stringLiteral('hello'),
        variable('_')
      ])),
      /extract\(\) template.*must be a string literal/
    );
  });

  it('rejects extract with invalid template', () => {
    assert.throws(
      () => transform(functionCall('extract', [
        stringLiteral('hello'),
        stringLiteral('no placeholders here')
      ])),
      /at least one/
    );
  });

  it('rejects extract with wrong number of arguments', () => {
    assert.throws(
      () => transform(functionCall('extract', [
        stringLiteral('hello')
      ])),
      /extract\(\) requires exactly 2 arguments/
    );
  });
});

describe('transform - calling a function stored in data', () => {
  /**
   * `r.double(2)` has always been allowed: a function stored in data may be
   * applied. A name bound to that same field read is the same function, so
   * calling it is the same application — which is what makes
   * `import { double } from './m'` callable, since an import binds the name to
   * a field of the module's value.
   */
  it('applies a name bound to a field read', () => {
    const ir = transform(parse('let f = o.g in f(1)'), new Map([['o', Types.object]]));
    assert.strictEqual(ir.type, 'let');
    const body = ir.type === 'let' ? ir.body : ir;
    assert.strictEqual(body.type, 'apply');
    assert.strictEqual(body.type === 'apply' && body.fn.type, 'variable');
  });

  it('applies a name bound to a path into the input', () => {
    const ir = transform(parse('let f = _.g in f(1)'));
    const body = ir.type === 'let' ? ir.body : ir;
    assert.strictEqual(body.type, 'apply');
  });

  /**
   * Everything else stays a call to a stdlib function nobody defined, which
   * every compiler then refuses. The narrowness is the point: a lambda
   * parameter is typed `any` too, and applying one to itself is the
   * Y-combinator shape that would break Elo's termination guarantee.
   */
  it('leaves a call on a lambda parameter a call, which could not terminate', () => {
    const ir = transform(parse('let g = fn( f ~> f(f) ) in g(1)'));
    const lambda = ir.type === 'let' ? ir.bindings[0].value : ir;
    assert.strictEqual(lambda.type === 'lambda' && lambda.body.type, 'call');
  });

  it('leaves a call on a name bound to something that is not a field a call', () => {
    const ir = transform(parse('let f = 1 in f(1)'));
    assert.strictEqual(ir.type === 'let' && ir.body.type, 'call');
  });

  it('forgets the name once its binding is out of scope', () => {
    // `+` on operands it cannot type is itself a call, so the second operand
    // is its second argument: a call to `f`, not an application of it.
    const ir = transform(parse('(let f = o.g in f(1)) + f(2)'), new Map([['o', Types.object]]));
    assert.strictEqual(ir.type, 'call');
    const outside = ir.type === 'call' ? ir.args[1] : ir;
    assert.strictEqual(outside.type, 'call');
    assert.strictEqual(outside.type === 'call' && outside.fn, 'f');
  });

  it('is refused by the compiler when the name is not a function', () => {
    assert.throws(
      () => compileToJavaScript(parse('let f = 1 in f(1)')),
      /Unknown function f/
    );
  });
});
