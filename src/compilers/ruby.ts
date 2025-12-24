import { Expr } from '../ast';

/**
 * Compiles Klang expressions to Ruby code
 */
export function compileToRuby(expr: Expr): string {
  switch (expr.type) {
    case 'literal':
      return expr.value.toString();

    case 'date':
      return `Date.parse('${expr.value}')`;

    case 'datetime':
      return `DateTime.parse('${expr.value}')`;

    case 'duration':
      return `ActiveSupport::Duration.parse('${expr.value}')`;

    case 'temporal_keyword':
      switch (expr.keyword) {
        case 'NOW':
          return 'DateTime.now';
        case 'TODAY':
          return 'Date.today';
        case 'TOMORROW':
          return 'Date.today + 1';
        case 'YESTERDAY':
          return 'Date.today - 1';
        case 'SOW':
          return 'Date.today.beginning_of_week';
        case 'EOW':
          return 'Date.today.end_of_week';
      }

    case 'variable':
      return expr.name;

    case 'member_access': {
      const object = compileToRuby(expr.object);
      // Add parentheses around complex expressions to ensure proper precedence
      const objectExpr = (expr.object.type === 'binary' || expr.object.type === 'unary')
        ? `(${object})`
        : object;
      return `${objectExpr}[:${expr.property}]`;
    }

    case 'function_call': {
      const args = expr.args.map(arg => compileToRuby(arg));

      // Built-in assert function
      if (expr.name === 'assert') {
        if (args.length < 1 || args.length > 2) {
          throw new Error('assert requires 1 or 2 arguments: assert(condition, message?)');
        }
        const condition = args[0];
        const message = args.length === 2 ? args[1] : '"Assertion failed"';
        return `(raise ${message} unless ${condition}; true)`;
      }

      // Generic function call
      return `${expr.name}(${args.join(', ')})`;
    }

    case 'unary': {
      const operand = compileToRuby(expr.operand);
      // Add parentheses around binary expressions to preserve precedence
      const operandExpr = expr.operand.type === 'binary' ? `(${operand})` : operand;
      return `${expr.operator}${operandExpr}`;
    }

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

    case 'let': {
      const params = expr.bindings.map(b => b.name).join(', ');
      const args = expr.bindings.map(b => compileToRuby(b.value)).join(', ');
      const body = compileToRuby(expr.body);
      return `->(${params}) { ${body} }.call(${args})`;
    }
  }
}

function needsParens(expr: Expr, parentOp: string, side: 'left' | 'right'): boolean {
  if (expr.type !== 'binary') return false;

  const precedence: Record<string, number> = {
    '||': 0,
    '&&': 1,
    '==': 2, '!=': 2,
    '<': 3, '>': 3, '<=': 3, '>=': 3,
    '+': 4, '-': 4,
    '*': 5, '/': 5, '%': 5,
    '^': 6, '**': 6
  };

  const parentPrec = precedence[parentOp] || 0;
  const childPrec = precedence[expr.operator] || 0;

  // Lower precedence always needs parens
  if (childPrec < parentPrec) return true;

  // Right side of certain operators needs parens if same precedence
  if (childPrec === parentPrec && side === 'right' && (parentOp === '-' || parentOp === '/')) {
    return true;
  }

  return false;
}
