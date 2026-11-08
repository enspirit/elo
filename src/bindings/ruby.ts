/**
 * Ruby stdlib binding for Elo
 *
 * This module defines how Elo IR functions are emitted as Ruby code.
 */

import { IRExpr } from '../ir';
import { Types } from '../types';
import { StdLib, identity, EmitContext, simpleBinaryOp, nullary, rubyMethod, isBinaryOp, helperCall } from '../stdlib';
import { parseExtractTemplate, buildExtractPattern } from '../extract';

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
  // 0259 D1/D2: the clock is read in the *declared* zone, through the one
  // helper that holds it. `DateTime.now` kept the host's offset where
  // `Date.today` had none, so `startOfDay(NOW) == TODAY` was false at any
  // offset but zero.
  rubyLib.register('today', [], (_args, ctx) => {
    ctx.requireHelper('k_today');
    return `k_today("${ctx.timezone}")`;
  });
  rubyLib.register('now', [], (_args, ctx) => {
    ctx.requireHelper('k_now');
    return `k_now("${ctx.timezone}")`;
  });
  rubyLib.register('bot', [], nullary('DateTime.new(1, 1, 1, 0, 0, 0)'));
  rubyLib.register('eot', [], nullary('DateTime.new(9999, 12, 31, 23, 59, 59)'));

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

  const camelCaseMap: Record<string, string> = {
    'startOfDay': 'beginning_of_day',
    'endOfDay': 'end_of_day',
    'startOfWeek': 'beginning_of_week',
    'endOfWeek': 'end_of_week',
    'startOfMonth': 'beginning_of_month',
    'endOfMonth': 'end_of_month',
    'startOfQuarter': 'beginning_of_quarter',
    'endOfQuarter': 'end_of_quarter',
    'startOfYear': 'beginning_of_year',
    'endOfYear': 'end_of_year',
  };

  for (const [fn, method] of Object.entries(periodBoundaryMap)) {
    // The `now` special case that used to live here emitted
    // `Date.today.${method}`, which read the *host's* zone and so bypassed the
    // declared one — `start_of_day(NOW)` and `startOfDay(NOW)` would have
    // disagreed. With `k_now` carrying no offset, the general emission is
    // correct for `now` too.
    rubyLib.register(fn, [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.${method}`);
  }
  for (const [fn, method] of Object.entries(camelCaseMap)) {
    rubyLib.register(fn, [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.${method}`);
    rubyLib.register(fn, [Types.date], (args, ctx) => `${ctx.emit(args[0])}.to_datetime.${method}`);
    // An unknown type must not fall back to the Datetime emission: `Date#end_of_week`
    // yields a Date at midnight, where the boundary is the last instant of the day.
    // `to_datetime` is the identity on a DateTime, so the Date emission is the one
    // that is correct for both.
    rubyLib.register(fn, [Types.any], (args, ctx) => `${ctx.emit(args[0])}.to_datetime.${method}`);
  }

  // Ruby uses native operators for all types due to operator overloading
  // Using any,any registration - type generalization handles all concrete type combinations
  // Addition is not native for every type either: ActiveSupport defines
  // Date + Duration and not Duration + Date, so the unknown-type case goes
  // through a dispatcher that swaps the operands the way the typed
  // registrations below do. The numeric cases keep a bare `+`.
  rubyLib.register('add', [Types.any, Types.any], helperCall('k_add'));
  for (const leftType of [Types.int, Types.float]) {
    for (const rightType of [Types.int, Types.float]) {
      rubyLib.register('add', [leftType, rightType], simpleBinaryOp('+'));
    }
  }
  rubyLib.register('add', [Types.string, Types.string], simpleBinaryOp('+'));
  rubyLib.register('add', [Types.array, Types.array], simpleBinaryOp('+'));
  rubyLib.register('add', [Types.duration, Types.duration], simpleBinaryOp('+'));
  // Subtraction is the one operator Ruby cannot do natively for every type:
  // Date/DateTime difference yields a Rational number of days, not a duration.
  // So the unknown-type case goes through a dispatcher, and the numeric cases
  // are registered explicitly to keep emitting a bare `-`. JavaScript has the
  // same split.
  rubyLib.register('sub', [Types.any, Types.any], helperCall('k_sub'));
  for (const leftType of [Types.int, Types.float]) {
    for (const rightType of [Types.int, Types.float]) {
      rubyLib.register('sub', [leftType, rightType], simpleBinaryOp('-'));
    }
  }
  // Numeric multiplication is the native operator; the unknown-type case goes
  // through a dispatcher so that `String * Int` reaches the *bounded* repeat
  // rather than Ruby's unbounded `String#*`, and durations keep the overload.
  rubyLib.register('mul', [Types.any, Types.any], helperCall('k_mul'));
  for (const leftType of [Types.int, Types.float]) {
    for (const rightType of [Types.int, Types.float]) {
      rubyLib.register('mul', [leftType, rightType], simpleBinaryOp('*'));
    }
  }
  // Ruby truncates Integer / Integer, where Elo's `/` is real division in
  // every other target, so numeric division goes through `fdiv` rather than
  // the operator. Every numeric combination, not only Int / Int: a value
  // *declared* Float can still be an Integer at runtime — `2 ^ 3` is 8 on
  // Ruby while `pow(Int, Int)` is declared Float — and `8 / 16` would then
  // truncate to 0 where Elo says 0.5. `fdiv` is real division whatever the
  // operands turn out to be, which is what the declaration promises.
  //
  // The unknown-type case still needs the helper, so that Duration / Integer
  // keeps using the overloaded operator.
  for (const leftType of [Types.int, Types.float]) {
    for (const rightType of [Types.int, Types.float]) {
      rubyLib.register('div', [leftType, rightType], (args, ctx) => {
        const left = ctx.emit(args[0]);
        const receiver = isNativeBinaryOp(args[0]) ? `(${left})` : left;
        return `${receiver}.fdiv(${ctx.emit(args[1])})`;
      });
    }
  }
  rubyLib.register('div', [Types.duration, Types.int], simpleBinaryOp('/'));
  rubyLib.register('div', [Types.duration, Types.float], simpleBinaryOp('/'));
  rubyLib.register('div', [Types.any, Types.any], helperCall('k_div'));
  // Numeric modulo is the native (floored) operator; the unknown-type case
  // goes through a dispatcher so that a String operand is refused rather than
  // reaching Ruby's `String#%` sprintf.
  rubyLib.register('mod', [Types.any, Types.any], helperCall('k_mod'));
  for (const leftType of [Types.int, Types.float]) {
    for (const rightType of [Types.int, Types.float]) {
      rubyLib.register('mod', [leftType, rightType], simpleBinaryOp('%'));
    }
  }
  // `**` answers a Rational for an Integer base and a negative Integer
  // exponent, which no other target does and which typeOf could not name.
  rubyLib.register('pow', [Types.any, Types.any], helperCall('k_pow'));

  // String repetition, length-bounded to prevent OOM (handles both operand orders)
  rubyLib.register('mul', [Types.string, Types.int], (args, ctx) => {
    ctx.requireHelper('k_str_mul');
    return `k_str_mul(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  rubyLib.register('mul', [Types.int, Types.string], (args, ctx) => {
    ctx.requireHelper('k_str_mul');
    return `k_str_mul(${ctx.emit(args[1])}, ${ctx.emit(args[0])})`;
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

  // AssertFails - expects a function to throw when called
  rubyLib.register('assertFails', [Types.fn], (args, ctx) => {
    const fn = ctx.emit(args[0]);
    return `(begin; (${fn}).call; raise "Expected error but none thrown"; rescue => e; raise e if e.message == "Expected error but none thrown"; true; end)`;
  });

  // Array functions
  rubyLib.register('length', [Types.array], (args, ctx) => `${ctx.emit(args[0])}.length`);
  rubyLib.register('count', [Types.array], (args, ctx) => `${ctx.emit(args[0])}.length`);
  // Use lambda to ensure nil for negative indices (Ruby's native [-1] returns last element)
  rubyLib.register('at', [Types.array, Types.int], (args, ctx) =>
    `(->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`);
  // Dynamic fallback: index only a real Array by an Integer, nil otherwise, so
  // at() on untyped operands agrees with the other targets (a string key is
  // not an index). Ruby cannot reach a constructor through [] regardless.
  rubyLib.register('at', [Types.any, Types.any], (args, ctx) =>
    `(->(a, i) { a.is_a?(Array) && i.is_a?(Integer) && i >= 0 && i < a.length ? a[i] : nil }).call(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`);
  rubyLib.register('first', [Types.array], (args, ctx) => `${ctx.emit(args[0])}.first`);
  rubyLib.register('last', [Types.array], (args, ctx) => `${ctx.emit(args[0])}.last`);
  rubyLib.register('isEmpty', [Types.array], (args, ctx) => `${ctx.emit(args[0])}.empty?`);
  // Helper for method calls with arguments - wraps receiver in parens if needed
  const wrapReceiver = (args: IRExpr[], ctx: { emit: (e: IRExpr) => string }) => {
    const operand = ctx.emit(args[0]);
    return isBinaryOp(args[0]) ? `(${operand})` : operand;
  };

  // The fallback for a receiver or a needle whose type is not known, as well
  // as the list case: `.include?` reads a string and a list alike.
  rubyLib.register('contains', [Types.array, Types.any], (args, ctx) =>
    `${wrapReceiver(args, ctx)}.include?(${ctx.emit(args[1])})`);
  rubyLib.register('sort', [Types.array], rubyMethod('sort'));
  rubyLib.register('min', [Types.array], rubyMethod('min'));
  rubyLib.register('max', [Types.array], rubyMethod('max'));
  for (const l of [Types.int, Types.float, Types.any]) {
    for (const r of [Types.int, Types.float, Types.any]) {
      rubyLib.register('min', [l, r], (args, ctx) => `[${ctx.emit(args[0])}, ${ctx.emit(args[1])}].min`);
      rubyLib.register('max', [l, r], (args, ctx) => `[${ctx.emit(args[0])}, ${ctx.emit(args[1])}].max`);
    }
  }
  rubyLib.register('sum', [Types.array], rubyMethod('sum'));
  rubyLib.register('avg', [Types.array], (args, ctx) =>
    `(lambda { |a| a.empty? ? nil : a.sum.to_f / a.length }).call(${ctx.emit(args[0])})`);
  rubyLib.register('sum', [Types.array, Types.any], (args, ctx) =>
    `${ctx.emit(args[0])}.sum(${ctx.emit(args[1])})`);

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
    rubyLib.register('find', [t, Types.fn], (args, ctx) =>
      `${ctx.emit(args[0])}.find(&${ctx.emit(args[1])})`);
    rubyLib.register('sortBy', [t, Types.fn], (args, ctx) => {
      const list = ctx.emit(args[0]);
      if (args[1].type === 'datapath') {
        const fetchLambda = '->(d, p) { p.reduce(d) { |cur, seg| break nil if cur.nil?; seg.is_a?(Integer) ? (cur.is_a?(Array) ? cur[seg] : nil) : (cur.is_a?(Hash) ? cur[seg] : nil) } }';
        return `(lambda { |a| f = ${fetchLambda}; a.sort_by { |e| f.call(e, ${ctx.emit(args[1])}) } }).call(${list})`;
      }
      return `${list}.sort_by(&${ctx.emit(args[1])})`;
    });
  }

  // String functions (register for string and any to support lambdas with unknown types)
  // Use rubyMethod to handle binary expression precedence
  for (const t of [Types.string, Types.any]) {
    rubyLib.register('length', [t], rubyMethod('length'));
    rubyLib.register('upper', [t], rubyMethod('upcase'));
    rubyLib.register('lower', [t], rubyMethod('downcase'));
    rubyLib.register('trim', [t], rubyMethod('strip'));
    rubyLib.register('trimStart', [t], rubyMethod('lstrip'));
    rubyLib.register('trimEnd', [t], rubyMethod('rstrip'));
    rubyLib.register('reverse', [t], rubyMethod('reverse'));
    rubyLib.register('isEmpty', [t], rubyMethod('empty?'));
    rubyLib.register('isBlank', [t], rubyMethod('strip.empty?'));
  }
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
    rubyLib.register('slice', [t, Types.int, Types.int], (args, ctx) =>
      `${wrapReceiver(args, ctx)}[${ctx.emit(args[1])}...${ctx.emit(args[2])}]`);
    // Elo replace is *literal*. sub/gsub with a string replacement interpret
    // backreferences (\1, \&, \', \`), so a replacement of \' ("text after the
    // match") expands the output superlinearly. The block form returns the
    // replacement verbatim, so no backreference is honoured.
    rubyLib.register('replace', [t, Types.string, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.sub(${ctx.emit(args[1])}) { ${ctx.emit(args[2])} }`);
    rubyLib.register('replaceAll', [t, Types.string, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.gsub(${ctx.emit(args[1])}) { ${ctx.emit(args[2])} }`);
    rubyLib.register('padStart', [t, Types.int, Types.string], (args, ctx) => {
      ctx.requireHelper('k_pad');
      return `k_pad(${wrapReceiver(args, ctx)}, ${ctx.emit(args[1])}, ${ctx.emit(args[2])}, true)`;
    });
    rubyLib.register('padEnd', [t, Types.int, Types.string], (args, ctx) => {
      ctx.requireHelper('k_pad');
      return `k_pad(${wrapReceiver(args, ctx)}, ${ctx.emit(args[1])}, ${ctx.emit(args[2])}, false)`;
    });
  }

  // Numeric functions (use rubyMethod to handle binary op precedence)
  // For int, round/floor/ceil are identity operations (optimization)
  // For float and any, use the method (which also works correctly for ints)
  rubyLib.register('abs', [Types.int], rubyMethod('abs'));
  rubyLib.register('abs', [Types.float], rubyMethod('abs'));
  rubyLib.register('round', [Types.int], identity());
  rubyLib.register('round', [Types.float], rubyMethod('round'));
  rubyLib.register('round', [Types.any], rubyMethod('round')); // Safe for any numeric type
  for (const t of [Types.int, Types.float, Types.any]) {
    rubyLib.register('round', [t, Types.int], helperCall('k_round_to'));
  }
  rubyLib.register('floor', [Types.int], identity());
  rubyLib.register('floor', [Types.float], rubyMethod('floor'));
  rubyLib.register('floor', [Types.any], rubyMethod('floor')); // Safe for any numeric type
  rubyLib.register('ceil', [Types.int], identity());
  rubyLib.register('ceil', [Types.float], rubyMethod('ceil'));
  rubyLib.register('ceil', [Types.any], rubyMethod('ceil')); // Safe for any numeric type

  // Duration unit conversion functions
  // Approximate units use standard conversions: 1y=365.25d, 1m=30.4375d, 1q=91.3125d
  rubyLib.register('inYears', [Types.duration], (args, ctx) =>
    `(${ctx.emit(args[0])}.to_i / 31557600.0)`);
  rubyLib.register('inQuarters', [Types.duration], (args, ctx) =>
    `(${ctx.emit(args[0])}.to_i / 7889400.0)`);
  rubyLib.register('inMonths', [Types.duration], (args, ctx) =>
    `(${ctx.emit(args[0])}.to_i / 2629800.0)`);
  rubyLib.register('inWeeks', [Types.duration], (args, ctx) =>
    `(${ctx.emit(args[0])}.to_i / 604800.0)`);
  rubyLib.register('inDays', [Types.duration], (args, ctx) =>
    `(${ctx.emit(args[0])}.to_i / 86400.0)`);
  rubyLib.register('inHours', [Types.duration], (args, ctx) =>
    `(${ctx.emit(args[0])}.to_i / 3600.0)`);
  rubyLib.register('inMinutes', [Types.duration], (args, ctx) =>
    `(${ctx.emit(args[0])}.to_i / 60.0)`);
  rubyLib.register('inSeconds', [Types.duration], (args, ctx) =>
    `${ctx.emit(args[0])}.to_i.to_f`);

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
rubyLib.register('isNotNull', [Types.any], (args, ctx) => `!(${ctx.emit(args[0])}).nil?`);

  // Data path navigation. The walk lives in the `k_fetch*` prelude helpers,
  // so the four forms share one implementation of it; see src/runtime.ts.
  rubyLib.register('fetch', [Types.any, Types.fn], (args, ctx) => {
    ctx.requireHelper('k_fetch');
    return `k_fetch(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  rubyLib.register('fetch', [Types.any, Types.string], (args, ctx) => {
    ctx.requireHelper('k_fetch');
    return `k_fetch(${ctx.emit(args[0])}, [${ctx.emit(args[1])}])`;
  });
  rubyLib.register('fetch', [Types.any, Types.array], (args, ctx) => {
    ctx.requireHelper('k_fetch');
    return `k_fetch(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  rubyLib.register('fetch', [Types.any, Types.object], (args, ctx) => {
    ctx.requireHelper('k_fetch_object');
    return `k_fetch_object(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  // With the path's type unknown, its runtime shape decides which form it is.
  // Without this the arity fallback took the path form for all four.
  rubyLib.register('fetch', [Types.any, Types.any], (args, ctx) => {
    ctx.requireHelper('k_fetch_any');
    return `k_fetch_any(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });
  rubyLib.register('patch', [Types.any, Types.fn, Types.any], (args, ctx) => {
    ctx.requireHelper('k_patch');
    const data = ctx.emit(args[0]);
    const path = ctx.emit(args[1]);
    const value = ctx.emit(args[2]);
    return `k_patch(${data}, ${path}, ${value})`;
  });

  // Data merge functions
  rubyLib.register('merge', [Types.any, Types.any], (args, ctx) => {
    const a = ctx.emit(args[0]);
    const b = ctx.emit(args[1]);
    return `(${a}).merge(${b})`;
  });
  rubyLib.register('deepMerge', [Types.any, Types.any], (args, ctx) => {
    ctx.requireHelper('k_deep_merge');
    const a = ctx.emit(args[0]);
    const b = ctx.emit(args[1]);
    return `k_deep_merge(${a}, ${b})`;
  });

  // Error handling
  rubyLib.register('fail', [Types.string], (args, ctx) => {
    const message = ctx.emit(args[0]);
    return `raise ${message}`;
  });

  // Type selectors (Finitio schemas - throw on failure)
  // Int - identity for int, truncate for float, parse for string
  rubyLib.register('chr', [Types.int], (args, ctx) => `(${ctx.emit(args[0])}).chr(Encoding::UTF_8)`);
  rubyLib.register('Int', [Types.int], identity());
  rubyLib.register('Int', [Types.float], rubyMethod('to_i'));
  rubyLib.register('Int', [Types.string], (args, ctx) => {
    const v = ctx.emit(args[0]);
    // Base 10 explicitly: Kernel#Integer reads a leading zero as octal, so a
    // zero-padded decimal string would be a different number, or a refusal.
    return `(->(s) { Integer(s, 10) rescue raise ".: expected Int, got #{s.inspect}" }).call(${v})`;
  });
  rubyLib.register('Int', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(v) { case v when Integer; v when Float; v.to_i when String; Integer(v, 10) rescue raise ".: expected Int, got #{v.inspect}" else raise ".: expected Int, got #{v.class}" end }).call(${v})`;
  });

  // Float - identity for float, convert for int, parse for string
  rubyLib.register('Float', [Types.float], identity());
  rubyLib.register('Float', [Types.int], rubyMethod('to_f'));
  // k_float rather than Kernel#Float: what a numeric string is must not depend
  // on which Ruby the host runs. See the helper in src/runtime.ts.
  rubyLib.register('Float', [Types.string], (args, ctx) => {
    ctx.requireHelper('k_float');
    return `(->(s) { k_float(s) rescue raise ".: expected Float, got #{s.inspect}" }).call(${ctx.emit(args[0])})`;
  });
  rubyLib.register('Float', [Types.any], (args, ctx) => {
    ctx.requireHelper('k_float');
    return `(->(v) { case v when Numeric; k_float(v) when String; k_float(v) rescue raise ".: expected Float, got #{v.inspect}" else raise ".: expected Float, got #{v.class}" end }).call(${ctx.emit(args[0])})`;
  });

  // Bool - identity for bool, parse "true"/"false" for string
  rubyLib.register('Bool', [Types.bool], identity());
  rubyLib.register('Bool', [Types.string], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(s) { case s when 'true'; true when 'false'; false else raise ".: expected Bool, got #{s.inspect}" end }).call(${v})`;
  });
  rubyLib.register('Bool', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(v) { case v when true, false; v when 'true'; true when 'false'; false else raise ".: expected Bool, got #{v.class}" end }).call(${v})`;
  });

  // Date - identity for date, parse ISO for string
  rubyLib.register('Date', [Types.date], identity());
  rubyLib.register('Date', [Types.string], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(s) { raise ".: expected Date (YYYY-MM-DD), got #{s.inspect}" unless s =~ /^\\d{4}-\\d{2}-\\d{2}$/; Date.parse(s) }).call(${v})`;
  });
  // `when DateTime, Time` has to come first, and that ordering is the whole
  // fix: in Ruby `DateTime` is a *subclass* of `Date`, so a plain `when Date`
  // arm matches a DateTime and used to hand it back untouched, time-of-day
  // intact. `Date(NOW)` was the identity here while JavaScript, Python and SQL
  // all truncated — a one-target divergence in the dynamic path.
  rubyLib.register('Date', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(v) { case v when DateTime, Time; v.to_date when Date; v when String; raise ".: expected Date (YYYY-MM-DD), got #{v.inspect}" unless v =~ /^\\d{4}-\\d{2}-\\d{2}$/; Date.parse(v) else raise ".: expected Date, got #{v.class}" end }).call(${v})`;
  });

  // Datetime - identity for datetime, parse ISO for string
  rubyLib.register('Datetime', [Types.datetime], identity());
  rubyLib.register('Datetime', [Types.string], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(s) { DateTime.parse(s) rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call(${v})`;
  });
  rubyLib.register('Datetime', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(v) { case v when DateTime, Time; v when String; DateTime.parse(v) rescue raise ".: expected Datetime, got #{v.inspect}" else raise ".: expected Datetime, got #{v.class}" end }).call(${v})`;
  });

  // Duration - identity for duration, parse ISO for string
  rubyLib.register('Duration', [Types.duration], identity());
  rubyLib.register('Duration', [Types.string], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(s) { ActiveSupport::Duration.parse(s) rescue raise ".: expected Duration (ISO 8601), got #{s.inspect}" }).call(${v})`;
  });
  // A Range is how this target carries an Interval, and Duration(interval) is
  // the interval's length on the typed path, so this must answer the same
  // rather than refuse — it raised ".: expected Duration, got Range".
  rubyLib.register('Duration', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(v) { case v when ActiveSupport::Duration; v when Range; ActiveSupport::Duration.build(((v.last - v.first) * 86400).to_i) when String; ActiveSupport::Duration.parse(v) rescue raise ".: expected Duration (ISO 8601), got #{v.inspect}" else raise ".: expected Duration, got #{v.class}" end }).call(${v})`;
  });

  // Interval - construct from object with start/end properties
  rubyLib.register('Interval', [Types.interval], identity());
  rubyLib.register('Interval', [Types.object], (args, ctx) => {
    const obj = args[0];
    if (obj.type === 'object_literal') {
      const startProp = obj.properties.find(p => p.key === 'start');
      const endProp = obj.properties.find(p => p.key === 'end');
      if (startProp && endProp) {
        return `(${ctx.emit(startProp.value)}..${ctx.emit(endProp.value)})`;
      }
    }
    const v = ctx.emit(args[0]);
    return `(${v}[:start]..${v}[:end])`;
  });
  rubyLib.register('Interval', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(${v}[:start]..${v}[:end])`;
  });

  // Interval accessors
  rubyLib.register('start', [Types.interval], (args, ctx) => `${ctx.emit(args[0])}.first`);
  rubyLib.register('end', [Types.interval], (args, ctx) => `${ctx.emit(args[0])}.last`);

  // Interval arithmetic
  rubyLib.register('union', [Types.interval, Types.interval], (args, ctx) => {
    const a = ctx.emit(args[0]);
    const b = ctx.emit(args[1]);
    return `([${a}.first, ${b}.first].min..[${a}.last, ${b}.last].max)`;
  });
  rubyLib.register('intersection', [Types.interval, Types.interval], (args, ctx) => {
    ctx.requireHelper('k_intersection');
    return `k_intersection(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`;
  });

  // Duration(Interval) - get the length of an interval
  // Ruby DateTime subtraction returns days as a Rational, multiply by 86400 to get seconds
  rubyLib.register('Duration', [Types.interval], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `ActiveSupport::Duration.build(((${v}.last - ${v}.first) * 86400).to_i)`;
  });

  // Data - identity for non-strings, parse JSON for strings
  rubyLib.register('Data', [Types.array], identity());
  rubyLib.register('Data', [Types.object], identity());
  rubyLib.register('Data', [Types.string], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(s) { JSON.parse(s, symbolize_names: true) rescue raise ".: invalid JSON: #{s.inspect}" }).call(${v})`;
  });
  rubyLib.register('Data', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(->(v) { case v when String; JSON.parse(v, symbolize_names: true) rescue raise ".: invalid JSON: #{v.inspect}" else v end }).call(${v})`;
  });

  // String - convert any value to string (Elo literal format for complex types)
  rubyLib.register('String', [Types.string], identity());
  rubyLib.register('String', [Types.int], rubyMethod('to_s'));
  rubyLib.register('String', [Types.float], rubyMethod('to_s'));
  rubyLib.register('String', [Types.bool], rubyMethod('to_s'));
  rubyLib.register('String', [Types.null], rubyMethod('to_s'));
  rubyLib.register('String', [Types.array], (args, ctx) => {
    ctx.requireHelper('k_string');
    return `k_string(${ctx.emit(args[0])})`;
  });
  rubyLib.register('String', [Types.object], (args, ctx) => {
    ctx.requireHelper('k_string');
    return `k_string(${ctx.emit(args[0])})`;
  });
  // Not k_string: that renders, and renders a string *quoted*. Reached with
  // the type unknown it has to convert, like `String:string` does.
  rubyLib.register('String', [Types.any], (args, ctx) => {
    ctx.requireHelper('k_to_string');
    return `k_to_string(${ctx.emit(args[0])})`;
  });

  // List manipulation functions
  rubyLib.register('reverse', [Types.array], (args, ctx) =>
    `${ctx.emit(args[0])}.reverse`);
  rubyLib.register('unique', [Types.array], rubyMethod('uniq'));
  rubyLib.register('flat', [Types.array], (args, ctx) =>
    `${ctx.emit(args[0])}.flatten(1)`);

  // Join list elements with separator
  for (const t of [Types.array, Types.any]) {
    rubyLib.register('join', [t, Types.string], (args, ctx) =>
      `${ctx.emit(args[0])}.join(${ctx.emit(args[1])})`);
  }

  // Split string into list
  for (const t of [Types.string, Types.any]) {
    rubyLib.register('split', [t, Types.string], (args, ctx) =>
      `${wrapReceiver(args, ctx)}.split(${ctx.emit(args[1])})`);
  }

  // Extract - pattern matching with mustache-style templates
  for (const t of [Types.string, Types.any]) {
    rubyLib.register('extract', [t, Types.string], (args, ctx) => {
      const template = parseExtractTemplate((args[1] as { value: string }).value);
      const pattern = buildExtractPattern(template);
      const matchObj = template.fields.map((f, i) => `${f}: _m[${i + 1}]`).join(', ');
      const nullObj = template.fields.map(f => `${f}: nil`).join(', ');
      // Escape / in pattern for Ruby regex literal
      const escapedPattern = pattern.replace(/\//g, '\\/');
      return `(->(s) { _m = s.match(/${escapedPattern}/); _m ? {${matchObj}} : {${nullObj}} }).call(${ctx.emit(args[0])})`;
    });
  }

  // No fallback - unknown functions should fail at compile time
  // (StdLib.emit() will throw if no implementation is found)

  return rubyLib;
}
