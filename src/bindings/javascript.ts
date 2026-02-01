/**
 * JavaScript stdlib binding for Elo
 *
 * This module defines how Elo IR functions are emitted as JavaScript code.
 * Uses luxon for temporal operations.
 */

import { IRExpr } from '../ir';
import { Types } from '../types';
import { StdLib, simpleBinaryOp, nullary, fnCall, helperCall, FunctionEmitter } from '../stdlib';

/**
 * Helper for type selector using Finitio parser + pUnwrap.
 * Generates: pUnwrap(pParser(value, ''))
 * This throws on parse failure instead of returning null.
 */
function parserUnwrap(parserName: string): FunctionEmitter<string> {
  return (args, ctx) => {
    ctx.requireHelper?.(parserName);
    ctx.requireHelper?.('pUnwrap');
    const emittedArg = ctx.emit(args[0]);
    return `pUnwrap(${parserName}(${emittedArg}, ''))`;
  };
}

/**
 * Check if a call will be emitted as a native JS binary operator
 */
export function isNativeBinaryOp(ir: IRExpr): boolean {
  if (ir.type !== 'call') return false;
  const { fn, argTypes } = ir;

  // Arithmetic with numeric types
  if (['add', 'sub', 'mul', 'div', 'mod'].includes(fn)) {
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
 * Create the JavaScript standard library binding
 */
export function createJavaScriptBinding(): StdLib<string> {
  const jsLib = new StdLib<string>();

  // Temporal nullary functions
  jsLib.register('today', [], nullary("DateTime.now().startOf('day')"));
  jsLib.register('now', [], nullary('DateTime.now()'));
  jsLib.register('bot', [], nullary('DateTime.fromISO("0001-01-01T00:00:00.000Z")'));
  jsLib.register('eot', [], nullary('DateTime.fromISO("9999-12-31T23:59:59.999Z")'));

  // Period boundary functions
  const periodBoundaryMap: Record<string, string> = {
    'start_of_day': "startOf('day')",
    'end_of_day': "endOf('day')",
    'start_of_week': "startOf('week')",
    'end_of_week': "endOf('week')",
    'start_of_month': "startOf('month')",
    'end_of_month': "endOf('month')",
    'start_of_quarter': "startOf('quarter')",
    'end_of_quarter': "endOf('quarter')",
    'start_of_year': "startOf('year')",
    'end_of_year': "endOf('year')",
  };

  // camelCase aliases for use as stdlib functions on date/datetime values
  const camelCaseMap: Record<string, string> = {
    'startOfDay': "startOf('day')",
    'endOfDay': "endOf('day')",
    'startOfWeek': "startOf('week')",
    'endOfWeek': "endOf('week')",
    'startOfMonth': "startOf('month')",
    'endOfMonth': "endOf('month')",
    'startOfQuarter': "startOf('quarter')",
    'endOfQuarter': "endOf('quarter')",
    'startOfYear': "startOf('year')",
    'endOfYear': "endOf('year')",
  };

  for (const [fn, method] of Object.entries(periodBoundaryMap)) {
    jsLib.register(fn, [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.${method}`);
  }
  for (const [fn, method] of Object.entries(camelCaseMap)) {
    for (const t of [Types.date, Types.datetime]) {
      jsLib.register(fn, [t], (args, ctx) => `${ctx.emit(args[0])}.${method}`);
    }
  }

  // Numeric arithmetic - native JS operators only for known numeric types
  // Unknown types fall through to elo.* fallback
  for (const leftType of [Types.int, Types.float]) {
    for (const rightType of [Types.int, Types.float]) {
      jsLib.register('add', [leftType, rightType], simpleBinaryOp('+'));
      jsLib.register('sub', [leftType, rightType], simpleBinaryOp('-'));
      jsLib.register('mul', [leftType, rightType], simpleBinaryOp('*'));
      jsLib.register('div', [leftType, rightType], simpleBinaryOp('/'));
      jsLib.register('mod', [leftType, rightType], simpleBinaryOp('%'));
      jsLib.register('pow', [leftType, rightType], fnCall('Math.pow'));
    }
  }

  // String concatenation
  jsLib.register('add', [Types.string, Types.string], simpleBinaryOp('+'));

  // String multiplication (repeat)
  jsLib.register('mul', [Types.string, Types.int], (args, ctx) =>
    `${ctx.emit(args[0])}.repeat(${ctx.emit(args[1])})`);
  jsLib.register('mul', [Types.int, Types.string], (args, ctx) =>
    `${ctx.emit(args[1])}.repeat(${ctx.emit(args[0])})`);

  // List concatenation
  jsLib.register('add', [Types.array, Types.array], (args, ctx) =>
    `${ctx.emit(args[0])}.concat(${ctx.emit(args[1])})`);

  // Temporal addition
  jsLib.register('add', [Types.date, Types.duration], (args, ctx) =>
    `${ctx.emit(args[0])}.plus(${ctx.emit(args[1])})`);
  jsLib.register('add', [Types.datetime, Types.duration], (args, ctx) =>
    `${ctx.emit(args[0])}.plus(${ctx.emit(args[1])})`);
  jsLib.register('add', [Types.duration, Types.date], (args, ctx) =>
    `${ctx.emit(args[1])}.plus(${ctx.emit(args[0])})`);
  jsLib.register('add', [Types.duration, Types.datetime], (args, ctx) =>
    `${ctx.emit(args[1])}.plus(${ctx.emit(args[0])})`);
  jsLib.register('add', [Types.duration, Types.duration], (args, ctx) =>
    `${ctx.emit(args[0])}.plus(${ctx.emit(args[1])})`);

  // Temporal subtraction
  jsLib.register('sub', [Types.date, Types.duration], (args, ctx) =>
    `${ctx.emit(args[0])}.minus(${ctx.emit(args[1])})`);
  jsLib.register('sub', [Types.datetime, Types.duration], (args, ctx) =>
    `${ctx.emit(args[0])}.minus(${ctx.emit(args[1])})`);

  // Duration scaling: n * duration or duration * n
  jsLib.register('mul', [Types.int, Types.duration], (args, ctx) =>
    `Duration.fromMillis(${ctx.emit(args[1])}.toMillis() * ${ctx.emit(args[0])})`);
  jsLib.register('mul', [Types.float, Types.duration], (args, ctx) =>
    `Duration.fromMillis(${ctx.emit(args[1])}.toMillis() * ${ctx.emit(args[0])})`);
  jsLib.register('mul', [Types.duration, Types.int], (args, ctx) =>
    `Duration.fromMillis(${ctx.emit(args[0])}.toMillis() * ${ctx.emit(args[1])})`);
  jsLib.register('mul', [Types.duration, Types.float], (args, ctx) =>
    `Duration.fromMillis(${ctx.emit(args[0])}.toMillis() * ${ctx.emit(args[1])})`);

  // Duration division
  jsLib.register('div', [Types.duration, Types.int], (args, ctx) =>
    `Duration.fromMillis(${ctx.emit(args[0])}.toMillis() / ${ctx.emit(args[1])})`);
  jsLib.register('div', [Types.duration, Types.float], (args, ctx) =>
    `Duration.fromMillis(${ctx.emit(args[0])}.toMillis() / ${ctx.emit(args[1])})`);

  // Comparison operators - type generalization handles most combinations
  // Date/datetime equality needs special toMillis comparison
  const temporalTypes = [Types.date, Types.datetime];
  for (const leftType of temporalTypes) {
    for (const rightType of temporalTypes) {
      jsLib.register('eq', [leftType, rightType], (args, ctx) =>
        `${ctx.emit(args[0])}.toMillis() === ${ctx.emit(args[1])}.toMillis()`);
      jsLib.register('neq', [leftType, rightType], (args, ctx) =>
        `${ctx.emit(args[0])}.toMillis() !== ${ctx.emit(args[1])}.toMillis()`);
    }
  }

  // Duration equality needs milliseconds comparison
  jsLib.register('eq', [Types.duration, Types.duration], (args, ctx) =>
    `${ctx.emit(args[0])}.toMillis() === ${ctx.emit(args[1])}.toMillis()`);
  jsLib.register('neq', [Types.duration, Types.duration], (args, ctx) =>
    `${ctx.emit(args[0])}.toMillis() !== ${ctx.emit(args[1])}.toMillis()`);

  // Numeric/boolean/string equality uses native operators
  const primitiveTypes = [Types.int, Types.float, Types.bool, Types.string];
  for (const leftType of primitiveTypes) {
    for (const rightType of primitiveTypes) {
      jsLib.register('eq', [leftType, rightType], simpleBinaryOp('=='));
      jsLib.register('neq', [leftType, rightType], simpleBinaryOp('!='));
    }
  }

  // All other comparisons use native JS operators
  jsLib.register('lt', [Types.any, Types.any], simpleBinaryOp('<'));
  jsLib.register('gt', [Types.any, Types.any], simpleBinaryOp('>'));
  jsLib.register('lte', [Types.any, Types.any], simpleBinaryOp('<='));
  jsLib.register('gte', [Types.any, Types.any], simpleBinaryOp('>='));
  // Fallback for unknown types - needs helper for duration/date comparison
  jsLib.register('eq', [Types.any, Types.any], helperCall('kEq'));
  jsLib.register('neq', [Types.any, Types.any], helperCall('kNeq'));

  // Logical operators
  jsLib.register('and', [Types.any, Types.any], simpleBinaryOp('&&'));
  jsLib.register('or', [Types.any, Types.any], simpleBinaryOp('||'));

  // Unary operators - only for known types, unknown falls through to elo.* fallback
  for (const t of [Types.int, Types.float]) {
    jsLib.register('neg', [t], (args, ctx) => {
      const operand = ctx.emit(args[0]);
      if (isNativeBinaryOp(args[0])) return `-(${operand})`;
      return `-${operand}`;
    });
    jsLib.register('pos', [t], (args, ctx) => {
      const operand = ctx.emit(args[0]);
      if (isNativeBinaryOp(args[0])) return `+(${operand})`;
      return `+${operand}`;
    });
  }

  jsLib.register('not', [Types.bool], (args, ctx) => {
    const operand = ctx.emit(args[0]);
    if (isNativeBinaryOp(args[0])) return `!(${operand})`;
    return `!${operand}`;
  });

  // Assert function - accept both bool and any (for dynamic expressions)
  for (const conditionType of [Types.bool, Types.any]) {
    jsLib.register('assert', [conditionType], (args, ctx) => {
      const condition = ctx.emit(args[0]);
      return `(function() { if (!(${condition})) throw new Error("Assertion failed"); return true; })()`;
    });
    jsLib.register('assert', [conditionType, Types.string], (args, ctx) => {
      const condition = ctx.emit(args[0]);
      const message = ctx.emit(args[1]);
      return `(function() { if (!(${condition})) throw new Error(${message}); return true; })()`;
    });
  }

  // AssertFails - expects a function to throw when called
  jsLib.register('assertFails', [Types.fn], (args, ctx) => {
    const fn = ctx.emit(args[0]);
    return `(function() { try { (${fn})(); throw new Error("Expected error but none thrown"); } catch(e) { if (e.message === "Expected error but none thrown") throw e; return true; } })()`;
  });

  // Array functions
  jsLib.register('length', [Types.array], (args, ctx) => `${ctx.emit(args[0])}.length`);
  jsLib.register('count', [Types.array], (args, ctx) => `${ctx.emit(args[0])}.length`);
  jsLib.register('at', [Types.array, Types.int], (args, ctx) =>
    `${ctx.emit(args[0])}[${ctx.emit(args[1])}] ?? null`);
  jsLib.register('first', [Types.array], (args, ctx) =>
    `${ctx.emit(args[0])}[0] ?? null`);
  jsLib.register('last', [Types.array], (args, ctx) =>
    `(a => a[a.length - 1] ?? null)(${ctx.emit(args[0])})`);
  jsLib.register('isEmpty', [Types.array], (args, ctx) =>
    `(${ctx.emit(args[0])}.length === 0)`);
  jsLib.register('min', [Types.array], (args, ctx) =>
    `(a => a.length === 0 ? null : Math.min(...a))(${ctx.emit(args[0])})`);
  jsLib.register('max', [Types.array], (args, ctx) =>
    `(a => a.length === 0 ? null : Math.max(...a))(${ctx.emit(args[0])})`);
  jsLib.register('sum', [Types.array], (args, ctx) =>
    `${ctx.emit(args[0])}.reduce((a, b) => a + b, 0)`);
  jsLib.register('avg', [Types.array], (args, ctx) =>
    `(a => a.length === 0 ? null : a.reduce((x, y) => x + y, 0) / a.length)(${ctx.emit(args[0])})`);
  jsLib.register('sum', [Types.array, Types.any], (args, ctx) => {
    ctx.requireHelper?.('kAdd');
    return `${ctx.emit(args[0])}.reduce(kAdd, ${ctx.emit(args[1])})`;
  });


  // Array iteration functions (register for both array and any to support dynamic types)
  for (const t of [Types.array, Types.any]) {
    jsLib.register('map', [t, Types.fn], (args, ctx) =>
      `${ctx.emit(args[0])}.map(${ctx.emit(args[1])})`);
    jsLib.register('filter', [t, Types.fn], (args, ctx) =>
      `${ctx.emit(args[0])}.filter(${ctx.emit(args[1])})`);
    jsLib.register('reduce', [t, Types.any, Types.fn], (args, ctx) =>
      `${ctx.emit(args[0])}.reduce(${ctx.emit(args[2])}, ${ctx.emit(args[1])})`);
    jsLib.register('any', [t, Types.fn], (args, ctx) =>
      `${ctx.emit(args[0])}.some(${ctx.emit(args[1])})`);
    jsLib.register('all', [t, Types.fn], (args, ctx) =>
      `${ctx.emit(args[0])}.every(${ctx.emit(args[1])})`);
  }

  // String functions (register for both string and any to support lambdas with unknown types)
  // Helper to wrap binary expressions in parentheses for method calls
  const methodCall = (method: string) => (args: IRExpr[], ctx: { emit: (e: IRExpr) => string }) => {
    const operand = ctx.emit(args[0]);
    if (isNativeBinaryOp(args[0])) return `(${operand})${method}`;
    return `${operand}${method}`;
  };

  for (const t of [Types.string, Types.any]) {
    jsLib.register('length', [t], methodCall('.length'));
    jsLib.register('upper', [t], methodCall('.toUpperCase()'));
    jsLib.register('lower', [t], methodCall('.toLowerCase()'));
    jsLib.register('trim', [t], methodCall('.trim()'));
  }
  // Helper for method calls with arguments - wraps receiver in parens if needed
  const wrapReceiver = (args: IRExpr[], ctx: { emit: (e: IRExpr) => string }) => {
    const operand = ctx.emit(args[0]);
    return isNativeBinaryOp(args[0]) ? `(${operand})` : operand;
  };

  // String functions with two args (register for string and any)
  for (const t of [Types.string, Types.any]) {
    jsLib.register('startsWith', [t, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.startsWith(${ctx.emit(args[1])})`);
    jsLib.register('endsWith', [t, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.endsWith(${ctx.emit(args[1])})`);
    jsLib.register('contains', [t, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.includes(${ctx.emit(args[1])})`);
    jsLib.register('concat', [t, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.concat(${ctx.emit(args[1])})`);
    jsLib.register('indexOf', [t, Types.string], (args, ctx) =>
      `(i => i === -1 ? null : i)(${wrapReceiver(args, ctx)}.indexOf(${ctx.emit(args[1])}))`);
    jsLib.register('isEmpty', [t], (args, ctx) =>
      `(${wrapReceiver(args, ctx)}.length === 0)`);
  }

  // String functions with three args
  for (const t of [Types.string, Types.any]) {
    jsLib.register('substring', [t, Types.int, Types.int], (args, ctx) => {
      const s = wrapReceiver(args, ctx);
      const start = ctx.emit(args[1]);
      const len = ctx.emit(args[2]);
      return `${s}.substring(${start}, ${start} + ${len})`;
    });
    jsLib.register('replace', [t, Types.string, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.replace(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
    jsLib.register('replaceAll', [t, Types.string, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.replaceAll(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
    jsLib.register('padStart', [t, Types.int, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.padStart(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
    jsLib.register('padEnd', [t, Types.int, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.padEnd(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
  }

  // Numeric functions
  // For int, round/floor/ceil are identity operations (optimization)
  // For float and any, use Math.x (which also works correctly for ints)
  jsLib.register('abs', [Types.int], fnCall('Math.abs'));
  jsLib.register('abs', [Types.float], fnCall('Math.abs'));
  jsLib.register('round', [Types.int], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('round', [Types.float], fnCall('Math.round'));
  jsLib.register('round', [Types.any], fnCall('Math.round')); // Safe for any numeric type
  jsLib.register('floor', [Types.int], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('floor', [Types.float], fnCall('Math.floor'));
  jsLib.register('floor', [Types.any], fnCall('Math.floor')); // Safe for any numeric type
  jsLib.register('ceil', [Types.int], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('ceil', [Types.float], fnCall('Math.ceil'));
  jsLib.register('ceil', [Types.any], fnCall('Math.ceil')); // Safe for any numeric type

  // Duration unit conversion functions
  // Approximate units use standard conversions: 1y=365.25d, 1m=30.4375d, 1q=91.3125d
  jsLib.register('inYears', [Types.duration], (args, ctx) =>
    `(${ctx.emit(args[0])}.toMillis() / 31557600000)`);
  jsLib.register('inQuarters', [Types.duration], (args, ctx) =>
    `(${ctx.emit(args[0])}.toMillis() / 7889400000)`);
  jsLib.register('inMonths', [Types.duration], (args, ctx) =>
    `(${ctx.emit(args[0])}.toMillis() / 2629800000)`);
  jsLib.register('inWeeks', [Types.duration], (args, ctx) =>
    `(${ctx.emit(args[0])}.toMillis() / 604800000)`);
  jsLib.register('inDays', [Types.duration], (args, ctx) =>
    `(${ctx.emit(args[0])}.toMillis() / 86400000)`);
  jsLib.register('inHours', [Types.duration], (args, ctx) =>
    `(${ctx.emit(args[0])}.toMillis() / 3600000)`);
  jsLib.register('inMinutes', [Types.duration], (args, ctx) =>
    `(${ctx.emit(args[0])}.toMillis() / 60000)`);
  jsLib.register('inSeconds', [Types.duration], (args, ctx) =>
    `(${ctx.emit(args[0])}.toMillis() / 1000)`);

  // Temporal extraction functions
  jsLib.register('year', [Types.date], (args, ctx) => `${ctx.emit(args[0])}.year`);
  jsLib.register('year', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.year`);
  jsLib.register('month', [Types.date], (args, ctx) => `${ctx.emit(args[0])}.month`);
  jsLib.register('month', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.month`);
  jsLib.register('day', [Types.date], (args, ctx) => `${ctx.emit(args[0])}.day`);
  jsLib.register('day', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.day`);
  jsLib.register('hour', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.toUTC().hour`);
  jsLib.register('minute', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.toUTC().minute`);

  // Runtime helpers for unknown types (dynamic dispatch)
  // These use kAdd, kSub, etc. helper functions that handle temporal/numeric operations at runtime
  jsLib.register('add', [Types.any, Types.any], helperCall('kAdd'));
  jsLib.register('sub', [Types.any, Types.any], helperCall('kSub'));
  jsLib.register('mul', [Types.any, Types.any], helperCall('kMul'));
  jsLib.register('div', [Types.any, Types.any], helperCall('kDiv'));
  jsLib.register('mod', [Types.any, Types.any], helperCall('kMod'));
  jsLib.register('pow', [Types.any, Types.any], helperCall('kPow'));

  // Unary operators for unknown types
  jsLib.register('neg', [Types.any], (args, ctx) => {
    ctx.requireHelper?.('kNeg');
    return `kNeg(${ctx.emit(args[0])})`;
  });
  jsLib.register('pos', [Types.any], (args, ctx) => {
    ctx.requireHelper?.('kPos');
    return `kPos(${ctx.emit(args[0])})`;
  });
  jsLib.register('not', [Types.any], (args, ctx) => {
    const operand = ctx.emit(args[0]);
    if (isNativeBinaryOp(args[0])) return `!(${operand})`;
    return `!${operand}`;
  });

  // Type introspection
  jsLib.register('typeOf', [Types.any], helperCall('kTypeOf'));

  // Null handling
  jsLib.register('isNull', [Types.any], helperCall('kIsNull'));

  // Data path navigation
  jsLib.register('fetch', [Types.any, Types.fn], helperCall('kFetch'));
  jsLib.register('fetch', [Types.any, Types.object], helperCall('kFetchObject'));
  jsLib.register('fetch', [Types.any, Types.array], helperCall('kFetchArray'));
  jsLib.register('patch', [Types.any, Types.fn, Types.any], helperCall('kPatch'));

  // Data merge functions
  jsLib.register('merge', [Types.any, Types.any], helperCall('kMerge'));
  jsLib.register('deepMerge', [Types.any, Types.any], helperCall('kDeepMerge'));

  // Error handling
  jsLib.register('fail', [Types.string], (args, ctx) => {
    const message = ctx.emit(args[0]);
    return `(function() { throw new Error(${message}); })()`;
  });

  // Type selectors (Finitio schemas - throw on failure)
  // Int - identity for int, truncate float, parse for string
  jsLib.register('Int', [Types.int], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('Int', [Types.float], (args, ctx) => `Math.trunc(${ctx.emit(args[0])})`);
  jsLib.register('Int', [Types.string], parserUnwrap('pInt'));
  jsLib.register('Int', [Types.any], parserUnwrap('pInt'));

  // Float - identity for float/int, parse for string
  jsLib.register('Float', [Types.float], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('Float', [Types.int], (args, ctx) => ctx.emit(args[0])); // JS numbers are already floats
  jsLib.register('Float', [Types.string], parserUnwrap('pFloat'));
  jsLib.register('Float', [Types.any], parserUnwrap('pFloat'));

  // Bool - identity for bool, parse "true"/"false" for string
  jsLib.register('Bool', [Types.bool], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('Bool', [Types.string], parserUnwrap('pBool'));
  jsLib.register('Bool', [Types.any], parserUnwrap('pBool'));

  // Date - identity for date, parse ISO for string
  jsLib.register('Date', [Types.date], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('Date', [Types.string], parserUnwrap('pDate'));
  jsLib.register('Date', [Types.any], parserUnwrap('pDate'));

  // Datetime - identity for datetime, parse ISO for string
  jsLib.register('Datetime', [Types.datetime], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('Datetime', [Types.string], parserUnwrap('pDatetime'));
  jsLib.register('Datetime', [Types.any], parserUnwrap('pDatetime'));

  // Duration - identity for duration, parse ISO for string
  jsLib.register('Duration', [Types.duration], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('Duration', [Types.string], parserUnwrap('pDuration'));
  jsLib.register('Duration', [Types.any], parserUnwrap('pDuration'));

  // Interval - construct from object with start/end properties
  jsLib.register('Interval', [Types.interval], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('Interval', [Types.object], (args, ctx) => {
    const obj = args[0];
    if (obj.type === 'object_literal') {
      const startProp = obj.properties.find(p => p.key === 'start');
      const endProp = obj.properties.find(p => p.key === 'end');
      if (startProp && endProp) {
        return `Interval.fromDateTimes(${ctx.emit(startProp.value)}, ${ctx.emit(endProp.value)})`;
      }
    }
    const v = ctx.emit(args[0]);
    return `Interval.fromDateTimes(${v}.start, ${v}.end)`;
  });
  jsLib.register('Interval', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `Interval.fromDateTimes(${v}.start, ${v}.end)`;
  });

  // Interval accessors
  jsLib.register('start', [Types.interval], (args, ctx) => `${ctx.emit(args[0])}.start`);
  jsLib.register('end', [Types.interval], (args, ctx) => `${ctx.emit(args[0])}.end`);

  // Data - identity for non-strings, parse JSON for strings
  jsLib.register('Data', [Types.array], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('Data', [Types.object], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('Data', [Types.string], parserUnwrap('pData'));
  jsLib.register('Data', [Types.any], parserUnwrap('pData'));

  // String - convert any value to string (Elo literal format for complex types)
  jsLib.register('String', [Types.string], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('String', [Types.int], (args, ctx) => `String(${ctx.emit(args[0])})`);
  jsLib.register('String', [Types.float], (args, ctx) => `String(${ctx.emit(args[0])})`);
  jsLib.register('String', [Types.bool], (args, ctx) => `String(${ctx.emit(args[0])})`);
  jsLib.register('String', [Types.null], (args, ctx) => `String(${ctx.emit(args[0])})`);
  jsLib.register('String', [Types.array], helperCall('kString'));
  jsLib.register('String', [Types.object], helperCall('kString'));
  jsLib.register('String', [Types.any], helperCall('kString'));

  // List manipulation functions
  jsLib.register('reverse', [Types.array], (args, ctx) =>
    `[...${ctx.emit(args[0])}].reverse()`);

  // Join list elements with separator
  for (const t of [Types.array, Types.any]) {
    jsLib.register('join', [t, Types.string], (args, ctx) =>
      `${ctx.emit(args[0])}.join(${ctx.emit(args[1])})`);
  }

  // Split string into list
  // Note: We use a wrapper to normalize empty string behavior across targets
  // JavaScript returns [''] for ''.split(','), but Ruby/SQL return []
  for (const t of [Types.string, Types.any]) {
    jsLib.register('split', [t, Types.string], (args, ctx) => {
      const str = wrapReceiver(args, ctx);
      const sep = ctx.emit(args[1]);
      return `(${str} === '' ? [] : ${str}.split(${sep}))`;
    });
  }

  // No fallback - unknown functions should fail at compile time
  // (StdLib.emit() will throw if no implementation is found)

  return jsLib;
}
