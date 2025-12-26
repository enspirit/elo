import { describe, it } from 'node:test';
import assert from 'node:assert';
import { transform, TypeEnv } from '../../src/transform';
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
  it('transforms unknown variable to any type', () => {
    const ir = transform(variable('x'));
    assert.strictEqual(ir.type, 'variable');
    if (ir.type === 'variable') {
      assert.strictEqual(ir.name, 'x');
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

  it('transforms int ^ int', () => {
    const ir = transform(binary('^', literal(2), literal(3)));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'pow');
      assert.deepStrictEqual(ir.argTypes, [Types.int, Types.int]);
      assert.deepStrictEqual(ir.resultType, Types.int);
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
  it('transforms unknown + unknown to any result', () => {
    const ir = transform(binary('+', variable('a'), variable('b')));
    assert.strictEqual(ir.type, 'call');
    if (ir.type === 'call') {
      assert.strictEqual(ir.fn, 'add');
      assert.deepStrictEqual(ir.argTypes, [Types.any, Types.any]);
      assert.deepStrictEqual(ir.resultType, Types.any);
    }
  });

  it('transforms known + unknown to any result', () => {
    const ir = transform(binary('+', literal(1), variable('x')));
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
    const ir = transform(unary('-', variable('x')));
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
  it('transforms member access', () => {
    const ir = transform(memberAccess(variable('obj'), 'property'));
    assert.strictEqual(ir.type, 'member_access');
    if (ir.type === 'member_access') {
      assert.strictEqual(ir.property, 'property');
    }
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
});
