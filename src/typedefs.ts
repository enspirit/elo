/**
 * Type Definitions for Elo
 *
 * This module defines the type signatures for Elo's stdlib functions and operators.
 * It provides a central registry for looking up result types based on function name
 * and argument types.
 *
 * This information is language-agnostic and used by the transform phase for type inference.
 */

import { EloType, Types, typeEquals } from "./types";
import { signatureKey, typeGeneralizations } from "./stdlib";

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
  private fallback: ((name: string, argTypes: EloType[]) => EloType) | null =
    null;

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
  registerFallback(
    handler: (name: string, argTypes: EloType[]) => EloType,
  ): this {
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
}

/**
 * Create the standard Elo type definitions
 */
export function createTypeDefs(): TypeDefs {
  const defs = new TypeDefs();

  // ============================================
  // Nullary functions (temporal)
  // ============================================
  defs.register("today", [], Types.date);
  defs.register("now", [], Types.datetime);

  // ============================================
  // Period boundary functions (datetime -> datetime)
  // ============================================
  const periodBoundaryFns = [
    "start_of_day",
    "end_of_day",
    "start_of_week",
    "end_of_week",
    "start_of_month",
    "end_of_month",
    "start_of_quarter",
    "end_of_quarter",
    "start_of_year",
    "end_of_year",
  ];
  for (const fn of periodBoundaryFns) {
    defs.register(fn, [Types.datetime], Types.datetime);
  }

  // ============================================
  // Arithmetic operators
  // ============================================

  // int op int -> int (except division)
  defs.register("add", [Types.int, Types.int], Types.int);
  defs.register("sub", [Types.int, Types.int], Types.int);
  defs.register("mul", [Types.int, Types.int], Types.int);
  defs.register("div", [Types.int, Types.int], Types.float); // division always returns float
  defs.register("mod", [Types.int, Types.int], Types.int);
  defs.register("pow", [Types.int, Types.int], Types.int);

  // float involved -> float
  defs.register("add", [Types.float, Types.float], Types.float);
  defs.register("sub", [Types.float, Types.float], Types.float);
  defs.register("mul", [Types.float, Types.float], Types.float);
  defs.register("div", [Types.float, Types.float], Types.float);
  defs.register("mod", [Types.float, Types.float], Types.float);
  defs.register("pow", [Types.float, Types.float], Types.float);

  defs.register("add", [Types.int, Types.float], Types.float);
  defs.register("sub", [Types.int, Types.float], Types.float);
  defs.register("mul", [Types.int, Types.float], Types.float);
  defs.register("div", [Types.int, Types.float], Types.float);
  defs.register("mod", [Types.int, Types.float], Types.float);
  defs.register("pow", [Types.int, Types.float], Types.float);

  defs.register("add", [Types.float, Types.int], Types.float);
  defs.register("sub", [Types.float, Types.int], Types.float);
  defs.register("mul", [Types.float, Types.int], Types.float);
  defs.register("div", [Types.float, Types.int], Types.float);
  defs.register("mod", [Types.float, Types.int], Types.float);
  defs.register("pow", [Types.float, Types.int], Types.float);

  // String concatenation
  defs.register("add", [Types.string, Types.string], Types.string);

  // String multiplication (repeat)
  defs.register("mul", [Types.string, Types.int], Types.string);
  defs.register("mul", [Types.int, Types.string], Types.string);

  // List concatenation
  defs.register("add", [Types.array, Types.array], Types.array);

  // ============================================
  // Temporal arithmetic
  // ============================================

  // date + duration -> date
  defs.register("add", [Types.date, Types.duration], Types.date);
  // date - duration -> date
  defs.register("sub", [Types.date, Types.duration], Types.date);
  // date - date -> duration
  defs.register("sub", [Types.date, Types.date], Types.duration);

  // datetime + duration -> datetime
  defs.register("add", [Types.datetime, Types.duration], Types.datetime);
  // datetime - duration -> datetime
  defs.register("sub", [Types.datetime, Types.duration], Types.datetime);

  // duration + duration -> duration
  defs.register("add", [Types.duration, Types.duration], Types.duration);
  // duration + date -> date (commutative)
  defs.register("add", [Types.duration, Types.date], Types.date);
  // duration + datetime -> datetime (commutative)
  defs.register("add", [Types.duration, Types.datetime], Types.datetime);

  // duration * number -> duration (scaling)
  defs.register("mul", [Types.duration, Types.int], Types.duration);
  defs.register("mul", [Types.duration, Types.float], Types.duration);
  defs.register("mul", [Types.int, Types.duration], Types.duration);
  defs.register("mul", [Types.float, Types.duration], Types.duration);

  // duration / number -> duration (scaling)
  defs.register("div", [Types.duration, Types.int], Types.duration);
  defs.register("div", [Types.duration, Types.float], Types.duration);

  // ============================================
  // Comparison operators -> bool
  // ============================================
  defs.register("lt", [Types.any, Types.any], Types.bool);
  defs.register("gt", [Types.any, Types.any], Types.bool);
  defs.register("lte", [Types.any, Types.any], Types.bool);
  defs.register("gte", [Types.any, Types.any], Types.bool);
  defs.register("eq", [Types.any, Types.any], Types.bool);
  defs.register("neq", [Types.any, Types.any], Types.bool);

  // ============================================
  // Logical operators -> bool
  // ============================================
  defs.register("and", [Types.any, Types.any], Types.bool);
  defs.register("or", [Types.any, Types.any], Types.bool);

  // ============================================
  // Unary operators
  // ============================================
  defs.register("neg", [Types.int], Types.int);
  defs.register("neg", [Types.float], Types.float);
  defs.register("pos", [Types.int], Types.int);
  defs.register("pos", [Types.float], Types.float);
  defs.register("not", [Types.bool], Types.bool);
  // Note: not(any) returns any to match old behavior (unknown operand = unknown result)

  // ============================================
  // Numeric functions
  // ============================================
  defs.register("abs", [Types.int], Types.int);
  defs.register("abs", [Types.float], Types.float);
  defs.register("round", [Types.int], Types.int);
  defs.register("round", [Types.float], Types.int);
  defs.register("floor", [Types.int], Types.int);
  defs.register("floor", [Types.float], Types.int);
  defs.register("ceil", [Types.int], Types.int);
  defs.register("ceil", [Types.float], Types.int);

  // ============================================
  // Duration unit conversion (-> float)
  // ============================================
  defs.register("inYears", [Types.duration], Types.float);
  defs.register("inQuarters", [Types.duration], Types.float);
  defs.register("inMonths", [Types.duration], Types.float);
  defs.register("inWeeks", [Types.duration], Types.float);
  defs.register("inDays", [Types.duration], Types.float);
  defs.register("inHours", [Types.duration], Types.float);
  defs.register("inMinutes", [Types.duration], Types.float);
  defs.register("inSeconds", [Types.duration], Types.float);

  // ============================================
  // Temporal component extraction (-> int)
  // ============================================
  defs.register("year", [Types.date], Types.int);
  defs.register("year", [Types.datetime], Types.int);
  defs.register("month", [Types.date], Types.int);
  defs.register("month", [Types.datetime], Types.int);
  defs.register("day", [Types.date], Types.int);
  defs.register("day", [Types.datetime], Types.int);
  defs.register("hour", [Types.datetime], Types.int);
  defs.register("minute", [Types.datetime], Types.int);

  // ============================================
  // String functions
  // ============================================
  defs.register("length", [Types.string], Types.int);
  defs.register("upper", [Types.string], Types.string);
  defs.register("lower", [Types.string], Types.string);
  defs.register("trim", [Types.string], Types.string);
  defs.register("startsWith", [Types.string, Types.string], Types.bool);
  defs.register("endsWith", [Types.string, Types.string], Types.bool);
  defs.register("contains", [Types.string, Types.string], Types.bool);
  defs.register("isEmpty", [Types.string], Types.bool);
  defs.register(
    "substring",
    [Types.string, Types.int, Types.int],
    Types.string,
  );
  defs.register("concat", [Types.string, Types.string], Types.string);
  defs.register("indexOf", [Types.string, Types.string], Types.any); // Int or null
  defs.register(
    "replace",
    [Types.string, Types.string, Types.string],
    Types.string,
  );
  defs.register(
    "replaceAll",
    [Types.string, Types.string, Types.string],
    Types.string,
  );
  defs.register(
    "padStart",
    [Types.string, Types.int, Types.string],
    Types.string,
  );
  defs.register(
    "padEnd",
    [Types.string, Types.int, Types.string],
    Types.string,
  );

  // ============================================
  // Array functions
  // ============================================
  defs.register("length", [Types.array], Types.int);
  defs.register("count", [Types.array], Types.int);
  defs.register("sum", [Types.array], Types.any);
  defs.register("sum", [Types.array, Types.any], Types.any);
  defs.register("at", [Types.array, Types.int], Types.any);
  defs.register("first", [Types.array], Types.any);
  defs.register("last", [Types.array], Types.any);
  defs.register("isEmpty", [Types.array], Types.bool);
  defs.register("map", [Types.array, Types.fn], Types.array);
  defs.register("filter", [Types.array, Types.fn], Types.array);
  defs.register("reduce", [Types.array, Types.any, Types.fn], Types.any);
  defs.register("any", [Types.array, Types.fn], Types.bool);
  defs.register("all", [Types.array, Types.fn], Types.bool);

  // ============================================
  // Assert function -> bool
  // ============================================
  defs.register("assert", [Types.bool], Types.bool);
  defs.register("assert", [Types.bool, Types.string], Types.bool);
  defs.register("assert", [Types.any], Types.bool);
  defs.register("assert", [Types.any, Types.string], Types.bool);
  defs.register("assertFails", [Types.fn], Types.bool);

  // ============================================
  // Range membership functions -> bool
  // ============================================
  defs.register(
    "in_range_inclusive",
    [Types.any, Types.any, Types.any],
    Types.bool,
  );
  defs.register(
    "in_range_exclusive",
    [Types.any, Types.any, Types.any],
    Types.bool,
  );

  // ============================================
  // Type introspection -> string
  // ============================================
  defs.register("typeOf", [Types.any], Types.string);

  // ============================================
  // Null handling
  // ============================================
  // isNull(x) - returns true if x is null/undefined/nil
  defs.register("isNull", [Types.any], Types.bool);

  // ============================================
  // Error handling
  // ============================================
  // fail(message) - throws an error with the given message (never returns)
  defs.register("fail", [Types.string], Types.any);

  // ============================================
  // Type selectors (information contracts)
  // ============================================
  // Int(x) - coerce to Int, returns null on failure
  defs.register("Int", [Types.int], Types.int);
  defs.register("Int", [Types.float], Types.int);
  defs.register("Int", [Types.string], Types.any); // may return null
  defs.register("Int", [Types.any], Types.any);

  // Float(x) - coerce to Float, returns null on failure
  defs.register("Float", [Types.float], Types.float);
  defs.register("Float", [Types.int], Types.float);
  defs.register("Float", [Types.string], Types.any); // may return null
  defs.register("Float", [Types.any], Types.any);

  // Bool(x) - coerce to Bool, returns null on failure
  defs.register("Bool", [Types.bool], Types.bool);
  defs.register("Bool", [Types.string], Types.any); // may return null
  defs.register("Bool", [Types.any], Types.any);

  // Date(x) - coerce to Date, returns null on failure
  defs.register("Date", [Types.date], Types.date);
  defs.register("Date", [Types.string], Types.any); // may return null
  defs.register("Date", [Types.any], Types.any);

  // Datetime(x) - coerce to Datetime, returns null on failure
  defs.register("Datetime", [Types.datetime], Types.datetime);
  defs.register("Datetime", [Types.string], Types.any); // may return null
  defs.register("Datetime", [Types.any], Types.any);

  // Duration(x) - coerce to Duration, returns null on failure
  defs.register("Duration", [Types.duration], Types.duration);
  defs.register("Duration", [Types.string], Types.any); // may return null
  defs.register("Duration", [Types.any], Types.any);

  // Interval({start: Datetime, end: Datetime}) - construct an Interval
  defs.register("Interval", [Types.interval], Types.interval);
  defs.register("Interval", [Types.object], Types.interval);
  defs.register("Interval", [Types.any], Types.interval);

  // Interval accessors
  defs.register("start", [Types.interval], Types.datetime);
  defs.register("end", [Types.interval], Types.datetime);

  // Fallback: unknown functions return any
  defs.registerFallback(() => Types.any);

  return defs;
}

/**
 * Default type definitions instance
 */
export const eloTypeDefs = createTypeDefs();
