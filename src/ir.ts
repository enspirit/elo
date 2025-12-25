/**
 * Intermediate Representation (IR) for Klang
 *
 * The IR is a typed representation of Klang expressions where:
 * - Literals carry their type explicitly
 * - Operators are replaced by typed function calls
 * - Temporal keywords are replaced by function calls
 *
 * This allows target compilers to generate optimal code based on types.
 */

import { KlangType, Types } from './types';

/**
 * IR expression types
 */
export type IRExpr =
  | IRIntLiteral
  | IRFloatLiteral
  | IRBoolLiteral
  | IRStringLiteral
  | IRDateLiteral
  | IRDateTimeLiteral
  | IRDurationLiteral
  | IRVariable
  | IRCall
  | IRLet
  | IRMemberAccess
  | IRIf;

/**
 * Integer literal
 */
export interface IRIntLiteral {
  type: 'int_literal';
  value: number;
}

/**
 * Float literal
 */
export interface IRFloatLiteral {
  type: 'float_literal';
  value: number;
}

/**
 * Boolean literal
 */
export interface IRBoolLiteral {
  type: 'bool_literal';
  value: boolean;
}

/**
 * String literal
 */
export interface IRStringLiteral {
  type: 'string_literal';
  value: string;
}

/**
 * Date literal (ISO8601 date)
 */
export interface IRDateLiteral {
  type: 'date_literal';
  value: string;
}

/**
 * DateTime literal (ISO8601 datetime)
 */
export interface IRDateTimeLiteral {
  type: 'datetime_literal';
  value: string;
}

/**
 * Duration literal (ISO8601 duration)
 */
export interface IRDurationLiteral {
  type: 'duration_literal';
  value: string;
}

/**
 * Variable reference with inferred type
 */
export interface IRVariable {
  type: 'variable';
  name: string;
  inferredType: KlangType;
}

/**
 * Function call (includes operators rewritten as functions)
 *
 * The fn field contains a simple function name (e.g., 'add', 'sub', 'mul')
 * rather than a type-mangled name. The argTypes array provides the types
 * of each argument, allowing compilers to dispatch to the correct implementation.
 */
export interface IRCall {
  type: 'call';
  fn: string;
  args: IRExpr[];
  argTypes: KlangType[];
  resultType: KlangType;
}

/**
 * Let binding
 */
export interface IRLetBinding {
  name: string;
  value: IRExpr;
}

/**
 * Let expression
 */
export interface IRLet {
  type: 'let';
  bindings: IRLetBinding[];
  body: IRExpr;
}

/**
 * Member access (dot notation)
 */
export interface IRMemberAccess {
  type: 'member_access';
  object: IRExpr;
  property: string;
}

/**
 * If expression: if condition then consequent else alternative
 */
export interface IRIf {
  type: 'if';
  condition: IRExpr;
  then: IRExpr;
  else: IRExpr;
}

/**
 * Factory functions for creating IR nodes
 */

export function irInt(value: number): IRIntLiteral {
  return { type: 'int_literal', value };
}

export function irFloat(value: number): IRFloatLiteral {
  return { type: 'float_literal', value };
}

export function irBool(value: boolean): IRBoolLiteral {
  return { type: 'bool_literal', value };
}

export function irString(value: string): IRStringLiteral {
  return { type: 'string_literal', value };
}

export function irDate(value: string): IRDateLiteral {
  return { type: 'date_literal', value };
}

export function irDateTime(value: string): IRDateTimeLiteral {
  return { type: 'datetime_literal', value };
}

export function irDuration(value: string): IRDurationLiteral {
  return { type: 'duration_literal', value };
}

export function irVariable(name: string, inferredType: KlangType = Types.any): IRVariable {
  return { type: 'variable', name, inferredType };
}

export function irCall(fn: string, args: IRExpr[], argTypes: KlangType[], resultType: KlangType = Types.any): IRCall {
  return { type: 'call', fn, args, argTypes, resultType };
}

export function irLet(bindings: IRLetBinding[], body: IRExpr): IRLet {
  return { type: 'let', bindings, body };
}

export function irMemberAccess(object: IRExpr, property: string): IRMemberAccess {
  return { type: 'member_access', object, property };
}

export function irIf(condition: IRExpr, thenBranch: IRExpr, elseBranch: IRExpr): IRIf {
  return { type: 'if', condition, then: thenBranch, else: elseBranch };
}

/**
 * Infer the type of an IR expression
 */
export function inferType(ir: IRExpr): KlangType {
  switch (ir.type) {
    case 'int_literal':
      return Types.int;
    case 'float_literal':
      return Types.float;
    case 'bool_literal':
      return Types.bool;
    case 'string_literal':
      return Types.string;
    case 'date_literal':
      return Types.date;
    case 'datetime_literal':
      return Types.datetime;
    case 'duration_literal':
      return Types.duration;
    case 'variable':
      return ir.inferredType;
    case 'call':
      return ir.resultType;
    case 'let':
      return inferType(ir.body);
    case 'member_access':
      return Types.any;
    case 'if':
      return inferType(ir.then);
  }
}
