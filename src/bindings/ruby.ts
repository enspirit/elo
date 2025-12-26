/**
 * Ruby stdlib binding for Elo
 *
 * This module defines how Elo IR functions are emitted as Ruby code.
 */

import { IRExpr } from '../ir';
import { Types } from '../types';
import { StdLib, EmitContext, simpleBinaryOp, nullary, rubyMethod } from '../stdlib';

/**
 * Check if a call will be emitted as a native Ruby binary operator
 */
export function isNativeBinaryOp(ir: IRExpr, opMap: Record<string, string>): boolean {
  if (ir.type !== 'call') return false;
  return opMap[ir.fn] !== undefined && ir.argTypes.length === 2;
}

/**
 * Create the Ruby standard library binding
 */
export function createRubyBinding(): StdLib<string> {
  const rubyLib = new StdLib<string>();

  // Temporal nullary functions
  rubyLib.register('today', [], nullary('Date.today'));
  rubyLib.register('now', [], nullary('DateTime.now'));

  // Period boundary functions
  const periodBoundaryMap: Record<string, string> = {
    'start_of_day': 'beginning_of_day',
    'end_of_day': 'end_of_day',
    'start_of_week': 'beginning_of_week',
    'end_of_week': 'end_of_week',
    'start_of_month': 'beginning_of_month',
    'end_of_month': 'end_of_month',
    'start_of_quarter': 'beginning_of_quarter',
    'end_of_quarter': 'end_of_quarter',
    'start_of_year': 'beginning_of_year',
    'end_of_year': 'end_of_year',
  };

  for (const [fn, method] of Object.entries(periodBoundaryMap)) {
    rubyLib.register(fn, [Types.datetime], (args, ctx) => {
      const arg = args[0];
      // For period boundaries, emit Date.today.method (not DateTime.now.method)
      if (arg.type === 'call' && arg.fn === 'now') {
        return `Date.today.${method}`;
      }
      return `${ctx.emit(arg)}.${method}`;
    });
  }

  // Ruby uses native operators for all types due to operator overloading
  // Using any,any registration - type generalization handles all concrete type combinations
  rubyLib.register('add', [Types.any, Types.any], simpleBinaryOp('+'));
  rubyLib.register('sub', [Types.any, Types.any], simpleBinaryOp('-'));
  rubyLib.register('mul', [Types.any, Types.any], simpleBinaryOp('*'));
  rubyLib.register('div', [Types.any, Types.any], simpleBinaryOp('/'));
  rubyLib.register('mod', [Types.any, Types.any], simpleBinaryOp('%'));
  rubyLib.register('pow', [Types.any, Types.any], simpleBinaryOp('**'));

  // Temporal arithmetic - Ruby's operator overloading handles this
  // Special case: today() + duration('P1D') -> Date.today + 1 (for TOMORROW)
  rubyLib.register('add', [Types.date, Types.duration], (args, ctx) => {
    const leftArg = args[0];
    const rightArg = args[1];
    if (leftArg.type === 'call' && leftArg.fn === 'today' &&
        rightArg.type === 'duration_literal' && rightArg.value === 'P1D') {
      return `${ctx.emit(leftArg)} + 1`;
    }
    const left = ctx.emitWithParens(args[0], '+', 'left');
    const right = ctx.emitWithParens(args[1], '+', 'right');
    return `${left} + ${right}`;
  });

  // Other temporal additions (datetime+duration, duration+*, duration+duration)
  // are covered by the any,any registration since they use the same operator

  // Special case: today() - duration('P1D') -> Date.today - 1 (for YESTERDAY)
  rubyLib.register('sub', [Types.date, Types.duration], (args, ctx) => {
    const leftArg = args[0];
    const rightArg = args[1];
    if (leftArg.type === 'call' && leftArg.fn === 'today' &&
        rightArg.type === 'duration_literal' && rightArg.value === 'P1D') {
      return `${ctx.emit(leftArg)} - 1`;
    }
    const left = ctx.emitWithParens(args[0], '-', 'left');
    const right = ctx.emitWithParens(args[1], '-', 'right');
    return `${left} - ${right}`;
  });

  // datetime - duration uses the same operator, covered by any,any registration

  // Duration + Date/DateTime needs operand swap (Ruby doesn't support Duration + Date)
  rubyLib.register('add', [Types.duration, Types.date], (args, ctx) => {
    const left = ctx.emitWithParens(args[1], '+', 'left');
    const right = ctx.emitWithParens(args[0], '+', 'right');
    return `${left} + ${right}`;
  });
  rubyLib.register('add', [Types.duration, Types.datetime], (args, ctx) => {
    const left = ctx.emitWithParens(args[1], '+', 'left');
    const right = ctx.emitWithParens(args[0], '+', 'right');
    return `${left} + ${right}`;
  });

  // Comparison operators - Ruby's operator overloading handles all types
  // Type generalization will match any concrete type combination
  rubyLib.register('lt', [Types.any, Types.any], simpleBinaryOp('<'));
  rubyLib.register('gt', [Types.any, Types.any], simpleBinaryOp('>'));
  rubyLib.register('lte', [Types.any, Types.any], simpleBinaryOp('<='));
  rubyLib.register('gte', [Types.any, Types.any], simpleBinaryOp('>='));
  rubyLib.register('eq', [Types.any, Types.any], simpleBinaryOp('=='));
  rubyLib.register('neq', [Types.any, Types.any], simpleBinaryOp('!='));

  // Logical operators
  rubyLib.register('and', [Types.any, Types.any], simpleBinaryOp('&&'));
  rubyLib.register('or', [Types.any, Types.any], simpleBinaryOp('||'));

  // Unary operators - type generalization handles int, float, and any
  rubyLib.register('neg', [Types.any], (args, ctx) => {
    const operand = ctx.emit(args[0]);
    const OP_MAP: Record<string, string> = {
      'add': '+', 'sub': '-', 'mul': '*', 'div': '/', 'mod': '%', 'pow': '**',
      'lt': '<', 'gt': '>', 'lte': '<=', 'gte': '>=',
      'eq': '==', 'neq': '!=', 'and': '&&', 'or': '||',
    };
    if (isNativeBinaryOp(args[0], OP_MAP)) return `-(${operand})`;
    return `-${operand}`;
  });
  rubyLib.register('pos', [Types.any], (args, ctx) => {
    const operand = ctx.emit(args[0]);
    const OP_MAP: Record<string, string> = {
      'add': '+', 'sub': '-', 'mul': '*', 'div': '/', 'mod': '%', 'pow': '**',
      'lt': '<', 'gt': '>', 'lte': '<=', 'gte': '>=',
      'eq': '==', 'neq': '!=', 'and': '&&', 'or': '||',
    };
    if (isNativeBinaryOp(args[0], OP_MAP)) return `+(${operand})`;
    return `+${operand}`;
  });
  rubyLib.register('not', [Types.any], (args, ctx) => {
    const operand = ctx.emit(args[0]);
    const OP_MAP: Record<string, string> = {
      'add': '+', 'sub': '-', 'mul': '*', 'div': '/', 'mod': '%', 'pow': '**',
      'lt': '<', 'gt': '>', 'lte': '<=', 'gte': '>=',
      'eq': '==', 'neq': '!=', 'and': '&&', 'or': '||',
    };
    if (isNativeBinaryOp(args[0], OP_MAP)) return `!(${operand})`;
    return `!${operand}`;
  });

  // Assert function - type generalization handles bool and any
  rubyLib.register('assert', [Types.any], (args, ctx) => {
    const condition = ctx.emit(args[0]);
    return `(raise "Assertion failed" unless ${condition}; true)`;
  });
  rubyLib.register('assert', [Types.any, Types.string], (args, ctx) => {
    const condition = ctx.emit(args[0]);
    const message = ctx.emit(args[1]);
    return `(raise ${message} unless ${condition}; true)`;
  });

  // String functions
  rubyLib.register('length', [Types.string], (args, ctx) => `${ctx.emit(args[0])}.length`);
  rubyLib.register('upper', [Types.string], (args, ctx) => `${ctx.emit(args[0])}.upcase`);
  rubyLib.register('lower', [Types.string], (args, ctx) => `${ctx.emit(args[0])}.downcase`);
  rubyLib.register('trim', [Types.string], (args, ctx) => `${ctx.emit(args[0])}.strip`);
  rubyLib.register('startsWith', [Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.start_with?(${ctx.emit(args[1])})`);
  rubyLib.register('endsWith', [Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.end_with?(${ctx.emit(args[1])})`);
  rubyLib.register('contains', [Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.include?(${ctx.emit(args[1])})`);
  rubyLib.register('substring', [Types.string, Types.int, Types.int], (args, ctx) =>
    `${ctx.emit(args[0])}[${ctx.emit(args[1])}, ${ctx.emit(args[2])}]`);
  rubyLib.register('concat', [Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.concat(${ctx.emit(args[1])})`);
  // indexOf returns nil when not found (Ruby's index already does this)
  rubyLib.register('indexOf', [Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.index(${ctx.emit(args[1])})`);
  rubyLib.register('replace', [Types.string, Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.sub(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
  rubyLib.register('replaceAll', [Types.string, Types.string, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.gsub(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
  rubyLib.register('isEmpty', [Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.empty?`);
  rubyLib.register('padStart', [Types.string, Types.int, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.rjust(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
  rubyLib.register('padEnd', [Types.string, Types.int, Types.string], (args, ctx) =>
    `${ctx.emit(args[0])}.ljust(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);

  // Numeric functions (use rubyMethod to handle binary op precedence)
  rubyLib.register('abs', [Types.int], rubyMethod('abs'));
  rubyLib.register('abs', [Types.float], rubyMethod('abs'));
  rubyLib.register('round', [Types.int], (args, ctx) => ctx.emit(args[0]));
  rubyLib.register('round', [Types.float], rubyMethod('round'));
  rubyLib.register('floor', [Types.int], (args, ctx) => ctx.emit(args[0]));
  rubyLib.register('floor', [Types.float], rubyMethod('floor'));
  rubyLib.register('ceil', [Types.int], (args, ctx) => ctx.emit(args[0]));
  rubyLib.register('ceil', [Types.float], rubyMethod('ceil'));

  // Temporal extraction functions
  rubyLib.register('year', [Types.date], (args, ctx) => `${ctx.emit(args[0])}.year`);
  rubyLib.register('year', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.year`);
  rubyLib.register('month', [Types.date], (args, ctx) => `${ctx.emit(args[0])}.month`);
  rubyLib.register('month', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.month`);
  rubyLib.register('day', [Types.date], (args, ctx) => `${ctx.emit(args[0])}.day`);
  rubyLib.register('day', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.day`);
  rubyLib.register('hour', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.hour`);
  rubyLib.register('minute', [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.minute`);

  // Type introspection
  rubyLib.register('typeOf', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(v) { case v when NilClass; 'NoVal' when ActiveSupport::Duration; 'Duration' when Date, DateTime, Time; 'DateTime' when Integer; 'Int' when Float; 'Float' when TrueClass, FalseClass; 'Bool' when String; 'String' when Proc; 'Fn' else 'Object' end }).call(${v})`;
  });

  // Null handling
  rubyLib.register('isVal', [Types.any], (args, ctx) => `!(${ctx.emit(args[0])}).nil?`);
  rubyLib.register('orVal', [Types.any, Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    const d = ctx.emit(args[1]);
    return `(->(v) { v.nil? ? ${d} : v }).call(${v})`;
  });

  // Fallback for unknown functions
  rubyLib.registerFallback((name, args, _argTypes, ctx) => {
    const emittedArgs = args.map(a => ctx.emit(a)).join(', ');
    return `${name}(${emittedArgs})`;
  });

  return rubyLib;
}
