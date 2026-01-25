/**
 * Standard Library for Elo
 *
 * Provides a type-based dispatch system for function implementations.
 * Each target compiler (JS, Ruby, SQL) defines its own implementations
 * that are looked up by function name and argument types.
 */

import { EloType, Types, typeName, typeEquals } from "./types";
import { IRExpr } from "./ir";

/**
 * A function signature: name + argument types
 */
export interface FunctionSignature {
  name: string;
  argTypes: EloType[];
}

/**
 * Create a signature key for lookup
 * e.g., "add:int,int" or "neg:float"
 */
export function signatureKey(name: string, argTypes: EloType[]): string {
  const typeNames = argTypes.map(typeName).join(",");
  return typeNames ? `${name}:${typeNames}` : name;
}

/**
 * Format a function signature for user-friendly error messages
 * e.g., "foo(Int, String)" or "upper(Any)"
 */
export function formatSignature(name: string, argTypes: EloType[]): string {
  const typeNames = argTypes
    .map((t) => typeName(t).charAt(0).toUpperCase() + typeName(t).slice(1))
    .join(", ");
  return `${name}(${typeNames})`;
}

/**
 * Generate all generalizations of argument types by progressively replacing
 * concrete types with 'any'. Returns type arrays in order from most specific
 * to most general.
 *
 * For [int, float]: returns [int,float], [any,float], [int,any], [any,any]
 * Types that are already 'any' don't generate additional combinations.
 */
export function typeGeneralizations(argTypes: EloType[]): EloType[][] {
  if (argTypes.length === 0) return [[]];

  // Find indices of non-any types
  const concreteIndices: number[] = [];
  for (let i = 0; i < argTypes.length; i++) {
    if (!typeEquals(argTypes[i], Types.any)) {
      concreteIndices.push(i);
    }
  }

  // Generate all subsets of concrete indices to replace with 'any'
  // Start with empty subset (most specific) to full subset (most general)
  const result: EloType[][] = [];
  const numSubsets = 1 << concreteIndices.length;

  for (let mask = 0; mask < numSubsets; mask++) {
    const generalized = [...argTypes];
    for (let i = 0; i < concreteIndices.length; i++) {
      if (mask & (1 << i)) {
        generalized[concreteIndices[i]] = Types.any;
      }
    }
    result.push(generalized);
  }

  return result;
}

/**
 * Context passed to emitters for recursive emission
 */
export interface EmitContext<T> {
  emit: (ir: IRExpr) => T;
  emitWithParens: (ir: IRExpr, parentOp: string, side: "left" | "right") => T;
  /** Track a required helper function (e.g., 'kAdd', 'kSub') */
  requireHelper?: (name: string) => void;
}

/**
 * A function implementation that emits code for a specific signature
 */
export type FunctionEmitter<T> = (args: IRExpr[], ctx: EmitContext<T>) => T;

/**
 * A library of function implementations for a target language
 */
export class StdLib<T> {
  private implementations: Map<string, FunctionEmitter<T>> = new Map();
  private fallback:
    | ((
        name: string,
        args: IRExpr[],
        argTypes: EloType[],
        ctx: EmitContext<T>,
      ) => T)
    | null = null;

  /**
   * Register an implementation for a specific signature
   */
  register(
    name: string,
    argTypes: EloType[],
    emitter: FunctionEmitter<T>,
  ): this {
    const key = signatureKey(name, argTypes);
    this.implementations.set(key, emitter);
    return this;
  }

  /**
   * Register a fallback for unmatched signatures
   */
  registerFallback(
    handler: (
      name: string,
      args: IRExpr[],
      argTypes: EloType[],
      ctx: EmitContext<T>,
    ) => T,
  ): this {
    this.fallback = handler;
    return this;
  }

  /**
   * Look up an implementation by signature.
   * Tries progressively more general type signatures before giving up.
   * For example, for add(int, float), tries:
   *   add(int, float) -> add(any, float) -> add(int, any) -> add(any, any)
   *
   * If any argument type is 'any' and no match is found through generalization,
   * falls back to finding any implementation with matching name and arity.
   * This allows functions like abs(any) to find abs(int) or abs(float).
   */
  lookup(name: string, argTypes: EloType[]): FunctionEmitter<T> | undefined {
    // First try typeGeneralizations (concrete → any)
    for (const generalized of typeGeneralizations(argTypes)) {
      const key = signatureKey(name, generalized);
      const impl = this.implementations.get(key);
      if (impl) return impl;
    }

    // If any argument type is 'any', try to find any implementation with matching arity
    // This is the "type specialization" fallback for dynamically-typed contexts
    if (argTypes.some((t) => typeEquals(t, Types.any))) {
      const arity = argTypes.length;
      for (const [key, impl] of this.implementations) {
        // Check if key matches: "name:type1,type2,..." or just "name" for nullary
        const colonIdx = key.indexOf(":");
        const keyName = colonIdx === -1 ? key : key.substring(0, colonIdx);
        if (keyName !== name) continue;

        // Check arity matches
        const keyArity =
          colonIdx === -1 ? 0 : key.substring(colonIdx + 1).split(",").length;
        if (keyArity === arity) {
          return impl;
        }
      }
    }

    return undefined;
  }

  /**
   * Emit code for a function call
   */
  emit(
    name: string,
    args: IRExpr[],
    argTypes: EloType[],
    ctx: EmitContext<T>,
  ): T {
    const impl = this.lookup(name, argTypes);
    if (impl) {
      return impl(args, ctx);
    }
    if (this.fallback) {
      return this.fallback(name, args, argTypes, ctx);
    }
    throw new Error(`Unknown function ${formatSignature(name, argTypes)}`);
  }
}

/**
 * Helper to create a binary operator emitter
 */
export function binaryOp<T>(
  op: string,
  format: (left: T, right: T) => T,
): FunctionEmitter<T> {
  return (args, ctx) => {
    const left = ctx.emitWithParens(args[0], op, "left");
    const right = ctx.emitWithParens(args[1], op, "right");
    return format(left, right);
  };
}

/**
 * Helper to create a simple binary operator that just joins with the operator
 */
export function simpleBinaryOp(op: string): FunctionEmitter<string> {
  return binaryOp(op, (left, right) => `${left} ${op} ${right}`);
}

/**
 * Helper to create a unary operator emitter
 */
export function unaryOp<T>(
  format: (operand: T, needsParens: boolean) => T,
  needsParensCheck: (arg: IRExpr) => boolean,
): FunctionEmitter<T> {
  return (args, ctx) => {
    const operand = ctx.emit(args[0]);
    const needsParens = needsParensCheck(args[0]);
    return format(operand, needsParens);
  };
}

/**
 * Helper for method call style: arg0.method(arg1)
 */
export function methodCall(method: string): FunctionEmitter<string> {
  return (args, ctx) => {
    const obj = ctx.emit(args[0]);
    const arg = ctx.emit(args[1]);
    return `${obj}.${method}(${arg})`;
  };
}

/**
 * Helper for nullary function (no args)
 */
export function nullary<T>(value: T): FunctionEmitter<T> {
  return () => value;
}

/**
 * Helper for unary method call: arg0.method()
 */
export function unaryMethod(method: string): FunctionEmitter<string> {
  return (args, ctx) => `${ctx.emit(args[0])}.${method}`;
}

/**
 * Check if an IR expression is a binary operation (needs parens for postfix method calls)
 */
export function isBinaryOp(ir: IRExpr): boolean {
  if (ir.type !== "call") return false;
  const binaryOps = [
    "add",
    "sub",
    "mul",
    "div",
    "mod",
    "pow",
    "lt",
    "gt",
    "lte",
    "gte",
    "eq",
    "neq",
    "and",
    "or",
  ];
  return binaryOps.includes(ir.fn);
}

/**
 * Helper for Ruby-style postfix method call that wraps binary expressions in parens.
 * Use for: arg0.method() where Ruby's precedence requires parens around binary ops.
 */
export function rubyMethod(method: string): FunctionEmitter<string> {
  return (args, ctx) => {
    const emitted = ctx.emit(args[0]);
    const needsParens = isBinaryOp(args[0]);
    return needsParens ? `(${emitted}).${method}` : `${emitted}.${method}`;
  };
}

/**
 * Helper for function call style: fn(arg0, arg1, ...)
 */
export function fnCall(fnName: string): FunctionEmitter<string> {
  return (args, ctx) => {
    const emittedArgs = args.map((a) => ctx.emit(a)).join(", ");
    return `${fnName}(${emittedArgs})`;
  };
}

/**
 * Helper for runtime helper function call (tracks the helper as required)
 * Used for dynamically-typed operations that need runtime support.
 */
export function helperCall(helperName: string): FunctionEmitter<string> {
  return (args, ctx) => {
    ctx.requireHelper?.(helperName);
    const emittedArgs = args.map((a) => ctx.emit(a)).join(", ");
    return `${helperName}(${emittedArgs})`;
  };
}
