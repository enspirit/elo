/**
 * AST node types for Klang expressions
 */

export type Expr = Literal | StringLiteral | Variable | BinaryOp | UnaryOp | DateLiteral | DateTimeLiteral | DurationLiteral | TemporalKeyword | FunctionCall | MemberAccess | LetExpr | IfExpr | Lambda;

/**
 * Literal value (number or boolean)
 */
export interface Literal {
  type: 'literal';
  value: number | boolean;
}

/**
 * String literal (single-quoted)
 */
export interface StringLiteral {
  type: 'string';
  value: string;
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
 * Temporal keyword (NOW, TODAY, TOMORROW, YESTERDAY, and period boundaries)
 */
export interface TemporalKeyword {
  type: 'temporal_keyword';
  keyword: 'NOW' | 'TODAY' | 'TOMORROW' | 'YESTERDAY'
    | 'SOD' | 'EOD'   // Start/End of Day
    | 'SOW' | 'EOW'   // Start/End of Week
    | 'SOM' | 'EOM'   // Start/End of Month
    | 'SOQ' | 'EOQ'   // Start/End of Quarter
    | 'SOY' | 'EOY';  // Start/End of Year
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
 * If expression: if condition then consequent else alternative
 */
export interface IfExpr {
  type: 'if';
  condition: Expr;
  then: Expr;
  else: Expr;
}

/**
 * Lambda expression: fn( params | body )
 */
export interface Lambda {
  type: 'lambda';
  params: string[];
  body: Expr;
}

/**
 * Helper functions to create AST nodes
 */
export function literal(value: number | boolean): Literal {
  return { type: 'literal', value };
}

export function stringLiteral(value: string): StringLiteral {
  return { type: 'string', value };
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

/**
 * Creates a let expression, desugaring multiple bindings into nested let expressions.
 * `let a = 1, b = 2 in body` becomes `let a = 1 in let b = 2 in body`
 * This ensures that later bindings can reference earlier ones.
 */
export function letExpr(bindings: LetBinding[], body: Expr): LetExpr {
  if (bindings.length === 0) {
    throw new Error('Let expression must have at least one binding');
  }

  if (bindings.length === 1) {
    return { type: 'let', bindings, body };
  }

  // Desugar: let a = 1, b = 2, c = 3 in body
  // becomes: let a = 1 in let b = 2 in let c = 3 in body
  const [first, ...rest] = bindings;
  const nestedBody = letExpr(rest, body);
  return { type: 'let', bindings: [first], body: nestedBody };
}

/**
 * Creates an if expression: if condition then consequent else alternative
 */
export function ifExpr(condition: Expr, thenBranch: Expr, elseBranch: Expr): IfExpr {
  return { type: 'if', condition, then: thenBranch, else: elseBranch };
}

/**
 * Creates a lambda expression: fn( params | body )
 */
export function lambda(params: string[], body: Expr): Lambda {
  return { type: 'lambda', params, body };
}
