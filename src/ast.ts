/**
 * AST node types for Klang expressions
 */

export type Expr = Literal | Variable | BinaryOp | UnaryOp;

/**
 * Numeric literal
 */
export interface Literal {
  type: 'literal';
  value: number;
}

/**
 * Variable reference
 */
export interface Variable {
  type: 'variable';
  name: string;
}

/**
 * Binary operation (e.g., +, -, *, /)
 */
export interface BinaryOp {
  type: 'binary';
  operator: '+' | '-' | '*' | '/' | '%' | '^';
  left: Expr;
  right: Expr;
}

/**
 * Unary operation (e.g., -, +)
 */
export interface UnaryOp {
  type: 'unary';
  operator: '-' | '+';
  operand: Expr;
}

/**
 * Helper functions to create AST nodes
 */
export function literal(value: number): Literal {
  return { type: 'literal', value };
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
