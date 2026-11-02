/**
 * Type Definitions for Elo
 *
 * This module defines the type signatures for Elo's stdlib functions and operators.
 * It provides a central registry for looking up result types based on function name
 * and argument types.
 *
 * This information is language-agnostic and used by the transform phase for type inference.
 */

import { EloType, Types, typeEquals } from './types';
import { signatureKey, typeGeneralizations } from './stdlib';

/**
 * A type signature definition: maps argument types to result type
 */
export interface TypeSignature {
  argTypes: EloType[];
  resultType: EloType;
}

/**
 * Registry of type definitions for functions and operators
 */
export class TypeDefs {
  private signatures: Map<string, EloType> = new Map();
  private fallback: ((name: string, argTypes: EloType[]) => EloType) | null = null;

  /**
   * Register a type signature for a function
   */
  register(name: string, argTypes: EloType[], resultType: EloType): this {
    const key = signatureKey(name, argTypes);
    this.signatures.set(key, resultType);
    return this;
  }

  /**
   * Register a fallback for unmatched signatures
   */
  registerFallback(handler: (name: string, argTypes: EloType[]) => EloType): this {
    this.fallback = handler;
    return this;
  }

  /**
   * Look up the result type for a function call.
   * Tries progressively more general type signatures before falling back.
   */
  lookup(name: string, argTypes: EloType[]): EloType {
    for (const generalized of typeGeneralizations(argTypes)) {
      const key = signatureKey(name, generalized);
      const resultType = this.signatures.get(key);
      if (resultType) return resultType;
    }
    if (this.fallback) {
      return this.fallback(name, argTypes);
    }
    return Types.any;
  }

  /**
   * Check if a function signature is registered
   */
  has(name: string, argTypes: EloType[]): boolean {
    for (const generalized of typeGeneralizations(argTypes)) {
      const key = signatureKey(name, generalized);
      if (this.signatures.has(key)) return true;
    }
    return false;
  }

  /**
   * Check if a function signature is registered *exactly*, without trying the
   * more general forms `has()` accepts.
   *
   * The type checker needs this distinction: `has('upper', [any])` is true
   * because `upper(String)` generalizes, but only an exact entry tells us the
   * argument types were really declared.
   */
  hasExactly(name: string, argTypes: EloType[]): boolean {
    return this.signatures.has(signatureKey(name, argTypes));
  }

  /**
   * Every registered signature key, e.g. 'add:int,int'. Used by the registry
   * consistency test to compare this table against each target's bindings.
   */
  signatureKeys(): string[] {
    return [...this.signatures.keys()];
  }

  /**
   * Every registered signature of a function name, as argument type lists.
   * Drives the checker's "Known: …" error messages from the one
   * language-agnostic table rather than from a target's bindings.
   */
  signaturesOf(name: string): EloType[][] {
    const found: EloType[][] = [];
    for (const key of this.signatures.keys()) {
      const parsed = parseSignatureKey(key);
      if (parsed.name === name) found.push(parsed.argTypes);
    }
    return found;
  }
}

/**
 * Parse a signature key back into a name and argument types.
 * Inverse of `signatureKey()`: 'add:int,int' -> { name: 'add', argTypes: [int, int] }
 */
export function parseSignatureKey(key: string): { name: string; argTypes: EloType[] } {
  const colonIdx = key.indexOf(':');
  if (colonIdx === -1) return { name: key, argTypes: [] };
  const name = key.substring(0, colonIdx);
  const argTypes = key
    .substring(colonIdx + 1)
    .split(',')
    .map((kind) => ({ kind } as EloType));
  return { name, argTypes };
}

/**
 * Create the standard Elo type definitions
 */
export function createTypeDefs(): TypeDefs {
  const defs = new TypeDefs();

  // ============================================
  // Nullary functions (temporal)
  // ============================================
  defs.register('today', [], Types.date);
  defs.register('now', [], Types.datetime);
  // Beginning/end of time, behind the BOT/EOT keywords
  defs.register('bot', [], Types.datetime);
  defs.register('eot', [], Types.datetime);

  // ============================================
  // Period boundary functions (date|datetime -> datetime)
  // ============================================
  // Both spellings are callable. The snake_case names are what the temporal
  // keywords (SOD, EOW, …) expand to and only ever receive a Datetime; the
  // camelCase names are what the stdlib documents for direct calls and accept
  // a Date too. Both always yield a Datetime (the boundary instant).
  const periodBoundaryFns = [
    ['start_of_day', 'startOfDay'], ['end_of_day', 'endOfDay'],
    ['start_of_week', 'startOfWeek'], ['end_of_week', 'endOfWeek'],
    ['start_of_month', 'startOfMonth'], ['end_of_month', 'endOfMonth'],
    ['start_of_quarter', 'startOfQuarter'], ['end_of_quarter', 'endOfQuarter'],
    ['start_of_year', 'startOfYear'], ['end_of_year', 'endOfYear'],
  ];
  for (const [snakeName, camelName] of periodBoundaryFns) {
    defs.register(snakeName, [Types.datetime], Types.datetime);
    defs.register(camelName, [Types.date], Types.datetime);
    defs.register(camelName, [Types.datetime], Types.datetime);
  }

  // ============================================
  // Arithmetic operators
  // ============================================

  // int op int -> int (except division)
  defs.register('add', [Types.int, Types.int], Types.int);
  defs.register('sub', [Types.int, Types.int], Types.int);
  defs.register('mul', [Types.int, Types.int], Types.int);
  defs.register('div', [Types.int, Types.int], Types.float); // division always returns float
  defs.register('mod', [Types.int, Types.int], Types.int);
  // Power is a Float even on two Ints: Elo cannot know the exponent's sign
  // statically, and `2 ^ -1` is 0.5. Declared Int, every operation that
  // dispatches on Int versus Float picked the wrong one — and `round`, `floor`
  // and `ceil` of an Int are the identity, so they silently did nothing.
  defs.register('pow', [Types.int, Types.int], Types.float);

  // float involved -> float
  defs.register('add', [Types.float, Types.float], Types.float);
  defs.register('sub', [Types.float, Types.float], Types.float);
  defs.register('mul', [Types.float, Types.float], Types.float);
  defs.register('div', [Types.float, Types.float], Types.float);
  defs.register('mod', [Types.float, Types.float], Types.float);
  defs.register('pow', [Types.float, Types.float], Types.float);

  defs.register('add', [Types.int, Types.float], Types.float);
  defs.register('sub', [Types.int, Types.float], Types.float);
  defs.register('mul', [Types.int, Types.float], Types.float);
  defs.register('div', [Types.int, Types.float], Types.float);
  defs.register('mod', [Types.int, Types.float], Types.float);
  defs.register('pow', [Types.int, Types.float], Types.float);

  defs.register('add', [Types.float, Types.int], Types.float);
  defs.register('sub', [Types.float, Types.int], Types.float);
  defs.register('mul', [Types.float, Types.int], Types.float);
  defs.register('div', [Types.float, Types.int], Types.float);
  defs.register('mod', [Types.float, Types.int], Types.float);
  defs.register('pow', [Types.float, Types.int], Types.float);

  // String concatenation
  defs.register('add', [Types.string, Types.string], Types.string);

  // String multiplication (repeat)
  defs.register('mul', [Types.string, Types.int], Types.string);
  defs.register('mul', [Types.int, Types.string], Types.string);

  // List concatenation
  defs.register('add', [Types.array, Types.array], Types.array);

  // ============================================
  // Temporal arithmetic
  // ============================================

  // date + duration -> date
  defs.register('add', [Types.date, Types.duration], Types.date);
  // date - duration -> date
  defs.register('sub', [Types.date, Types.duration], Types.date);
  // date - date -> duration
  defs.register('sub', [Types.date, Types.date], Types.duration);

  // datetime + duration -> datetime
  defs.register('add', [Types.datetime, Types.duration], Types.datetime);
  // datetime - duration -> datetime
  defs.register('sub', [Types.datetime, Types.duration], Types.datetime);
  // datetime - datetime -> duration
  defs.register('sub', [Types.datetime, Types.datetime], Types.duration);

  // duration +/- duration -> duration
  defs.register('add', [Types.duration, Types.duration], Types.duration);
  defs.register('sub', [Types.duration, Types.duration], Types.duration);
  // duration + date -> date (commutative)
  defs.register('add', [Types.duration, Types.date], Types.date);
  // duration + datetime -> datetime (commutative)
  defs.register('add', [Types.duration, Types.datetime], Types.datetime);

  // duration * number -> duration (scaling)
  defs.register('mul', [Types.duration, Types.int], Types.duration);
  defs.register('mul', [Types.duration, Types.float], Types.duration);
  defs.register('mul', [Types.int, Types.duration], Types.duration);
  defs.register('mul', [Types.float, Types.duration], Types.duration);

  // duration / number -> duration (scaling)
  defs.register('div', [Types.duration, Types.int], Types.duration);
  defs.register('div', [Types.duration, Types.float], Types.duration);

  // ============================================
  // Comparison operators -> bool
  // ============================================
  defs.register('lt', [Types.any, Types.any], Types.bool);
  defs.register('gt', [Types.any, Types.any], Types.bool);
  defs.register('lte', [Types.any, Types.any], Types.bool);
  defs.register('gte', [Types.any, Types.any], Types.bool);
  defs.register('eq', [Types.any, Types.any], Types.bool);
  defs.register('neq', [Types.any, Types.any], Types.bool);

  // ============================================
  // Logical operators -> bool
  // ============================================
  defs.register('and', [Types.any, Types.any], Types.bool);
  defs.register('or', [Types.any, Types.any], Types.bool);

  // ============================================
  // Unary operators
  // ============================================
  defs.register('neg', [Types.int], Types.int);
  defs.register('neg', [Types.float], Types.float);
  defs.register('pos', [Types.int], Types.int);
  defs.register('pos', [Types.float], Types.float);
  defs.register('not', [Types.bool], Types.bool);
  // Note: not(any) returns any to match old behavior (unknown operand = unknown result)

  // ============================================
  // Numeric functions
  // ============================================
  defs.register('abs', [Types.int], Types.int);
  defs.register('abs', [Types.float], Types.float);
  defs.register('round', [Types.int], Types.int);
  defs.register('round', [Types.float], Types.int);
  // round(x, digits) keeps a fractional part, so it is a Float
  defs.register('round', [Types.int, Types.int], Types.float);
  defs.register('round', [Types.float, Types.int], Types.float);
  defs.register('floor', [Types.int], Types.int);
  defs.register('floor', [Types.float], Types.int);
  defs.register('ceil', [Types.int], Types.int);
  defs.register('ceil', [Types.float], Types.int);

  // ============================================
  // Duration unit conversion (-> float)
  // ============================================
  defs.register('inYears', [Types.duration], Types.float);
  defs.register('inQuarters', [Types.duration], Types.float);
  defs.register('inMonths', [Types.duration], Types.float);
  defs.register('inWeeks', [Types.duration], Types.float);
  defs.register('inDays', [Types.duration], Types.float);
  defs.register('inHours', [Types.duration], Types.float);
  defs.register('inMinutes', [Types.duration], Types.float);
  defs.register('inSeconds', [Types.duration], Types.float);

  // ============================================
  // Temporal component extraction (-> int)
  // ============================================
  defs.register('year', [Types.date], Types.int);
  defs.register('year', [Types.datetime], Types.int);
  defs.register('month', [Types.date], Types.int);
  defs.register('month', [Types.datetime], Types.int);
  defs.register('day', [Types.date], Types.int);
  defs.register('day', [Types.datetime], Types.int);
  defs.register('hour', [Types.datetime], Types.int);
  defs.register('minute', [Types.datetime], Types.int);

  // ============================================
  // String functions
  // ============================================
  defs.register('length', [Types.string], Types.int);
  defs.register('upper', [Types.string], Types.string);
  defs.register('lower', [Types.string], Types.string);
  defs.register('trim', [Types.string], Types.string);
  defs.register('trimStart', [Types.string], Types.string);
  defs.register('trimEnd', [Types.string], Types.string);
  defs.register('reverse', [Types.string], Types.string);
  defs.register('isBlank', [Types.string], Types.bool);
  defs.register('split', [Types.string, Types.string], Types.array);
  defs.register('startsWith', [Types.string, Types.string], Types.bool);
  defs.register('endsWith', [Types.string, Types.string], Types.bool);
  defs.register('contains', [Types.string, Types.string], Types.bool);
  defs.register('isEmpty', [Types.string], Types.bool);
  defs.register('substring', [Types.string, Types.int, Types.int], Types.string);
  defs.register('slice', [Types.string, Types.int, Types.int], Types.string);
  defs.register('chr', [Types.int], Types.string);
  defs.register('concat', [Types.string, Types.string], Types.string);
  defs.register('indexOf', [Types.string, Types.string], Types.any); // Int or null
  defs.register('replace', [Types.string, Types.string, Types.string], Types.string);
  defs.register('replaceAll', [Types.string, Types.string, Types.string], Types.string);
  defs.register('padStart', [Types.string, Types.int, Types.string], Types.string);
  defs.register('padEnd', [Types.string, Types.int, Types.string], Types.string);

  // ============================================
  // String extraction
  // ============================================
  defs.register('extract', [Types.string, Types.string], Types.object); // returns object with null fields on no match

  // ============================================
  // Array functions
  // ============================================
  defs.register('length', [Types.array], Types.int);
  defs.register('count', [Types.array], Types.int);
  defs.register('sum', [Types.array], Types.any);
  defs.register('sum', [Types.array, Types.any], Types.any);
  defs.register('at', [Types.array, Types.int], Types.any);
  defs.register('first', [Types.array], Types.any);
  defs.register('last', [Types.array], Types.any);
  defs.register('isEmpty', [Types.array], Types.bool);
  defs.register('map', [Types.array, Types.fn], Types.array);
  defs.register('filter', [Types.array, Types.fn], Types.array);
  defs.register('reduce', [Types.array, Types.any, Types.fn], Types.any);
  defs.register('any', [Types.array, Types.fn], Types.bool);
  defs.register('all', [Types.array, Types.fn], Types.bool);
  defs.register('find', [Types.array, Types.fn], Types.any); // element, or null
  defs.register('sortBy', [Types.array, Types.fn], Types.array);
  defs.register('sort', [Types.array], Types.array);
  defs.register('reverse', [Types.array], Types.array);
  defs.register('unique', [Types.array], Types.array);
  defs.register('flat', [Types.array], Types.array);
  defs.register('join', [Types.array, Types.string], Types.string);
  defs.register('contains', [Types.array, Types.any], Types.bool);
  // Mean of a numeric list: Float even for a list of Ints (avg([1,2]) is 1.5)
  defs.register('avg', [Types.array], Types.float);
  // Element types are unknown, so the extremum of a list is too
  defs.register('min', [Types.array], Types.any);
  defs.register('max', [Types.array], Types.any);

  // ============================================
  // Extrema (two-argument form)
  // ============================================
  // min/max pick one of their two operands, so a pair of the same orderable
  // type yields that type. Strings, dates, datetimes and durations compare
  // just as well as numbers do.
  for (const fn of ['min', 'max']) {
    defs.register(fn, [Types.int, Types.int], Types.int);
    defs.register(fn, [Types.int, Types.float], Types.float);
    defs.register(fn, [Types.float, Types.int], Types.float);
    defs.register(fn, [Types.float, Types.float], Types.float);
    for (const t of [Types.string, Types.date, Types.datetime, Types.duration]) {
      defs.register(fn, [t, t], t);
    }
  }

  // ============================================
  // Object functions
  // ============================================
  // Only declared on objects. Declaring (Any, Any) would claim that any two
  // values merge: the checker would accept `merge(1, 2)`, JavaScript and Ruby
  // would emit it, and Python would refuse to compile it. An `Any` argument is
  // still accepted — the checker suppresses what it cannot know — but a
  // concrete non-object is now reported.
  defs.register('merge', [Types.object, Types.object], Types.object);
  defs.register('deepMerge', [Types.object, Types.object], Types.object);

  // ============================================
  // Data navigation
  // ============================================
  // fetch(data, key|path|[path]) reaches into data, so the result is unknown;
  // fetch(data, {shape}) rebuilds a tuple and is therefore an object.
  defs.register('fetch', [Types.any, Types.string], Types.any);
  defs.register('fetch', [Types.any, Types.fn], Types.any);
  defs.register('fetch', [Types.any, Types.array], Types.any);
  defs.register('fetch', [Types.any, Types.object], Types.object);
  // patch(data, path, value) returns data of the same shape as its input
  defs.register('patch', [Types.any, Types.fn, Types.any], Types.any);

  // ============================================
  // Assert function -> bool
  // ============================================
  // Declared on Bool only, for the same reason as merge: `assert(Any)` made
  // `assert(1)` type-check while Python refuses to compile it — and asserting a
  // non-condition is a mistake in any case. An `Any` argument still passes.
  defs.register('assert', [Types.bool], Types.bool);
  defs.register('assert', [Types.bool, Types.string], Types.bool);
  defs.register('assertFails', [Types.fn], Types.bool);

  // ============================================
  // Type introspection -> string
  // ============================================
  defs.register('typeOf', [Types.any], Types.string);

  // ============================================
  // Null handling
  // ============================================
  // isNull(x) - returns true if x is null/undefined/nil
  defs.register('isNull', [Types.any], Types.bool);
  // isNotNull(x) - returns true if x is not null/undefined/nil
  defs.register('isNotNull', [Types.any], Types.bool);

  // ============================================
  // Error handling
  // ============================================
  // fail(message) - throws an error with the given message (never returns)
  defs.register('fail', [Types.string], Types.any);

  // ============================================
  // Type selectors (information contracts)
  // ============================================
  // A selector is total-or-raise: it either yields a value of the selected
  // type or it fails. So `Int(x)` is an Int whatever x was — there is no
  // null-on-failure case to be conservative about. Typing these as `any` was
  // the single biggest source of lost type information.
  // Registering the `any` signature alone is enough: lookup generalizes a
  // concrete argument to `any`, so Int(String), Int(Float), … all resolve here.
  const selectors: Array<[string, EloType]> = [
    ['Int', Types.int],
    ['Float', Types.float],
    ['Bool', Types.bool],
    ['Date', Types.date],
    ['Datetime', Types.datetime],
    ['Duration', Types.duration],
    ['String', Types.string],
  ];
  for (const [name, resultType] of selectors) {
    defs.register(name, [Types.any], resultType);
  }

  // Data(x) - plain-data contract; the shape it yields is not known statically
  defs.register('Data', [Types.array], Types.array);
  defs.register('Data', [Types.object], Types.object);
  defs.register('Data', [Types.any], Types.any);

  // Interval({start: Datetime, end: Datetime}) - construct an Interval
  defs.register('Interval', [Types.interval], Types.interval);
  defs.register('Interval', [Types.object], Types.interval);
  defs.register('Interval', [Types.any], Types.interval);

  // Interval accessors
  defs.register('start', [Types.interval], Types.datetime);
  defs.register('end', [Types.interval], Types.datetime);

  // Interval arithmetic
  defs.register('union', [Types.interval, Types.interval], Types.interval);
  defs.register('intersection', [Types.interval, Types.interval], Types.interval);

  // Duration(Interval) - get the length of an interval
  defs.register('Duration', [Types.interval], Types.duration);

  // Fallback: unknown functions return any
  defs.registerFallback(() => Types.any);

  return defs;
}

/**
 * Default type definitions instance
 */
export const eloTypeDefs = createTypeDefs();
