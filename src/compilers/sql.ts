import { Expr } from '../ast';

/**
 * Compiles Klang expressions to PostgreSQL SQL
 */
export function compileToSQL(expr: Expr): string {
  switch (expr.type) {
    case 'literal':
      return expr.value.toString();

    case 'variable':
      // In SQL context, variables are typically column names
      return expr.name;

    case 'unary':
      return `${expr.operator}${compileToSQL(expr.operand)}`;

    case 'binary': {
      const left = compileToSQL(expr.left);
      const right = compileToSQL(expr.right);

      // Handle power operator - PostgreSQL uses POWER() function
      if (expr.operator === '^') {
        return `POWER(${left}, ${right})`;
      }

      // Add parentheses for nested expressions to preserve precedence
      const leftExpr = needsParens(expr.left, expr.operator, 'left')
        ? `(${left})`
        : left;
      const rightExpr = needsParens(expr.right, expr.operator, 'right')
        ? `(${right})`
        : right;

      return `${leftExpr} ${expr.operator} ${rightExpr}`;
    }
  }
}

function needsParens(expr: Expr, parentOp: string, side: 'left' | 'right'): boolean {
  if (expr.type !== 'binary') return false;

  const precedence: Record<string, number> = {
    '+': 1, '-': 1,
    '*': 2, '/': 2, '%': 2,
    '^': 3
  };

  const parentPrec = precedence[parentOp] || 0;
  const childPrec = precedence[expr.operator] || 0;

  // Lower precedence always needs parens
  if (childPrec < parentPrec) return true;

  // Right side of subtraction/division needs parens if same precedence
  if (childPrec === parentPrec && side === 'right' && (parentOp === '-' || parentOp === '/')) {
    return true;
  }

  return false;
}
