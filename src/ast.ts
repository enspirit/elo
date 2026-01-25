/**
 * AST node types for Elo expressions
 */

export type Expr =
  | Literal
  | NullLiteral
  | StringLiteral
  | Variable
  | BinaryOp
  | UnaryOp
  | DateLiteral
  | DateTimeLiteral
  | DurationLiteral
  | TemporalKeyword
  | FunctionCall
  | MemberAccess
  | LetExpr
  | IfExpr
  | Lambda
  | ObjectLiteral
  | ArrayLiteral
  | Alternative
  | Apply
  | DataPath
  | TypeDef
  | GuardExpr
  | DoCall;

/**
 * do call (Relatr plugins v1)
 *
 * Parsed form: do 'cap.name' <expr>
 * Only valid inside plugin-program round bindings (not score).
 */
export interface DoCall {
  type: "do_call";
  capName: string;
  argsExpr: Expr;
}

export function doCall(capName: string, argsExpr: Expr): DoCall {
  return { type: "do_call", capName, argsExpr };
}

/**
 * Literal value (number or boolean)
 */
export interface Literal {
  type: "literal";
  value: number | boolean;
}

/**
 * Null literal
 */
export interface NullLiteral {
  type: "null";
}

/**
 * String literal (single-quoted)
 */
export interface StringLiteral {
  type: "string";
  value: string;
}

/**
 * Date literal (ISO8601 date string)
 */
export interface DateLiteral {
  type: "date";
  value: string; // YYYY-MM-DD
}

/**
 * DateTime literal (ISO8601 datetime string)
 */
export interface DateTimeLiteral {
  type: "datetime";
  value: string; // ISO8601 format
}

/**
 * Duration literal (ISO8601 duration)
 */
export interface DurationLiteral {
  type: "duration";
  value: string; // ISO8601 duration like P1D, PT1H30M
}

/**
 * Temporal keyword (NOW, TODAY, TOMORROW, YESTERDAY, and period boundaries)
 */
export interface TemporalKeyword {
  type: "temporal_keyword";
  keyword:
    | "NOW"
    | "TODAY"
    | "TOMORROW"
    | "YESTERDAY"
    | "SOD"
    | "EOD" // Start/End of Day
    | "SOW"
    | "EOW" // Start/End of Week
    | "SOM"
    | "EOM" // Start/End of Month
    | "SOQ"
    | "EOQ" // Start/End of Quarter
    | "SOY"
    | "EOY" // Start/End of Year
    | "BOT"
    | "EOT"; // Beginning/End of Time
}

/**
 * Variable reference
 */
export interface Variable {
  type: "variable";
  name: string;
}

/**
 * Binary operation
 */
export interface BinaryOp {
  type: "binary";
  operator: // Arithmetic
    | "+"
    | "-"
    | "*"
    | "/"
    | "%"
    | "^"
    // Comparison
    | "<"
    | ">"
    | "<="
    | ">="
    | "=="
    | "!="
    // Logical
    | "&&"
    | "||";
  left: Expr;
  right: Expr;
}

/**
 * Unary operation
 */
export interface UnaryOp {
  type: "unary";
  operator: "-" | "+" | "!";
  operand: Expr;
}

/**
 * Function call
 */
export interface FunctionCall {
  type: "function_call";
  name: string;
  args: Expr[];
}

/**
 * Function application (calling an expression that evaluates to a function)
 */
export interface Apply {
  type: "apply";
  fn: Expr;
  args: Expr[];
}

/**
 * Member access (dot notation)
 */
export interface MemberAccess {
  type: "member_access";
  object: Expr;
  property: string;
}

/**
 * Variable binding in a let expression
 */
export interface LetBinding {
  name: string;
  value: Expr;
}

/**
 * Let expression: let x = 1, y = 2 in body
 */
export interface LetExpr {
  type: "let";
  bindings: LetBinding[];
  body: Expr;
}

/**
 * If expression: if condition then consequent else alternative
 */
export interface IfExpr {
  type: "if";
  condition: Expr;
  then: Expr;
  else: Expr;
}

/**
 * Lambda expression: fn( params ~> body )
 */
export interface Lambda {
  type: "lambda";
  params: string[];
  body: Expr;
}

/**
 * Helper functions to create AST nodes
 */
export function literal(value: number | boolean): Literal {
  return { type: "literal", value };
}

export function nullLiteral(): NullLiteral {
  return { type: "null" };
}

export function stringLiteral(value: string): StringLiteral {
  return { type: "string", value };
}

export function dateLiteral(value: string): DateLiteral {
  return { type: "date", value };
}

export function dateTimeLiteral(value: string): DateTimeLiteral {
  return { type: "datetime", value };
}

export function durationLiteral(value: string): DurationLiteral {
  return { type: "duration", value };
}

export function variable(name: string): Variable {
  return { type: "variable", name };
}

export function binary(
  operator: BinaryOp["operator"],
  left: Expr,
  right: Expr,
): BinaryOp {
  return { type: "binary", operator, left, right };
}

export function unary(operator: UnaryOp["operator"], operand: Expr): UnaryOp {
  return { type: "unary", operator, operand };
}

export function temporalKeyword(
  keyword: TemporalKeyword["keyword"],
): TemporalKeyword {
  return { type: "temporal_keyword", keyword };
}

export function functionCall(name: string, args: Expr[]): FunctionCall {
  return { type: "function_call", name, args };
}

export function apply(fn: Expr, args: Expr[]): Apply {
  return { type: "apply", fn, args };
}

export function memberAccess(object: Expr, property: string): MemberAccess {
  return { type: "member_access", object, property };
}

/**
 * Creates a let expression, desugaring multiple bindings into nested let expressions.
 * `let a = 1, b = 2 in body` becomes `let a = 1 in let b = 2 in body`
 * This ensures that later bindings can reference earlier ones.
 */
export function letExpr(bindings: LetBinding[], body: Expr): LetExpr {
  if (bindings.length === 0) {
    throw new Error("Let expression must have at least one binding");
  }

  if (bindings.length === 1) {
    return { type: "let", bindings, body };
  }

  // Desugar: let a = 1, b = 2, c = 3 in body
  // becomes: let a = 1 in let b = 2 in let c = 3 in body
  const [first, ...rest] = bindings;
  const nestedBody = letExpr(rest, body);
  return { type: "let", bindings: [first], body: nestedBody };
}

/**
 * Creates an if expression: if condition then consequent else alternative
 */
export function ifExpr(
  condition: Expr,
  thenBranch: Expr,
  elseBranch: Expr,
): IfExpr {
  return { type: "if", condition, then: thenBranch, else: elseBranch };
}

/**
 * Creates a lambda expression: fn( params ~> body )
 */
export function lambda(params: string[], body: Expr): Lambda {
  return { type: "lambda", params, body };
}

/**
 * Object property (key-value pair)
 */
export interface ObjectProperty {
  key: string;
  value: Expr;
}

/**
 * Object literal: {key: value, ...}
 */
export interface ObjectLiteral {
  type: "object";
  properties: ObjectProperty[];
}

/**
 * Creates an object literal: {key: value, ...}
 */
export function objectLiteral(properties: ObjectProperty[]): ObjectLiteral {
  return { type: "object", properties };
}

/**
 * Array literal: [expr, expr, ...]
 */
export interface ArrayLiteral {
  type: "array";
  elements: Expr[];
}

/**
 * Creates an array literal: [expr, expr, ...]
 */
export function arrayLiteral(elements: Expr[]): ArrayLiteral {
  return { type: "array", elements };
}

/**
 * Alternative expression: a | b | c
 * Evaluates alternatives left-to-right, returns first non-null value.
 */
export interface Alternative {
  type: "alternative";
  alternatives: Expr[];
}

/**
 * Creates an alternative expression: a | b | c
 */
export function alternative(alternatives: Expr[]): Alternative {
  if (alternatives.length < 2) {
    throw new Error(
      "Alternative expression must have at least two alternatives",
    );
  }
  return { type: "alternative", alternatives };
}

/**
 * DataPath literal: .x.y.z or .items.0.name
 * A path for navigating data structures, inspired by JSONPath.
 * Segments can be property names (strings) or array indices (numbers).
 */
export interface DataPath {
  type: "datapath";
  segments: (string | number)[];
}

/**
 * Creates a datapath literal: .x.y.z
 */
export function dataPath(segments: (string | number)[]): DataPath {
  if (segments.length === 0) {
    throw new Error("DataPath must have at least one segment");
  }
  return { type: "datapath", segments };
}

/**
 * Type expression for type definitions
 * Used in `let Person = { name: String, age: Int }` style declarations
 */
export type TypeExpr =
  | TypeRef
  | TypeSchema
  | SubtypeConstraint
  | ArrayType
  | UnionType;

/**
 * Reference to a base type: String, Int, Bool, Datetime, Any
 */
export interface TypeRef {
  kind: "type_ref";
  name: string; // 'String', 'Int', 'Bool', 'Datetime', 'Any'
}

/**
 * Object type schema: { name: String, age: Int }
 * extras controls handling of extra attributes:
 * - undefined/'closed': extra attributes are not allowed (default)
 * - 'ignored': extra attributes are allowed but not included in output
 * - TypeExpr: extra attributes are allowed and must match this type
 */
export interface TypeSchema {
  kind: "type_schema";
  properties: TypeSchemaProperty[];
  extras?: "closed" | "ignored" | TypeExpr;
}

/**
 * A single constraint with optional label
 */
export interface Constraint {
  label?: string; // Optional label: 'positive' or 'must be positive'
  condition: Expr; // The constraint expression: i > 0
}

/**
 * Subtype constraint: Int(i | i > 0) or Int(i | positive: i > 0, even: i % 2 == 0)
 * A base type with one or more predicate constraints
 */
export interface SubtypeConstraint {
  kind: "subtype_constraint";
  baseType: TypeExpr; // The base type (can be any type expr)
  variable: string; // 'i' in Int(i | i > 0)
  constraints: Constraint[]; // One or more labeled constraints
}

/**
 * Array type: [Int], [String], [{ name: String }]
 */
export interface ArrayType {
  kind: "array_type";
  elementType: TypeExpr;
}

/**
 * Union type: Int|String, String|Int|Bool
 * Tries each type in order, returns first successful parse
 */
export interface UnionType {
  kind: "union_type";
  types: TypeExpr[];
}

/**
 * Property in a type schema
 */
export interface TypeSchemaProperty {
  key: string;
  typeExpr: TypeExpr;
  optional?: boolean; // true for `name :? Type` syntax
}

/**
 * Type definition: let Person = { name: String, age: Int }
 * Binds a type name (uppercase) to a type expression.
 * The body can use the type via pipe: data |> Person
 */
export interface TypeDef {
  type: "typedef";
  name: string; // Uppercase identifier like 'Person'
  typeExpr: TypeExpr; // The type expression
  body: Expr; // The expression where this type is used
}

/**
 * Creates a type reference: String, Int, etc.
 */
export function typeRef(name: string): TypeRef {
  return { kind: "type_ref", name };
}

/**
 * Creates a type schema: { name: String, age: Int }
 */
export function typeSchema(
  properties: TypeSchemaProperty[],
  extras?: "closed" | "ignored" | TypeExpr,
): TypeSchema {
  return { kind: "type_schema", properties, extras };
}

/**
 * Creates a type definition expression
 */
export function typeDef(name: string, typeExpr: TypeExpr, body: Expr): TypeDef {
  return { type: "typedef", name, typeExpr, body };
}

/**
 * Creates a subtype constraint: Int(i | i > 0) or Int(i | positive: i > 0, even: i % 2 == 0)
 */
export function subtypeConstraint(
  baseType: TypeExpr,
  variable: string,
  constraints: Constraint[],
): SubtypeConstraint {
  return { kind: "subtype_constraint", baseType, variable, constraints };
}

/**
 * Creates an array type: [Int]
 */
export function arrayType(elementType: TypeExpr): ArrayType {
  return { kind: "array_type", elementType };
}

/**
 * Creates a union type: Int|String
 */
export function unionType(types: TypeExpr[]): UnionType {
  if (types.length < 2) {
    throw new Error("Union type must have at least two types");
  }
  return { kind: "union_type", types };
}

/**
 * Guard expression: guard [label:] condition in body
 * Used for preconditions (guard) and postconditions (check).
 * Throws at runtime if condition is false, unless guards are stripped.
 */
export interface GuardExpr {
  type: "guard";
  constraints: Constraint[]; // One or more labeled constraints
  body: Expr;
  guardType: "guard" | "check"; // Semantic distinction for clarity
}

/**
 * Creates a guard expression
 * Multiple guards get nested: guard a in guard b in body
 */
export function guardExpr(
  constraints: Constraint[],
  body: Expr,
  guardType: "guard" | "check" = "guard",
): GuardExpr {
  if (constraints.length === 0) {
    throw new Error("Guard expression must have at least one constraint");
  }
  return { type: "guard", constraints, body, guardType };
}
