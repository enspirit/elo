import { Expr } from '../ast';

/**
 * Compiles Klang expressions to Ruby code
 */
export function compileToRuby(expr: Expr): string {
  switch (expr.type) {
    case 'literal':
      return expr.value.toString();

    case 'variable':
      return expr.name;

    case 'unary':
      return `${expr.operator}${compileToRuby(expr.operand)}`;

    case 'binary': {
      const left = compileToRuby(expr.left);
      const right = compileToRuby(expr.right);
      const op = expr.operator === '^' ? '**' : expr.operator;

      // Add parentheses for nested expressions to preserve precedence
      const leftExpr = needsParens(expr.left, expr.operator, 'left')
        ? `(${left})`
        : left;
      const rightExpr = needsParens(expr.right, expr.operator, 'right')
        ? `(${right})`
        : right;

      return `${leftExpr} ${op} ${rightExpr}`;
    }
  }
}

function needsParens(expr: Expr, parentOp: string, side: 'left' | 'right'): boolean {
  if (expr.type !== 'binary') return false;

  const precedence: Record<string, number> = {
    '+': 1, '-': 1,
    '*': 2, '/': 2, '%': 2,
    '^': 3, '**': 3
  };

  const parentPrec = precedence[parentOp] || 0;
  const childPrec = precedence[expr.operator] || 0;

  // Lower precedence always needs parens
  if (childPrec < parentPrec) return true;

  // Right-associative operators (^) need parens on left side if same precedence
  if (childPrec === parentPrec && side === 'right' && (parentOp === '-' || parentOp === '/')) {
    return true;
  }

  return false;
}
