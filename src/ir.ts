/**
 * Intermediate Representation (IR) for Elo
 *
 * The IR is a typed representation of Elo expressions where:
 * - Literals carry their type explicitly
 * - Operators are replaced by typed function calls
 * - Temporal keywords are replaced by function calls
 *
 * This allows target compilers to generate optimal code based on types.
 */

import { EloType, Types } from './types';

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
  | IRObjectLiteral
  | IRVariable
  | IRCall
  | IRApply
  | IRLet
  | IRMemberAccess
  | IRIf
  | IRLambda
  | IRPredicate;

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
 * Object literal property
 */
export interface IRObjectProperty {
  key: string;
  value: IRExpr;
}

/**
 * Object literal: {key: value, ...}
 */
export interface IRObjectLiteral {
  type: 'object_literal';
  properties: IRObjectProperty[];
}

/**
 * Variable reference with inferred type
 */
export interface IRVariable {
  type: 'variable';
  name: string;
  inferredType: EloType;
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
  argTypes: EloType[];
  resultType: EloType;
}

/**
 * Lambda application (calling a lambda stored in a variable)
 *
 * Unlike IRCall which dispatches to stdlib functions, IRApply calls
 * a lambda expression that's been bound to a variable.
 */
export interface IRApply {
  type: 'apply';
  fn: IRExpr;  // The lambda expression or variable holding a lambda
  args: IRExpr[];
  argTypes: EloType[];
  resultType: EloType;
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
 * Lambda parameter with inferred type
 */
export interface IRLambdaParam {
  name: string;
  inferredType: EloType;
}

/**
 * Lambda expression: fn( params ~> body )
 */
export interface IRLambda {
  type: 'lambda';
  params: IRLambdaParam[];
  body: IRExpr;
  resultType: EloType;  // Type of the body
}

/**
 * Predicate expression: fn( params | body )
 * A predicate always returns a boolean.
 */
export interface IRPredicate {
  type: 'predicate';
  params: IRLambdaParam[];
  body: IRExpr;
  // Result type is always boolean for predicates
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

export function irObject(properties: IRObjectProperty[]): IRObjectLiteral {
  return { type: 'object_literal', properties };
}

export function irVariable(name: string, inferredType: EloType = Types.any): IRVariable {
  return { type: 'variable', name, inferredType };
}

export function irCall(fn: string, args: IRExpr[], argTypes: EloType[], resultType: EloType = Types.any): IRCall {
  return { type: 'call', fn, args, argTypes, resultType };
}

export function irApply(fn: IRExpr, args: IRExpr[], argTypes: EloType[], resultType: EloType = Types.any): IRApply {
  return { type: 'apply', fn, args, argTypes, resultType };
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

export function irLambda(params: IRLambdaParam[], body: IRExpr, resultType: EloType): IRLambda {
  return { type: 'lambda', params, body, resultType };
}

export function irPredicate(params: IRLambdaParam[], body: IRExpr): IRPredicate {
  return { type: 'predicate', params, body };
}

/**
 * Infer the type of an IR expression
 */
export function inferType(ir: IRExpr): EloType {
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
    case 'object_literal':
      return Types.object;
    case 'variable':
      return ir.inferredType;
    case 'call':
      return ir.resultType;
    case 'apply':
      return ir.resultType;
    case 'let':
      return inferType(ir.body);
    case 'member_access':
      return Types.any;
    case 'if':
      return inferType(ir.then);
    case 'lambda':
      return Types.fn;  // Lambda is a function type
    case 'predicate':
      return Types.fn;  // Predicate is also a function type (that returns bool)
  }
}
