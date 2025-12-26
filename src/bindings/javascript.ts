/**
 * JavaScript stdlib binding for Klang
 *
 * This module defines how Klang IR functions are emitted as JavaScript code.
 * Uses dayjs for temporal operations.
 */

import { IRExpr } from '../ir';
import { Types } from '../types';
import { StdLib, simpleBinaryOp, nullary, fnCall, helperCall } from '../stdlib';

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
  jsLib.register('today', [], nullary("dayjs().startOf('day')"));
  jsLib.register('now', [], nullary('dayjs()'));

  // Period boundary functions
  const periodBoundaryMap: Record<string, string> = {
    'start_of_day': "startOf('day')",
    'end_of_day': "endOf('day')",
    'start_of_week': "startOf('isoWeek')",
    'end_of_week': "endOf('isoWeek')",
    'start_of_month': "startOf('month')",
    'end_of_month': "endOf('month')",
    'start_of_quarter': "startOf('quarter')",
    'end_of_quarter': "endOf('quarter')",
    'start_of_year': "startOf('year')",
    'end_of_year': "endOf('year')",
  };

  for (const [fn, method] of Object.entries(periodBoundaryMap)) {
    jsLib.register(fn, [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.${method}`);
  }

  // Numeric arithmetic - native JS operators only for known numeric types
  // Unknown types fall through to klang.* fallback
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

  // Temporal addition
  jsLib.register('add', [Types.date, Types.duration], (args, ctx) =>
    `${ctx.emit(args[0])}.add(${ctx.emit(args[1])})`);
  jsLib.register('add', [Types.datetime, Types.duration], (args, ctx) =>
    `${ctx.emit(args[0])}.add(${ctx.emit(args[1])})`);
  jsLib.register('add', [Types.duration, Types.date], (args, ctx) =>
    `${ctx.emit(args[1])}.add(${ctx.emit(args[0])})`);
  jsLib.register('add', [Types.duration, Types.datetime], (args, ctx) =>
    `${ctx.emit(args[1])}.add(${ctx.emit(args[0])})`);
  jsLib.register('add', [Types.duration, Types.duration], (args, ctx) =>
    `${ctx.emit(args[0])}.add(${ctx.emit(args[1])})`);

  // Temporal subtraction
  jsLib.register('sub', [Types.date, Types.duration], (args, ctx) =>
    `${ctx.emit(args[0])}.subtract(${ctx.emit(args[1])})`);
  jsLib.register('sub', [Types.datetime, Types.duration], (args, ctx) =>
    `${ctx.emit(args[0])}.subtract(${ctx.emit(args[1])})`);

  // Duration scaling: n * duration or duration * n
  jsLib.register('mul', [Types.int, Types.duration], (args, ctx) =>
    `dayjs.duration(${ctx.emit(args[1])}.asMilliseconds() * ${ctx.emit(args[0])})`);
  jsLib.register('mul', [Types.float, Types.duration], (args, ctx) =>
    `dayjs.duration(${ctx.emit(args[1])}.asMilliseconds() * ${ctx.emit(args[0])})`);
  jsLib.register('mul', [Types.duration, Types.int], (args, ctx) =>
    `dayjs.duration(${ctx.emit(args[0])}.asMilliseconds() * ${ctx.emit(args[1])})`);
  jsLib.register('mul', [Types.duration, Types.float], (args, ctx) =>
    `dayjs.duration(${ctx.emit(args[0])}.asMilliseconds() * ${ctx.emit(args[1])})`);

  // Duration division
  jsLib.register('div', [Types.duration, Types.int], (args, ctx) =>
    `dayjs.duration(${ctx.emit(args[0])}.asMilliseconds() / ${ctx.emit(args[1])})`);
  jsLib.register('div', [Types.duration, Types.float], (args, ctx) =>
    `dayjs.duration(${ctx.emit(args[0])}.asMilliseconds() / ${ctx.emit(args[1])})`);

  // Comparison operators - type generalization handles most combinations
  // Date/datetime equality needs special valueOf comparison (using +)
  const temporalTypes = [Types.date, Types.datetime];
  for (const leftType of temporalTypes) {
    for (const rightType of temporalTypes) {
      jsLib.register('eq', [leftType, rightType], (args, ctx) =>
        `+${ctx.emit(args[0])} === +${ctx.emit(args[1])}`);
      jsLib.register('neq', [leftType, rightType], (args, ctx) =>
        `+${ctx.emit(args[0])} !== +${ctx.emit(args[1])}`);
    }
  }

  // Duration equality needs milliseconds comparison
  jsLib.register('eq', [Types.duration, Types.duration], (args, ctx) =>
    `${ctx.emit(args[0])}.asMilliseconds() === ${ctx.emit(args[1])}.asMilliseconds()`);
  jsLib.register('neq', [Types.duration, Types.duration], (args, ctx) =>
    `${ctx.emit(args[0])}.asMilliseconds() !== ${ctx.emit(args[1])}.asMilliseconds()`);

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

  // Unary operators - only for known types, unknown falls through to klang.* fallback
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

  // String functions
  jsLib.register('length', [Types.string], (args, ctx) => `${ctx.emit(args[0])}.length`);
  jsLib.register('upper', [Types.string], (args, ctx) => `${ctx.emit(args[0])}.toUpperCase()`);
  jsLib.register('lower', [Types.string], (args, ctx) => `${ctx.emit(args[0])}.toLowerCase()`);
  jsLib.register('trim', [Types.string], (args, ctx) => `${ctx.emit(args[0])}.trim()`);
  jsLib.register('startsWith', [Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.startsWith(${ctx.emit(args[1])})`);
  jsLib.register('endsWith', [Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.endsWith(${ctx.emit(args[1])})`);
  jsLib.register('contains', [Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.includes(${ctx.emit(args[1])})`);
  jsLib.register('substring', [Types.string, Types.int, Types.int], (args, ctx) => {
    const s = ctx.emit(args[0]);
    const start = ctx.emit(args[1]);
    const len = ctx.emit(args[2]);
    return `${s}.substring(${start}, ${start} + ${len})`;
  });
  jsLib.register('concat', [Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.concat(${ctx.emit(args[1])})`);
  // indexOf returns null when not found (not -1)
  jsLib.register('indexOf', [Types.string, Types.string], (args, ctx) =>
    `(i => i === -1 ? null : i)(${ctx.emit(args[0])}.indexOf(${ctx.emit(args[1])}))`);

  jsLib.register('replace', [Types.string, Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.replace(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
  jsLib.register('replaceAll', [Types.string, Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.replaceAll(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
  jsLib.register('isEmpty', [Types.string], (args, ctx) =>
    `(${ctx.emit(args[0])}.length === 0)`);
  jsLib.register('padStart', [Types.string, Types.int, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.padStart(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
  jsLib.register('padEnd', [Types.string, Types.int, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.padEnd(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);

  // Numeric functions
  jsLib.register('abs', [Types.int], fnCall('Math.abs'));
  jsLib.register('abs', [Types.float], fnCall('Math.abs'));
  jsLib.register('round', [Types.int], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('round', [Types.float], fnCall('Math.round'));
  jsLib.register('floor', [Types.int], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('floor', [Types.float], fnCall('Math.floor'));
  jsLib.register('ceil', [Types.int], (args, ctx) => ctx.emit(args[0]));
  jsLib.register('ceil', [Types.float], fnCall('Math.ceil'));

  // Temporal extraction functions
  jsLib.register('year', [Types.date], (args, ctx) => `${ctx.emit(args[0])}.year()`);
  jsLib.register('year', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.year()`);
  jsLib.register('month', [Types.date], (args, ctx) => `(${ctx.emit(args[0])}.month() + 1)`);
  jsLib.register('month', [Types.datetime], (args, ctx) => `(${ctx.emit(args[0])}.month() + 1)`);
  jsLib.register('day', [Types.date], (args, ctx) => `${ctx.emit(args[0])}.date()`);
  jsLib.register('day', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.date()`);
  jsLib.register('hour', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.utc().hour()`);
  jsLib.register('minute', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.utc().minute()`);

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
  jsLib.register('isVal', [Types.any], helperCall('kIsVal'));
  jsLib.register('orVal', [Types.any, Types.any], helperCall('kOrVal'));

  // Fallback for truly unknown functions
  jsLib.registerFallback((name, args, _argTypes, ctx) => {
    const emittedArgs = args.map(a => ctx.emit(a)).join(', ');
    return `${name}(${emittedArgs})`;
  });

  return jsLib;
}
