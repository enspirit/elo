/**
 * Python stdlib binding for Elo
 *
 * This module defines how Elo IR functions are emitted as Python code.
 */

import { IRExpr } from '../ir';
import { Types } from '../types';
import { StdLib, simpleBinaryOp, helperCall, isBinaryOp, FunctionEmitter } from '../stdlib';

/**
 * Map IR function names to Python operators
 */
export const PYTHON_OP_MAP: Record<string, string> = {
  'add': '+', 'sub': '-', 'mul': '*', 'div': '/', 'mod': '%', 'pow': '**',
  'lt': '<', 'gt': '>', 'lte': '<=', 'gte': '>=',
  'eq': '==', 'neq': '!=', 'and': 'and', 'or': 'or',
};

/**
 * Check if a call will be emitted as a native Python binary operator
 */
export function isNativeBinaryOp(ir: IRExpr): boolean {
  if (ir.type !== 'call') return false;
  const { fn, argTypes } = ir;

  // Arithmetic with numeric types
  if (['add', 'sub', 'mul', 'div', 'mod', 'pow'].includes(fn)) {
    const [left, right] = argTypes;
    if ((left.kind === 'int' || left.kind === 'float') &&
        (right.kind === 'int' || right.kind === 'float')) {
      return true;
    }
    // String concatenation
    if (fn === 'add' && left.kind === 'string' && right.kind === 'string') {
      return true;
    }
  }

  // Comparison and logical operators
  if (['lt', 'gt', 'lte', 'gte', 'eq', 'neq', 'and', 'or'].includes(fn)) {
    return true;
  }

  return false;
}

/**
 * Helper for Python method call that wraps binary expressions in parens.
 */
function pyMethod(method: string): FunctionEmitter<string> {
  return (args, ctx) => {
    const emitted = ctx.emit(args[0]);
    const needsParens = isBinaryOp(args[0]);
    return needsParens ? `(${emitted}).${method}` : `${emitted}.${method}`;
  };
}

/**
 * Create the Python standard library binding
 */
export function createPythonBinding(): StdLib<string> {
  const pyLib = new StdLib<string>();

  // Numeric arithmetic - native Python operators for known numeric types
  for (const leftType of [Types.int, Types.float]) {
    for (const rightType of [Types.int, Types.float]) {
      pyLib.register('add', [leftType, rightType], simpleBinaryOp('+'));
      pyLib.register('sub', [leftType, rightType], simpleBinaryOp('-'));
      pyLib.register('mul', [leftType, rightType], simpleBinaryOp('*'));
      pyLib.register('div', [leftType, rightType], simpleBinaryOp('/'));
      pyLib.register('mod', [leftType, rightType], simpleBinaryOp('%'));
      pyLib.register('pow', [leftType, rightType], simpleBinaryOp('**'));
    }
  }

  // String concatenation
  pyLib.register('add', [Types.string, Types.string], simpleBinaryOp('+'));

  // String repetition
  pyLib.register('mul', [Types.string, Types.int], simpleBinaryOp('*'));
  pyLib.register('mul', [Types.int, Types.string], simpleBinaryOp('*'));

  // List concatenation
  pyLib.register('add', [Types.array, Types.array], simpleBinaryOp('+'));

  // Comparison operators - native for numeric types
  for (const leftType of [Types.int, Types.float]) {
    for (const rightType of [Types.int, Types.float]) {
      pyLib.register('lt', [leftType, rightType], simpleBinaryOp('<'));
      pyLib.register('gt', [leftType, rightType], simpleBinaryOp('>'));
      pyLib.register('lte', [leftType, rightType], simpleBinaryOp('<='));
      pyLib.register('gte', [leftType, rightType], simpleBinaryOp('>='));
      pyLib.register('eq', [leftType, rightType], simpleBinaryOp('=='));
      pyLib.register('neq', [leftType, rightType], simpleBinaryOp('!='));
    }
  }

  // String comparison
  pyLib.register('eq', [Types.string, Types.string], simpleBinaryOp('=='));
  pyLib.register('neq', [Types.string, Types.string], simpleBinaryOp('!='));

  // Boolean comparison
  pyLib.register('eq', [Types.bool, Types.bool], simpleBinaryOp('=='));
  pyLib.register('neq', [Types.bool, Types.bool], simpleBinaryOp('!='));

  // Logical operators
  pyLib.register('and', [Types.bool, Types.bool], simpleBinaryOp('and'));
  pyLib.register('or', [Types.bool, Types.bool], simpleBinaryOp('or'));

  // Unary operators
  pyLib.register('neg', [Types.int], (args, ctx) => `-${ctx.emit(args[0])}`);
  pyLib.register('neg', [Types.float], (args, ctx) => `-${ctx.emit(args[0])}`);
  pyLib.register('pos', [Types.int], (args, ctx) => `+${ctx.emit(args[0])}`);
  pyLib.register('pos', [Types.float], (args, ctx) => `+${ctx.emit(args[0])}`);
  pyLib.register('not', [Types.bool], (args, ctx) => {
    const emitted = ctx.emit(args[0]);
    // Always wrap in parens to ensure correct precedence (not has low precedence in Python)
    const needsParens = args[0].type === 'call';
    return needsParens ? `not (${emitted})` : `not ${emitted}`;
  });

  // Assert - uses helper that raises on failure
  pyLib.register('assert', [Types.bool], (args, ctx) => {
    ctx.requireHelper?.('kAssert');
    return `kAssert(${ctx.emit(args[0])})`;
  });
  pyLib.register('assert', [Types.bool, Types.string], (args, ctx) => {
    ctx.requireHelper?.('kAssert');
    return `kAssert(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });

  // Fail
  pyLib.register('fail', [Types.string], (args, ctx) => {
    ctx.requireHelper?.('kFail');
    return `kFail(${ctx.emit(args[0])})`;
  });

  // assertFails - expects function to throw
  pyLib.register('assertFails', [Types.fn], (args, ctx) => {
    ctx.requireHelper?.('kAssertFails');
    const emitted = ctx.emit(args[0]);
    // If arg is already a lambda, pass it directly; otherwise wrap in lambda to defer
    if (args[0].type === 'lambda') {
      return `kAssertFails(${emitted})`;
    }
    return `kAssertFails(lambda: ${emitted})`;
  });

  // Numeric functions
  pyLib.register('abs', [Types.int], (args, ctx) => `abs(${ctx.emit(args[0])})`);
  pyLib.register('abs', [Types.float], (args, ctx) => `abs(${ctx.emit(args[0])})`);
  pyLib.register('round', [Types.float], (args, ctx) => `round(${ctx.emit(args[0])})`);
  pyLib.register('round', [Types.int], (args, ctx) => `round(${ctx.emit(args[0])})`);
  pyLib.register('floor', [Types.float], (args, ctx) => {
    ctx.requireHelper?.('_import_math');
    return `math.floor(${ctx.emit(args[0])})`;
  });
  pyLib.register('floor', [Types.int], (args, ctx) => {
    ctx.requireHelper?.('_import_math');
    return `math.floor(${ctx.emit(args[0])})`;
  });
  pyLib.register('ceil', [Types.float], (args, ctx) => {
    ctx.requireHelper?.('_import_math');
    return `math.ceil(${ctx.emit(args[0])})`;
  });
  pyLib.register('ceil', [Types.int], (args, ctx) => {
    ctx.requireHelper?.('_import_math');
    return `math.ceil(${ctx.emit(args[0])})`;
  });

  // Equality/comparison with helpers for complex types
  pyLib.register('eq', [Types.array, Types.array], (args, ctx) => {
    ctx.requireHelper?.('kEq');
    return `kEq(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  pyLib.register('neq', [Types.array, Types.array], (args, ctx) => {
    ctx.requireHelper?.('kEq');
    return `not kEq(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  pyLib.register('eq', [Types.object, Types.object], (args, ctx) => {
    ctx.requireHelper?.('kEq');
    return `kEq(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  pyLib.register('neq', [Types.object, Types.object], (args, ctx) => {
    ctx.requireHelper?.('kEq');
    return `not kEq(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });

  // Null handling
  pyLib.register('isNull', [Types.any], (args, ctx) => `(${ctx.emit(args[0])} is None)`);
  pyLib.register('eq', [Types.null, Types.null], simpleBinaryOp('=='));

  // Type introspection
  pyLib.register('typeOf', [Types.any], (args, ctx) => {
    ctx.requireHelper?.('kTypeOf');
    return `kTypeOf(${ctx.emit(args[0])})`;
  });

  // String functions
  pyLib.register('length', [Types.string], (args, ctx) => `len(${ctx.emit(args[0])})`);
  pyLib.register('length', [Types.array], (args, ctx) => `len(${ctx.emit(args[0])})`);
  pyLib.register('count', [Types.array], (args, ctx) => `len(${ctx.emit(args[0])})`);
  pyLib.register('isEmpty', [Types.string], (args, ctx) => `(len(${ctx.emit(args[0])}) == 0)`);
  pyLib.register('isBlank', [Types.string], (args, ctx) => `(len(${ctx.emit(args[0])}.strip()) == 0)`);
  pyLib.register('isEmpty', [Types.array], (args, ctx) => `(len(${ctx.emit(args[0])}) == 0)`);
  pyLib.register('contains', [Types.array, Types.any], (args, ctx) =>
    `(${ctx.emit(args[1])} in ${ctx.emit(args[0])})`);
  pyLib.register('sort', [Types.array], (args, ctx) =>
    `sorted(${ctx.emit(args[0])})`);
  pyLib.register('upper', [Types.string], pyMethod('upper()'));
  pyLib.register('lower', [Types.string], pyMethod('lower()'));
  pyLib.register('trim', [Types.string], pyMethod('strip()'));
  pyLib.register('trimStart', [Types.string], pyMethod('lstrip()'));
  pyLib.register('trimEnd', [Types.string], pyMethod('rstrip()'));
  pyLib.register('reverse', [Types.string], (args, ctx) => `${ctx.emit(args[0])}[::-1]`);
  pyLib.register('startsWith', [Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.startswith(${ctx.emit(args[1])})`);
  pyLib.register('endsWith', [Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.endswith(${ctx.emit(args[1])})`);
  pyLib.register('contains', [Types.string, Types.string], (args, ctx) =>
    `(${ctx.emit(args[1])} in ${ctx.emit(args[0])})`);
  pyLib.register('indexOf', [Types.string, Types.string], (args, ctx) => {
    ctx.requireHelper?.('kIndexOf');
    return `kIndexOf(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  pyLib.register('replace', [Types.string, Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.replace(${ctx.emit(args[1])}, ${ctx.emit(args[2])}, 1)`);
  pyLib.register('replaceAll', [Types.string, Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.replace(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
  pyLib.register('split', [Types.string, Types.string], (args, ctx) => {
    ctx.requireHelper?.('kSplit');
    return `kSplit(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  pyLib.register('substring', [Types.string, Types.int, Types.int], (args, ctx) =>
    `${ctx.emit(args[0])}[${ctx.emit(args[1])}:${ctx.emit(args[1])} + ${ctx.emit(args[2])}]`);
  pyLib.register('concat', [Types.string, Types.string], simpleBinaryOp('+'));
  pyLib.register('padStart', [Types.string, Types.int, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.rjust(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
  pyLib.register('padEnd', [Types.string, Types.int, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.ljust(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);

  // Array functions
  pyLib.register('first', [Types.array], (args, ctx) => {
    ctx.requireHelper?.('kFirst');
    return `kFirst(${ctx.emit(args[0])})`;
  });
  pyLib.register('last', [Types.array], (args, ctx) => {
    ctx.requireHelper?.('kLast');
    return `kLast(${ctx.emit(args[0])})`;
  });
  pyLib.register('at', [Types.array, Types.int], (args, ctx) => {
    ctx.requireHelper?.('kAt');
    return `kAt(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  pyLib.register('min', [Types.array], (args, ctx) =>
    `(lambda a: min(a) if a else None)(${ctx.emit(args[0])})`);
  pyLib.register('max', [Types.array], (args, ctx) =>
    `(lambda a: max(a) if a else None)(${ctx.emit(args[0])})`);
  pyLib.register('sum', [Types.array], (args, ctx) =>
    `sum(${ctx.emit(args[0])})`);
  pyLib.register('avg', [Types.array], (args, ctx) =>
    `(lambda a: None if not a else sum(a) / len(a))(${ctx.emit(args[0])})`);
  pyLib.register('sum', [Types.array, Types.any], (args, ctx) => {
    ctx.requireHelper?.('_import_functools');
    ctx.requireHelper?.('kAdd');
    return `functools.reduce(kAdd, ${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  pyLib.register('reverse', [Types.array], (args, ctx) =>
    `list(reversed(${ctx.emit(args[0])}))`);
  pyLib.register('unique', [Types.array], (args, ctx) => {
    ctx.requireHelper?.('kEq');
    const arr = ctx.emit(args[0]);
    return `(lambda a: [x for i, x in enumerate(a) if not any(kEq(x, a[j]) for j in range(i))])(${arr})`;
  });
  pyLib.register('flat', [Types.array], (args, ctx) =>
    `[x for sub in ${ctx.emit(args[0])} for x in sub]`);
  pyLib.register('join', [Types.array, Types.string], (args, ctx) =>
    `${ctx.emit(args[1])}.join(${ctx.emit(args[0])})`);

  // Array iteration
  pyLib.register('map', [Types.array, Types.fn], (args, ctx) =>
    `list(map(${ctx.emit(args[1])}, ${ctx.emit(args[0])}))`);
  pyLib.register('filter', [Types.array, Types.fn], (args, ctx) =>
    `list(filter(${ctx.emit(args[1])}, ${ctx.emit(args[0])}))`);
  pyLib.register('reduce', [Types.array, Types.any, Types.fn], (args, ctx) => {
    ctx.requireHelper?.('_import_functools');
    return `functools.reduce(${ctx.emit(args[2])}, ${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  pyLib.register('any', [Types.array, Types.fn], (args, ctx) =>
    `any(map(${ctx.emit(args[1])}, ${ctx.emit(args[0])}))`);
  pyLib.register('all', [Types.array, Types.fn], (args, ctx) =>
    `all(map(${ctx.emit(args[1])}, ${ctx.emit(args[0])}))`);
  pyLib.register('find', [Types.array, Types.fn], (args, ctx) =>
    `next(filter(${ctx.emit(args[1])}, ${ctx.emit(args[0])}), None)`);
  pyLib.register('sortBy', [Types.array, Types.fn], (args, ctx) =>
    `sorted(${ctx.emit(args[0])}, key=${ctx.emit(args[1])})`);

  // Data/object functions
  pyLib.register('merge', [Types.object, Types.object], (args, ctx) =>
    `({**${ctx.emit(args[0])}, **${ctx.emit(args[1])}})`);
  pyLib.register('deepMerge', [Types.object, Types.object], (args, ctx) => {
    ctx.requireHelper?.('kDeepMerge');
    return `kDeepMerge(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });

  // Fetch
  pyLib.register('fetch', [Types.any, Types.fn], (args, ctx) => {
    ctx.requireHelper?.('kFetch');
    return `kFetch(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  pyLib.register('fetch', [Types.any, Types.string], (args, ctx) => {
    ctx.requireHelper?.('kFetch');
    return `kFetch(${ctx.emit(args[0])}, [${ctx.emit(args[1])}])`;
  });
  pyLib.register('fetch', [Types.any, Types.array], (args, ctx) => {
    ctx.requireHelper?.('kFetch');
    return `kFetch(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  pyLib.register('fetch', [Types.any, Types.object], (args, ctx) => {
    ctx.requireHelper?.('kFetchObject');
    return `kFetchObject(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });

  // Patch
  pyLib.register('patch', [Types.any, Types.any, Types.any], (args, ctx) => {
    ctx.requireHelper?.('kPatch');
    return `kPatch(${ctx.emit(args[0])}, ${ctx.emit(args[1])}, ${ctx.emit(args[2])})`;
  });

  // Temporal nullary functions
  pyLib.register('today', [], (_args, ctx) => {
    ctx.requireHelper?.('_elo_dt_helpers');
    return `_elo_dt(_dt.datetime.now().year, _dt.datetime.now().month, _dt.datetime.now().day)`;
  });
  pyLib.register('now', [], (_args, _ctx) => `_dt.datetime.now()`);
  pyLib.register('bot', [], (_args, ctx) => {
    ctx.requireHelper?.('_elo_dt_helpers');
    return `_elo_dt(1, 1, 1)`;
  });
  pyLib.register('eot', [], (_args, ctx) => {
    ctx.requireHelper?.('_elo_dt_helpers');
    return `_elo_dt(9999, 12, 31, 23, 59, 59)`;
  });

  // Period boundary functions
  const periodBoundaries = [
    'start_of_day', 'end_of_day', 'start_of_week', 'end_of_week',
    'start_of_month', 'end_of_month', 'start_of_quarter', 'end_of_quarter',
    'start_of_year', 'end_of_year',
  ];
  const camelToSnakeMap: Record<string, string> = {
    'startOfDay': 'start_of_day',
    'endOfDay': 'end_of_day',
    'startOfWeek': 'start_of_week',
    'endOfWeek': 'end_of_week',
    'startOfMonth': 'start_of_month',
    'endOfMonth': 'end_of_month',
    'startOfQuarter': 'start_of_quarter',
    'endOfQuarter': 'end_of_quarter',
    'startOfYear': 'start_of_year',
    'endOfYear': 'end_of_year',
  };

  for (const fn of periodBoundaries) {
    pyLib.register(fn, [Types.datetime], (args, ctx) => {
      ctx.requireHelper?.('_elo_dt_helpers');
      return `_elo_${fn}(${ctx.emit(args[0])})`;
    });
  }
  for (const [fn, snakeFn] of Object.entries(camelToSnakeMap)) {
    for (const t of [Types.date, Types.datetime]) {
      pyLib.register(fn, [t], (args, ctx) => {
        ctx.requireHelper?.('_elo_dt_helpers');
        return `_elo_${snakeFn}(${ctx.emit(args[0])})`;
      });
    }
  }

  // Temporal extraction
  for (const t of [Types.date, Types.datetime]) {
    pyLib.register('year', [t], (args, ctx) => `${ctx.emit(args[0])}.year`);
    pyLib.register('month', [t], (args, ctx) => `${ctx.emit(args[0])}.month`);
    pyLib.register('day', [t], (args, ctx) => `${ctx.emit(args[0])}.day`);
  }
  pyLib.register('hour', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.hour`);
  pyLib.register('minute', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.minute`);

  // Duration conversion
  pyLib.register('inYears', [Types.duration], (args, ctx) => `${ctx.emit(args[0])}.in_years()`);
  pyLib.register('inQuarters', [Types.duration], (args, ctx) => `${ctx.emit(args[0])}.in_quarters()`);
  pyLib.register('inMonths', [Types.duration], (args, ctx) => `${ctx.emit(args[0])}.in_months()`);
  pyLib.register('inWeeks', [Types.duration], (args, ctx) => `${ctx.emit(args[0])}.in_weeks()`);
  pyLib.register('inDays', [Types.duration], (args, ctx) => `${ctx.emit(args[0])}.in_days()`);
  pyLib.register('inHours', [Types.duration], (args, ctx) => `${ctx.emit(args[0])}.in_hours()`);
  pyLib.register('inMinutes', [Types.duration], (args, ctx) => `${ctx.emit(args[0])}.in_minutes()`);
  pyLib.register('inSeconds', [Types.duration], (args, ctx) => `${ctx.emit(args[0])}.in_seconds()`);

  // Type selectors (casting)
  pyLib.register('Int', [Types.any], (args, ctx) => `int(${ctx.emit(args[0])})`);
  pyLib.register('Float', [Types.any], (args, ctx) => `float(${ctx.emit(args[0])})`);
  pyLib.register('String', [Types.string], (args, ctx) => ctx.emit(args[0]));
  pyLib.register('String', [Types.int], (args, ctx) => `str(${ctx.emit(args[0])})`);
  pyLib.register('String', [Types.float], (args, ctx) => `str(${ctx.emit(args[0])})`);
  pyLib.register('String', [Types.any], (args, ctx) => {
    ctx.requireHelper?.('kString');
    return `kString(${ctx.emit(args[0])})`;
  });
  pyLib.register('Bool', [Types.any], (args, ctx) => {
    ctx.requireHelper?.('kBool');
    return `kBool(${ctx.emit(args[0])})`;
  });
  pyLib.register('Data', [Types.any], (args, ctx) => {
    ctx.requireHelper?.('kData');
    return `kData(${ctx.emit(args[0])})`;
  });
  pyLib.register('Date', [Types.date], (args, ctx) => ctx.emit(args[0]));
  pyLib.register('Date', [Types.any], (args, ctx) => {
    ctx.requireHelper?.('kParseDate');
    return `kParseDate(${ctx.emit(args[0])})`;
  });
  pyLib.register('Datetime', [Types.datetime], (args, ctx) => ctx.emit(args[0]));
  pyLib.register('Datetime', [Types.any], (args, ctx) => {
    ctx.requireHelper?.('kParseDatetime');
    return `kParseDatetime(${ctx.emit(args[0])})`;
  });
  pyLib.register('Duration', [Types.duration], (args, ctx) => ctx.emit(args[0]));
  pyLib.register('Duration', [Types.any], (args, ctx) => `EloDuration.from_iso(${ctx.emit(args[0])})`);

  // Interval - construct from object with start/end properties
  pyLib.register('Interval', [Types.interval], (args, ctx) => ctx.emit(args[0]));
  pyLib.register('Interval', [Types.object], (args, ctx) => {
    ctx.requireHelper?.('_EloInterval');
    const obj = args[0];
    if (obj.type === 'object_literal') {
      const startProp = obj.properties.find(p => p.key === 'start');
      const endProp = obj.properties.find(p => p.key === 'end');
      if (startProp && endProp) {
        return `EloInterval(${ctx.emit(startProp.value)}, ${ctx.emit(endProp.value)})`;
      }
    }
    const v = ctx.emit(args[0]);
    return `EloInterval(${v}["start"], ${v}["end"])`;
  });
  pyLib.register('Interval', [Types.any], (args, ctx) => {
    ctx.requireHelper?.('_EloInterval');
    const v = ctx.emit(args[0]);
    return `EloInterval(${v}["start"], ${v}["end"])`;
  });

  // Interval accessors
  pyLib.register('start', [Types.interval], (args, ctx) => `${ctx.emit(args[0])}.start`);
  pyLib.register('end', [Types.interval], (args, ctx) => `${ctx.emit(args[0])}.end`);

  // Interval arithmetic
  pyLib.register('union', [Types.interval, Types.interval], (args, ctx) => {
    ctx.requireHelper?.('_EloInterval');
    const a = ctx.emit(args[0]);
    const b = ctx.emit(args[1]);
    return `EloInterval(min(${a}.start, ${b}.start), max(${a}.end, ${b}.end))`;
  });
  pyLib.register('intersection', [Types.interval, Types.interval], (args, ctx) => {
    ctx.requireHelper?.('kIntersection');
    return `kIntersection(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });

  // Duration(Interval) - get the length of an interval
  pyLib.register('Duration', [Types.interval], (args, ctx) => {
    ctx.requireHelper?.('_elo_duration');
    const v = ctx.emit(args[0]);
    return `EloDuration.from_timedelta(${v}.end - ${v}.start)`;
  });

  // Temporal equality - use kEq for datetime/duration comparisons
  pyLib.register('eq', [Types.datetime, Types.datetime], (args, ctx) => {
    ctx.requireHelper?.('kEq');
    return `kEq(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  pyLib.register('neq', [Types.datetime, Types.datetime], (args, ctx) => {
    ctx.requireHelper?.('kEq');
    return `not kEq(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  pyLib.register('eq', [Types.duration, Types.duration], (args, ctx) => `(${ctx.emit(args[0])} == ${ctx.emit(args[1])})`);
  pyLib.register('neq', [Types.duration, Types.duration], (args, ctx) => `(${ctx.emit(args[0])} != ${ctx.emit(args[1])})`);

  // Temporal comparison
  for (const t of [Types.datetime, Types.duration]) {
    pyLib.register('lt', [t, t], simpleBinaryOp('<'));
    pyLib.register('gt', [t, t], simpleBinaryOp('>'));
    pyLib.register('lte', [t, t], simpleBinaryOp('<='));
    pyLib.register('gte', [t, t], simpleBinaryOp('>='));
  }

  // Fallback for dynamic-typed operations
  pyLib.registerFallback((name, args, argTypes, ctx) => {
    // Dynamic arithmetic
    if (name === 'add') { ctx.requireHelper?.('kAdd'); return `kAdd(${args.map(a => ctx.emit(a)).join(', ')})`; }
    if (name === 'sub') { ctx.requireHelper?.('kSub'); return `kSub(${args.map(a => ctx.emit(a)).join(', ')})`; }
    if (name === 'mul') { ctx.requireHelper?.('kMul'); return `kMul(${args.map(a => ctx.emit(a)).join(', ')})`; }
    if (name === 'div') { ctx.requireHelper?.('kDiv'); return `kDiv(${args.map(a => ctx.emit(a)).join(', ')})`; }
    if (name === 'mod') { ctx.requireHelper?.('kMod'); return `kMod(${args.map(a => ctx.emit(a)).join(', ')})`; }
    if (name === 'pow') { ctx.requireHelper?.('kPow'); return `kPow(${args.map(a => ctx.emit(a)).join(', ')})`; }
    if (name === 'neg') { ctx.requireHelper?.('kNeg'); return `kNeg(${ctx.emit(args[0])})`; }
    if (name === 'eq') { ctx.requireHelper?.('kEq'); return `kEq(${args.map(a => ctx.emit(a)).join(', ')})`; }
    if (name === 'neq') { ctx.requireHelper?.('kEq'); return `not kEq(${args.map(a => ctx.emit(a)).join(', ')})`; }
    if (name === 'lt') return `(${ctx.emit(args[0])} < ${ctx.emit(args[1])})`;
    if (name === 'gt') return `(${ctx.emit(args[0])} > ${ctx.emit(args[1])})`;
    if (name === 'lte') return `(${ctx.emit(args[0])} <= ${ctx.emit(args[1])})`;
    if (name === 'gte') return `(${ctx.emit(args[0])} >= ${ctx.emit(args[1])})`;
    if (name === 'and') return `(${ctx.emit(args[0])} and ${ctx.emit(args[1])})`;
    if (name === 'or') return `(${ctx.emit(args[0])} or ${ctx.emit(args[1])})`;
    if (name === 'not') { const e = ctx.emit(args[0]); return args[0].type === 'call' ? `not (${e})` : `not ${e}`; }
    throw new Error(`Unknown Python function: ${name}(${argTypes.map(t => t.kind).join(', ')})`);
  });

  return pyLib;
}
