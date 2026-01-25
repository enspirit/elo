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

import { EloType, Types } from "./types";

/**
 * IR expression types
 */
export type IRExpr =
  | IRIntLiteral
  | IRFloatLiteral
  | IRBoolLiteral
  | IRNullLiteral
  | IRStringLiteral
  | IRDateLiteral
  | IRDateTimeLiteral
  | IRDurationLiteral
  | IRObjectLiteral
  | IRArrayLiteral
  | IRVariable
  | IRCall
  | IRApply
  | IRLet
  | IRMemberAccess
  | IRIf
  | IRLambda
  | IRAlternative
  | IRDataPath
  | IRTypeDef
  | IRGuard;

/**
 * Integer literal
 */
export interface IRIntLiteral {
  type: "int_literal";
  value: number;
}

/**
 * Float literal
 */
export interface IRFloatLiteral {
  type: "float_literal";
  value: number;
}

/**
 * Boolean literal
 */
export interface IRBoolLiteral {
  type: "bool_literal";
  value: boolean;
}

/**
 * Null literal
 */
export interface IRNullLiteral {
  type: "null_literal";
}

/**
 * String literal
 */
export interface IRStringLiteral {
  type: "string_literal";
  value: string;
}

/**
 * Date literal (ISO8601 date)
 */
export interface IRDateLiteral {
  type: "date_literal";
  value: string;
}

/**
 * DateTime literal (ISO8601 datetime)
 */
export interface IRDateTimeLiteral {
  type: "datetime_literal";
  value: string;
}

/**
 * Duration literal (ISO8601 duration)
 */
export interface IRDurationLiteral {
  type: "duration_literal";
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
  type: "object_literal";
  properties: IRObjectProperty[];
}

/**
 * Array literal: [expr, expr, ...]
 */
export interface IRArrayLiteral {
  type: "array_literal";
  elements: IRExpr[];
}

/**
 * Variable reference with inferred type
 */
export interface IRVariable {
  type: "variable";
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
  type: "call";
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
  type: "apply";
  fn: IRExpr; // The lambda expression or variable holding a lambda
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
  type: "let";
  bindings: IRLetBinding[];
  body: IRExpr;
}

/**
 * Member access (dot notation)
 */
export interface IRMemberAccess {
  type: "member_access";
  object: IRExpr;
  property: string;
}

/**
 * If expression: if condition then consequent else alternative
 */
export interface IRIf {
  type: "if";
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
  type: "lambda";
  params: IRLambdaParam[];
  body: IRExpr;
  resultType: EloType; // Type of the body
}

/**
 * Alternative expression: a | b | c
 * Evaluates alternatives left-to-right, returns first non-null value.
 */
export interface IRAlternative {
  type: "alternative";
  alternatives: IRExpr[];
  resultType: EloType;
}

/**
 * DataPath literal: .x.y.z or .items.0.name
 * A path for navigating data structures.
 * Segments can be property names (strings) or array indices (numbers).
 */
export interface IRDataPath {
  type: "datapath";
  segments: (string | number)[];
}

/**
 * IR type expression (used in type definitions)
 */
export type IRTypeExpr =
  | IRTypeRef
  | IRTypeSchema
  | IRSubtypeConstraint
  | IRArrayType
  | IRUnionType;

/**
 * Reference to a base type
 */
export interface IRTypeRef {
  kind: "type_ref";
  name: string; // 'String', 'Int', 'Bool', 'Datetime', 'Any'
}

/**
 * Object type schema
 * extras controls handling of extra attributes:
 * - undefined/'closed': extra attributes are not allowed (default)
 * - 'ignored': extra attributes are allowed but not included in output
 * - IRTypeExpr: extra attributes are allowed and must match this type
 */
export interface IRTypeSchema {
  kind: "type_schema";
  properties: IRTypeSchemaProperty[];
  extras?: "closed" | "ignored" | IRTypeExpr;
}

/**
 * A single constraint with optional label (IR version)
 */
export interface IRConstraint {
  label?: string; // Optional label: 'positive' or 'must be positive'
  condition: IRExpr; // The constraint expression transformed to IR
}

/**
 * Subtype constraint: Int(i | i > 0) or Int(i | positive: i > 0, even: i % 2 == 0)
 */
export interface IRSubtypeConstraint {
  kind: "subtype_constraint";
  baseType: IRTypeExpr;
  variable: string;
  constraints: IRConstraint[]; // One or more labeled constraints
}

/**
 * Array type: [Int]
 */
export interface IRArrayType {
  kind: "array_type";
  elementType: IRTypeExpr;
}

/**
 * Union type: Int|String
 * Tries each type in order, returns first successful parse
 */
export interface IRUnionType {
  kind: "union_type";
  types: IRTypeExpr[];
}

/**
 * Property in a type schema
 */
export interface IRTypeSchemaProperty {
  key: string;
  typeExpr: IRTypeExpr;
  optional?: boolean; // true for `name :? Type` syntax
}

/**
 * Type definition: let Person = { name: String, age: Int } in body
 */
export interface IRTypeDef {
  type: "typedef";
  name: string;
  typeExpr: IRTypeExpr;
  body: IRExpr;
}

/**
 * Guard expression: guard [label:] condition in body
 * Throws at runtime if condition is false, unless guards are stripped.
 * guardType distinguishes preconditions (guard) from postconditions (check).
 */
export interface IRGuard {
  type: "guard";
  constraints: IRConstraint[]; // One or more labeled constraints
  body: IRExpr;
  guardType: "guard" | "check"; // Semantic distinction for clarity
}

/**
 * Factory functions for creating IR nodes
 */

export function irInt(value: number): IRIntLiteral {
  return { type: "int_literal", value };
}

export function irFloat(value: number): IRFloatLiteral {
  return { type: "float_literal", value };
}

export function irBool(value: boolean): IRBoolLiteral {
  return { type: "bool_literal", value };
}

export function irNull(): IRNullLiteral {
  return { type: "null_literal" };
}

export function irString(value: string): IRStringLiteral {
  return { type: "string_literal", value };
}

export function irDate(value: string): IRDateLiteral {
  return { type: "date_literal", value };
}

export function irDateTime(value: string): IRDateTimeLiteral {
  return { type: "datetime_literal", value };
}

export function irDuration(value: string): IRDurationLiteral {
  return { type: "duration_literal", value };
}

export function irObject(properties: IRObjectProperty[]): IRObjectLiteral {
  return { type: "object_literal", properties };
}

export function irArray(elements: IRExpr[]): IRArrayLiteral {
  return { type: "array_literal", elements };
}

export function irVariable(
  name: string,
  inferredType: EloType = Types.any,
): IRVariable {
  return { type: "variable", name, inferredType };
}

export function irCall(
  fn: string,
  args: IRExpr[],
  argTypes: EloType[],
  resultType: EloType = Types.any,
): IRCall {
  return { type: "call", fn, args, argTypes, resultType };
}

export function irApply(
  fn: IRExpr,
  args: IRExpr[],
  argTypes: EloType[],
  resultType: EloType = Types.any,
): IRApply {
  return { type: "apply", fn, args, argTypes, resultType };
}

export function irLet(bindings: IRLetBinding[], body: IRExpr): IRLet {
  return { type: "let", bindings, body };
}

export function irMemberAccess(
  object: IRExpr,
  property: string,
): IRMemberAccess {
  return { type: "member_access", object, property };
}

export function irIf(
  condition: IRExpr,
  thenBranch: IRExpr,
  elseBranch: IRExpr,
): IRIf {
  return { type: "if", condition, then: thenBranch, else: elseBranch };
}

export function irLambda(
  params: IRLambdaParam[],
  body: IRExpr,
  resultType: EloType,
): IRLambda {
  return { type: "lambda", params, body, resultType };
}

export function irAlternative(
  alternatives: IRExpr[],
  resultType: EloType,
): IRAlternative {
  return { type: "alternative", alternatives, resultType };
}

export function irDataPath(segments: (string | number)[]): IRDataPath {
  return { type: "datapath", segments };
}

export function irTypeRef(name: string): IRTypeRef {
  return { kind: "type_ref", name };
}

export function irTypeSchema(
  properties: IRTypeSchemaProperty[],
  extras?: "closed" | "ignored" | IRTypeExpr,
): IRTypeSchema {
  return { kind: "type_schema", properties, extras };
}

export function irSubtypeConstraint(
  baseType: IRTypeExpr,
  variable: string,
  constraints: IRConstraint[],
): IRSubtypeConstraint {
  return { kind: "subtype_constraint", baseType, variable, constraints };
}

export function irArrayType(elementType: IRTypeExpr): IRArrayType {
  return { kind: "array_type", elementType };
}

export function irUnionType(types: IRTypeExpr[]): IRUnionType {
  return { kind: "union_type", types };
}

export function irTypeDef(
  name: string,
  typeExpr: IRTypeExpr,
  body: IRExpr,
): IRTypeDef {
  return { type: "typedef", name, typeExpr, body };
}

export function irGuard(
  constraints: IRConstraint[],
  body: IRExpr,
  guardType: "guard" | "check" = "guard",
): IRGuard {
  return { type: "guard", constraints, body, guardType };
}

/**
 * Infer the type of an IR expression
 */
export function inferType(ir: IRExpr): EloType {
  switch (ir.type) {
    case "int_literal":
      return Types.int;
    case "float_literal":
      return Types.float;
    case "bool_literal":
      return Types.bool;
    case "null_literal":
      return Types.null;
    case "string_literal":
      return Types.string;
    case "date_literal":
      return Types.date;
    case "datetime_literal":
      return Types.datetime;
    case "duration_literal":
      return Types.duration;
    case "object_literal":
      return Types.object;
    case "array_literal":
      return Types.array;
    case "variable":
      return ir.inferredType;
    case "call":
      return ir.resultType;
    case "apply":
      return ir.resultType;
    case "let":
      return inferType(ir.body);
    case "member_access":
      return Types.any;
    case "if":
      return inferType(ir.then);
    case "lambda":
      return Types.fn;
    case "alternative":
      return ir.resultType;
    case "datapath":
      return Types.fn; // DataPath is a function that takes data and returns a value

    case "typedef":
      return inferType(ir.body);

    case "guard":
      return inferType(ir.body);
  }
}

/**
 * Check if an IR expression uses the input variable `_` as a free variable.
 * This is used to determine if the compiled output needs to be wrapped
 * as a function taking `_` as a parameter.
 */
export function usesInput(
  ir: IRExpr,
  boundVars: Set<string> = new Set(),
): boolean {
  switch (ir.type) {
    case "int_literal":
    case "float_literal":
    case "bool_literal":
    case "null_literal":
    case "string_literal":
    case "date_literal":
    case "datetime_literal":
    case "duration_literal":
      return false;

    case "variable":
      return ir.name === "_" && !boundVars.has("_");

    case "object_literal":
      return ir.properties.some((p) => usesInput(p.value, boundVars));

    case "array_literal":
      return ir.elements.some((e) => usesInput(e, boundVars));

    case "member_access":
      return usesInput(ir.object, boundVars);

    case "call":
      return ir.args.some((arg) => usesInput(arg, boundVars));

    case "apply":
      return (
        usesInput(ir.fn, boundVars) ||
        ir.args.some((arg) => usesInput(arg, boundVars))
      );

    case "let": {
      // Check binding values with current bound vars
      const bindingsUseInput = ir.bindings.some((b) =>
        usesInput(b.value, boundVars),
      );
      // Add bound names for body check
      const newBound = new Set(boundVars);
      ir.bindings.forEach((b) => newBound.add(b.name));
      return bindingsUseInput || usesInput(ir.body, newBound);
    }

    case "if":
      return (
        usesInput(ir.condition, boundVars) ||
        usesInput(ir.then, boundVars) ||
        usesInput(ir.else, boundVars)
      );

    case "lambda": {
      // Lambda params shadow outer variables
      const newBound = new Set(boundVars);
      ir.params.forEach((p) => newBound.add(p.name));
      return usesInput(ir.body, newBound);
    }

    case "alternative":
      return ir.alternatives.some((alt) => usesInput(alt, boundVars));

    case "datapath":
      return false; // DataPath is a pure value, doesn't reference variables

    case "typedef": {
      // Type definitions add the type name to bound vars for the body
      const newBound = new Set(boundVars);
      newBound.add(ir.name);
      return usesInput(ir.body, newBound);
    }

    case "guard":
      // Check constraints and body for input usage
      return (
        ir.constraints.some((c) => usesInput(c.condition, boundVars)) ||
        usesInput(ir.body, boundVars)
      );
  }
}
