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

  // ============================================
  // Period boundary functions (datetime -> datetime)
  // ============================================
  const periodBoundaryFns = [
    'start_of_day', 'end_of_day',
    'start_of_week', 'end_of_week',
    'start_of_month', 'end_of_month',
    'start_of_quarter', 'end_of_quarter',
    'start_of_year', 'end_of_year',
  ];
  for (const fn of periodBoundaryFns) {
    defs.register(fn, [Types.datetime], Types.datetime);
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
  defs.register('pow', [Types.int, Types.int], Types.int);

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

  // duration + duration -> duration
  defs.register('add', [Types.duration, Types.duration], Types.duration);
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
  // String functions
  // ============================================
  defs.register('length', [Types.string], Types.int);
  defs.register('upper', [Types.string], Types.string);
  defs.register('lower', [Types.string], Types.string);
  defs.register('trim', [Types.string], Types.string);
  defs.register('startsWith', [Types.string, Types.string], Types.bool);
  defs.register('endsWith', [Types.string, Types.string], Types.bool);
  defs.register('contains', [Types.string, Types.string], Types.bool);
  defs.register('isEmpty', [Types.string], Types.bool);
  defs.register('substring', [Types.string, Types.int, Types.int], Types.string);
  defs.register('concat', [Types.string, Types.string], Types.string);
  defs.register('indexOf', [Types.string, Types.string], Types.any); // Int or NoVal
  defs.register('replace', [Types.string, Types.string, Types.string], Types.string);
  defs.register('replaceAll', [Types.string, Types.string, Types.string], Types.string);
  defs.register('padStart', [Types.string, Types.int, Types.string], Types.string);
  defs.register('padEnd', [Types.string, Types.int, Types.string], Types.string);

  // ============================================
  // Assert function -> bool
  // ============================================
  defs.register('assert', [Types.bool], Types.bool);
  defs.register('assert', [Types.bool, Types.string], Types.bool);
  defs.register('assert', [Types.any], Types.bool);
  defs.register('assert', [Types.any, Types.string], Types.bool);

  // ============================================
  // Range membership functions -> bool
  // ============================================
  defs.register('in_range_inclusive', [Types.any, Types.any, Types.any], Types.bool);
  defs.register('in_range_exclusive', [Types.any, Types.any, Types.any], Types.bool);

  // ============================================
  // Type introspection -> string
  // ============================================
  defs.register('typeOf', [Types.any], Types.string);

  // ============================================
  // Null handling
  // ============================================
  // isVal(x) - returns true if x is a real value (not null/undefined/nil)
  defs.register('isVal', [Types.any], Types.bool);
  // orVal(x, default) - returns x if it's a value, otherwise returns default
  defs.register('orVal', [Types.any, Types.any], Types.any);

  // Fallback: unknown functions return any
  defs.registerFallback(() => Types.any);

  return defs;
}

/**
 * Default type definitions instance
 */
export const eloTypeDefs = createTypeDefs();
