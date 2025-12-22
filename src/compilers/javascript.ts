import { Expr } from '../ast';

/**
 * Compiles Klang expressions to JavaScript code
 */
export function compileToJavaScript(expr: Expr): string {
  switch (expr.type) {
    case 'literal':
      return expr.value.toString();

    case 'variable':
      return expr.name;

    case 'unary':
      return `${expr.operator}${compileToJavaScript(expr.operand)}`;

    case 'binary': {
      const left = compileToJavaScript(expr.left);
      const right = compileToJavaScript(expr.right);

      // Handle power operator specially
      if (expr.operator === '^') {
        return `Math.pow(${left}, ${right})`;
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
