/**
 * Ruby stdlib binding for Elo
 *
 * This module defines how Elo IR functions are emitted as Ruby code.
 */

import { IRExpr } from '../ir';
import { Types } from '../types';
import { StdLib, EmitContext, simpleBinaryOp, nullary, rubyMethod, isBinaryOp } from '../stdlib';

/**
 * Map IR function names to Ruby operators
 */
export const RUBY_OP_MAP: Record<string, string> = {
  'add': '+', 'sub': '-', 'mul': '*', 'div': '/', 'mod': '%', 'pow': '**',
  'lt': '<', 'gt': '>', 'lte': '<=', 'gte': '>=',
  'eq': '==', 'neq': '!=', 'and': '&&', 'or': '||',
};

/**
 * Check if a call will be emitted as a native Ruby binary operator
 */
export function isNativeBinaryOp(ir: IRExpr): boolean {
  if (ir.type !== 'call') return false;
  return RUBY_OP_MAP[ir.fn] !== undefined && ir.argTypes.length === 2;
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

  // Int * String needs operand swap (Ruby only supports String * Int)
  rubyLib.register('mul', [Types.int, Types.string], (args, ctx) => {
    const left = ctx.emitWithParens(args[1], '*', 'left');
    const right = ctx.emitWithParens(args[0], '*', 'right');
    return `${left} * ${right}`;
  });

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

  // Date - Date returns a Duration (Rational in Ruby, convert to days)
  rubyLib.register('sub', [Types.date, Types.date], (args, ctx) => {
    const left = ctx.emitWithParens(args[0], '-', 'left');
    const right = ctx.emitWithParens(args[1], '-', 'right');
    return `(${left} - ${right}).to_i.days`;
  });
  rubyLib.register('sub', [Types.datetime, Types.datetime], (args, ctx) => {
    const left = ctx.emitWithParens(args[0], '-', 'left');
    const right = ctx.emitWithParens(args[1], '-', 'right');
    return `((${left} - ${right}) * 86400).to_i.seconds`;
  });

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
    if (isNativeBinaryOp(args[0])) return `-(${operand})`;
    return `-${operand}`;
  });
  rubyLib.register('pos', [Types.any], (args, ctx) => {
    const operand = ctx.emit(args[0]);
    if (isNativeBinaryOp(args[0])) return `+(${operand})`;
    return `+${operand}`;
  });
  rubyLib.register('not', [Types.any], (args, ctx) => {
    const operand = ctx.emit(args[0]);
    if (isNativeBinaryOp(args[0])) return `!(${operand})`;
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

  // Array functions
  rubyLib.register('length', [Types.array], (args, ctx) => `${ctx.emit(args[0])}.length`);
  // Use lambda to ensure nil for negative indices (Ruby's native [-1] returns last element)
  rubyLib.register('at', [Types.array, Types.int], (args, ctx) =>
    `(->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`);
  rubyLib.register('first', [Types.array], (args, ctx) => `${ctx.emit(args[0])}.first`);
  rubyLib.register('last', [Types.array], (args, ctx) => `${ctx.emit(args[0])}.last`);
  rubyLib.register('isEmpty', [Types.array], (args, ctx) => `${ctx.emit(args[0])}.empty?`);

  // Array iteration functions (register for both array and any to support dynamic types)
  for (const t of [Types.array, Types.any]) {
    rubyLib.register('map', [t, Types.fn], (args, ctx) =>
      `${ctx.emit(args[0])}.map(&${ctx.emit(args[1])})`);
    rubyLib.register('filter', [t, Types.fn], (args, ctx) =>
      `${ctx.emit(args[0])}.select(&${ctx.emit(args[1])})`);
    rubyLib.register('reduce', [t, Types.any, Types.fn], (args, ctx) =>
      `${ctx.emit(args[0])}.reduce(${ctx.emit(args[1])}, &${ctx.emit(args[2])})`);
    rubyLib.register('any', [t, Types.fn], (args, ctx) =>
      `${ctx.emit(args[0])}.any?(&${ctx.emit(args[1])})`);
    rubyLib.register('all', [t, Types.fn], (args, ctx) =>
      `${ctx.emit(args[0])}.all?(&${ctx.emit(args[1])})`);
  }

  // String functions (register for string and any to support lambdas with unknown types)
  // Use rubyMethod to handle binary expression precedence
  for (const t of [Types.string, Types.any]) {
    rubyLib.register('length', [t], rubyMethod('length'));
    rubyLib.register('upper', [t], rubyMethod('upcase'));
    rubyLib.register('lower', [t], rubyMethod('downcase'));
    rubyLib.register('trim', [t], rubyMethod('strip'));
    rubyLib.register('isEmpty', [t], rubyMethod('empty?'));
  }
  // Helper for method calls with arguments - wraps receiver in parens if needed
  const wrapReceiver = (args: IRExpr[], ctx: { emit: (e: IRExpr) => string }) => {
    const operand = ctx.emit(args[0]);
    return isBinaryOp(args[0]) ? `(${operand})` : operand;
  };

  // String functions with two args
  for (const t of [Types.string, Types.any]) {
    rubyLib.register('startsWith', [t, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.start_with?(${ctx.emit(args[1])})`);
    rubyLib.register('endsWith', [t, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.end_with?(${ctx.emit(args[1])})`);
    rubyLib.register('contains', [t, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.include?(${ctx.emit(args[1])})`);
    rubyLib.register('concat', [t, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.concat(${ctx.emit(args[1])})`);
    // indexOf returns nil when not found (Ruby's index already does this)
    rubyLib.register('indexOf', [t, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.index(${ctx.emit(args[1])})`);
  }
  // String functions with three args
  for (const t of [Types.string, Types.any]) {
    rubyLib.register('substring', [t, Types.int, Types.int], (args, ctx) =>
      `${wrapReceiver(args, ctx)}[${ctx.emit(args[1])}, ${ctx.emit(args[2])}]`);
    rubyLib.register('replace', [t, Types.string, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.sub(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
    rubyLib.register('replaceAll', [t, Types.string, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.gsub(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
    rubyLib.register('padStart', [t, Types.int, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.rjust(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
    rubyLib.register('padEnd', [t, Types.int, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.ljust(${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
  }

  // Numeric functions (use rubyMethod to handle binary op precedence)
  // For int, round/floor/ceil are identity operations (optimization)
  // For float and any, use the method (which also works correctly for ints)
  rubyLib.register('abs', [Types.int], rubyMethod('abs'));
  rubyLib.register('abs', [Types.float], rubyMethod('abs'));
  rubyLib.register('round', [Types.int], (args, ctx) => ctx.emit(args[0]));
  rubyLib.register('round', [Types.float], rubyMethod('round'));
  rubyLib.register('round', [Types.any], rubyMethod('round')); // Safe for any numeric type
  rubyLib.register('floor', [Types.int], (args, ctx) => ctx.emit(args[0]));
  rubyLib.register('floor', [Types.float], rubyMethod('floor'));
  rubyLib.register('floor', [Types.any], rubyMethod('floor')); // Safe for any numeric type
  rubyLib.register('ceil', [Types.int], (args, ctx) => ctx.emit(args[0]));
  rubyLib.register('ceil', [Types.float], rubyMethod('ceil'));
  rubyLib.register('ceil', [Types.any], rubyMethod('ceil')); // Safe for any numeric type

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
    return `(->(v) { case v when NilClass; 'Null' when ActiveSupport::Duration; 'Duration' when Date, DateTime, Time; 'DateTime' when Integer; 'Int' when Float; 'Float' when TrueClass, FalseClass; 'Bool' when String; 'String' when Proc; 'Function' when Array; 'List' else 'Tuple' end }).call(${v})`;
  });

  // Null handling
  rubyLib.register('isNull', [Types.any], (args, ctx) => `(${ctx.emit(args[0])}).nil?`);

  // Data path navigation
  rubyLib.register('fetch', [Types.any, Types.fn], (args, ctx) => {
    const data = ctx.emit(args[0]);
    const path = ctx.emit(args[1]);
    return `(->(d, p) { p.reduce(d) { |cur, seg| break nil if cur.nil?; seg.is_a?(Integer) ? (cur.is_a?(Array) ? cur[seg] : nil) : (cur.is_a?(Hash) ? cur[seg] : nil) } }).call(${data}, ${path})`;
  });

  // Error handling
  rubyLib.register('fail', [Types.string], (args, ctx) => {
    const message = ctx.emit(args[0]);
    return `raise ${message}`;
  });

  // Type selectors (information contracts)
  // Int - identity for int, truncate for float, parse for string
  rubyLib.register('Int', [Types.int], (args, ctx) => ctx.emit(args[0]));
  rubyLib.register('Int', [Types.float], (args, ctx) => `${ctx.emit(args[0])}.to_i`);
  rubyLib.register('Int', [Types.string], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(s) { Integer(s) rescue nil }).call(${v})`;
  });
  rubyLib.register('Int', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(v) { case v when nil; nil when Integer; v when Float; v.to_i when String; Integer(v) rescue nil else nil end }).call(${v})`;
  });

  // Float - identity for float, convert for int, parse for string
  rubyLib.register('Float', [Types.float], (args, ctx) => ctx.emit(args[0]));
  rubyLib.register('Float', [Types.int], (args, ctx) => `${ctx.emit(args[0])}.to_f`);
  rubyLib.register('Float', [Types.string], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(s) { Float(s) rescue nil }).call(${v})`;
  });
  rubyLib.register('Float', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(v) { case v when nil; nil when Float; v when Integer; v.to_f when String; Float(v) rescue nil else nil end }).call(${v})`;
  });

  // Bool - identity for bool, parse "true"/"false" for string
  rubyLib.register('Bool', [Types.bool], (args, ctx) => ctx.emit(args[0]));
  rubyLib.register('Bool', [Types.string], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(s) { case s when 'true'; true when 'false'; false else nil end }).call(${v})`;
  });
  rubyLib.register('Bool', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(v) { case v when nil; nil when true, false; v when 'true'; true when 'false'; false else nil end }).call(${v})`;
  });

  // Date - identity for date, parse ISO for string
  rubyLib.register('Date', [Types.date], (args, ctx) => ctx.emit(args[0]));
  rubyLib.register('Date', [Types.string], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(s) { s =~ /^\\d{4}-\\d{2}-\\d{2}$/ ? (Date.parse(s) rescue nil) : nil }).call(${v})`;
  });
  rubyLib.register('Date', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(v) { case v when nil; nil when Date; v when String; v =~ /^\\d{4}-\\d{2}-\\d{2}$/ ? (Date.parse(v) rescue nil) : nil else nil end }).call(${v})`;
  });

  // Datetime - identity for datetime, parse ISO for string
  rubyLib.register('Datetime', [Types.datetime], (args, ctx) => ctx.emit(args[0]));
  rubyLib.register('Datetime', [Types.string], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(s) { DateTime.parse(s) rescue nil }).call(${v})`;
  });
  rubyLib.register('Datetime', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(v) { case v when nil; nil when DateTime, Time; v when String; DateTime.parse(v) rescue nil else nil end }).call(${v})`;
  });

  // Duration - identity for duration, parse ISO for string
  rubyLib.register('Duration', [Types.duration], (args, ctx) => ctx.emit(args[0]));
  rubyLib.register('Duration', [Types.string], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(s) { ActiveSupport::Duration.parse(s) rescue nil }).call(${v})`;
  });
  rubyLib.register('Duration', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(v) { case v when nil; nil when ActiveSupport::Duration; v when String; ActiveSupport::Duration.parse(v) rescue nil else nil end }).call(${v})`;
  });

  // Data - identity for non-strings, parse JSON for strings
  rubyLib.register('Data', [Types.array], (args, ctx) => ctx.emit(args[0]));
  rubyLib.register('Data', [Types.object], (args, ctx) => ctx.emit(args[0]));
  rubyLib.register('Data', [Types.string], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(s) { JSON.parse(s, symbolize_names: true) rescue nil }).call(${v})`;
  });
  rubyLib.register('Data', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(v) { case v when nil; nil when String; JSON.parse(v, symbolize_names: true) rescue nil else v end }).call(${v})`;
  });

  // No fallback - unknown functions should fail at compile time
  // (StdLib.emit() will throw if no implementation is found)

  return rubyLib;
}
