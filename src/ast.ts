/**
 * AST node types for Klang expressions
 */

export type Expr = Literal | Variable | BinaryOp | UnaryOp | DateLiteral | DateTimeLiteral | DurationLiteral | TemporalKeyword | FunctionCall | MemberAccess | LetExpr;

/**
 * Literal value (number or boolean)
 */
export interface Literal {
  type: 'literal';
  value: number | boolean;
}

/**
 * Date literal (ISO8601 date string)
 */
export interface DateLiteral {
  type: 'date';
  value: string; // YYYY-MM-DD
}

/**
 * DateTime literal (ISO8601 datetime string)
 */
export interface DateTimeLiteral {
  type: 'datetime';
  value: string; // ISO8601 format
}

/**
 * Duration literal (ISO8601 duration)
 */
export interface DurationLiteral {
  type: 'duration';
  value: string; // ISO8601 duration like P1D, PT1H30M
}

/**
 * Temporal keyword (NOW, TODAY, TOMORROW, YESTERDAY, SOW, EOW)
 */
export interface TemporalKeyword {
  type: 'temporal_keyword';
  keyword: 'NOW' | 'TODAY' | 'TOMORROW' | 'YESTERDAY' | 'SOW' | 'EOW';
}

/**
 * Variable reference
 */
export interface Variable {
  type: 'variable';
  name: string;
}

/**
 * Binary operation
 */
export interface BinaryOp {
  type: 'binary';
  operator:
    // Arithmetic
    | '+' | '-' | '*' | '/' | '%' | '^'
    // Comparison
    | '<' | '>' | '<=' | '>=' | '==' | '!='
    // Logical
    | '&&' | '||';
  left: Expr;
  right: Expr;
}

/**
 * Unary operation
 */
export interface UnaryOp {
  type: 'unary';
  operator: '-' | '+' | '!';
  operand: Expr;
}

/**
 * Function call
 */
export interface FunctionCall {
  type: 'function_call';
  name: string;
  args: Expr[];
}

/**
 * Member access (dot notation)
 */
export interface MemberAccess {
  type: 'member_access';
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
  type: 'let';
  bindings: LetBinding[];
  body: Expr;
}

/**
 * Helper functions to create AST nodes
 */
export function literal(value: number | boolean): Literal {
  return { type: 'literal', value };
}

export function dateLiteral(value: string): DateLiteral {
  return { type: 'date', value };
}

export function dateTimeLiteral(value: string): DateTimeLiteral {
  return { type: 'datetime', value };
}

export function durationLiteral(value: string): DurationLiteral {
  return { type: 'duration', value };
}

export function variable(name: string): Variable {
  return { type: 'variable', name };
}

export function binary(operator: BinaryOp['operator'], left: Expr, right: Expr): BinaryOp {
  return { type: 'binary', operator, left, right };
}

export function unary(operator: UnaryOp['operator'], operand: Expr): UnaryOp {
  return { type: 'unary', operator, operand };
}

export function temporalKeyword(keyword: TemporalKeyword['keyword']): TemporalKeyword {
  return { type: 'temporal_keyword', keyword };
}

export function functionCall(name: string, args: Expr[]): FunctionCall {
  return { type: 'function_call', name, args };
}

export function memberAccess(object: Expr, property: string): MemberAccess {
  return { type: 'member_access', object, property };
}

export function letExpr(bindings: LetBinding[], body: Expr): LetExpr {
  return { type: 'let', bindings, body };
}
