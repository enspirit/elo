import { Expr } from '../ast';
import { IRExpr, IRCall } from '../ir';
import { transform } from '../transform';

/**
 * Ruby compilation options
 */
export interface RubyCompileOptions {
  // Reserved for future options
}

/**
 * Ruby operator precedence (higher = binds tighter)
 */
const RUBY_PRECEDENCE: Record<string, number> = {
  '||': 0,
  '&&': 1,
  '==': 2, '!=': 2,
  '<': 3, '>': 3, '<=': 3, '>=': 3,
  '+': 4, '-': 4,
  '*': 5, '/': 5, '%': 5,
  '**': 6,
};

/**
 * Get the Ruby operator for an IR function name
 */
function getRubyOperator(fn: string): string | null {
  if (fn.startsWith('add_')) return '+';
  if (fn.startsWith('sub_')) return '-';
  if (fn.startsWith('mul_')) return '*';
  if (fn.startsWith('div_')) return '/';
  if (fn.startsWith('mod_')) return '%';
  if (fn.startsWith('pow_')) return '**';
  if (fn.startsWith('lt_')) return '<';
  if (fn.startsWith('gt_')) return '>';
  if (fn.startsWith('lte_')) return '<=';
  if (fn.startsWith('gte_')) return '>=';
  if (fn.startsWith('eq_')) return '==';
  if (fn.startsWith('neq_')) return '!=';
  if (fn.startsWith('and_')) return '&&';
  if (fn.startsWith('or_')) return '||';
  return null;
}

/**
 * Check if a call will be emitted as a native Ruby binary operator
 */
function isNativeBinaryOp(fn: string): boolean {
  return getRubyOperator(fn) !== null;
}

/**
 * Check if an IR expression needs parentheses when used as child of a binary op
 */
function needsParens(child: IRExpr, parentOp: string, side: 'left' | 'right'): boolean {
  if (child.type !== 'call') return false;

  const childOp = getRubyOperator(child.fn);
  if (!childOp) return false;

  const parentPrec = RUBY_PRECEDENCE[parentOp] || 0;
  const childPrec = RUBY_PRECEDENCE[childOp] || 0;

  // Lower precedence child needs parens
  if (childPrec < parentPrec) return true;

  // Right side of - and / needs parens if same precedence (left-associative)
  if (childPrec === parentPrec && side === 'right' && (parentOp === '-' || parentOp === '/')) {
    return true;
  }

  return false;
}

/**
 * Compiles Klang expressions to Ruby code
 *
 * This compiler works in two phases:
 * 1. Transform AST to typed IR
 * 2. Emit Ruby from IR
 */
export function compileToRuby(expr: Expr, options?: RubyCompileOptions): string {
  const ir = transform(expr);
  return emitRuby(ir);
}

/**
 * Emit Ruby code from IR
 */
function emitRuby(ir: IRExpr): string {
  switch (ir.type) {
    case 'int_literal':
    case 'float_literal':
      return ir.value.toString();

    case 'bool_literal':
      return ir.value.toString();

    case 'string_literal': {
      // Ruby double-quoted strings: escape backslash and double quote
      const escaped = ir.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `"${escaped}"`;
    }

    case 'date_literal':
      return `Date.parse('${ir.value}')`;

    case 'datetime_literal':
      return `DateTime.parse('${ir.value}')`;

    case 'duration_literal':
      return `ActiveSupport::Duration.parse('${ir.value}')`;

    case 'variable':
      return ir.name;

    case 'member_access': {
      const object = emitRuby(ir.object);
      const needsParensForMember = ir.object.type === 'call' && isNativeBinaryOp(ir.object.fn);
      const objectExpr = needsParensForMember ? `(${object})` : object;
      return `${objectExpr}[:${ir.property}]`;
    }

    case 'let': {
      const params = ir.bindings.map(b => b.name).join(', ');
      const args = ir.bindings.map(b => emitRuby(b.value)).join(', ');
      const body = emitRuby(ir.body);
      return `->(${params}) { ${body} }.call(${args})`;
    }

    case 'call':
      return emitCall(ir.fn, ir.args);
  }
}

/**
 * Emit a child expression, adding parens if needed for precedence
 */
function emitChildWithParens(child: IRExpr, parentOp: string, side: 'left' | 'right'): string {
  const emitted = emitRuby(child);
  if (needsParens(child, parentOp, side)) {
    return `(${emitted})`;
  }
  return emitted;
}

/**
 * Emit a function call
 * Maps IR function names to Ruby implementations
 */
function emitCall(fn: string, args: IRExpr[]): string {
  // Handle built-in assert
  if (fn === 'assert') {
    const emittedArgs = args.map(emitRuby);
    if (emittedArgs.length < 1 || emittedArgs.length > 2) {
      throw new Error('assert requires 1 or 2 arguments: assert(condition, message?)');
    }
    const condition = emittedArgs[0];
    const message = emittedArgs.length === 2 ? emittedArgs[1] : '"Assertion failed"';
    return `(raise ${message} unless ${condition}; true)`;
  }

  // Temporal nullary functions
  if (fn === 'today') {
    return 'Date.today';
  }
  if (fn === 'now') {
    return 'DateTime.now';
  }

  // Temporal period boundary functions
  // These are emitted as Date.today.method (not DateTime.now.method)
  // because they represent the logical "current period" in date context
  const periodBoundaryMap: Record<string, string> = {
    'start_of_day': 'beginning_of_day',
    'end_of_day': 'end_of_day',
    'start_of_week': 'beginning_of_week',
    'end_of_week': 'end_of_week',
    'start_of_month': 'beginning_of_month',
    'end_of_month': 'end_of_month',
    'start_of_quarter': 'beginning_of_quarter',
    'end_of_quarter': 'end_of_quarter',
    'start_of_year': 'beginning_of_year',
    'end_of_year': 'end_of_year',
  };
  if (fn in periodBoundaryMap) {
    // For period boundaries, emit Date.today.method (not DateTime.now.method)
    // The IR uses now() but Ruby idiom uses Date.today for these operations
    const arg = args[0];
    if (arg.type === 'call' && arg.fn === 'now') {
      return `Date.today.${periodBoundaryMap[fn]}`;
    }
    return `${emitRuby(arg)}.${periodBoundaryMap[fn]}`;
  }

  // Ruby uses native operators for all types due to operator overloading
  // All binary operations can use the same pattern

  // Addition
  if (fn.startsWith('add_')) {
    const left = emitChildWithParens(args[0], '+', 'left');
    // Special case: today() + duration('P1D') -> Date.today + 1 (for TOMORROW)
    if (fn === 'add_date_duration') {
      const leftArg = args[0];
      const rightArg = args[1];
      if (leftArg.type === 'call' && leftArg.fn === 'today' &&
          rightArg.type === 'duration_literal' && rightArg.value === 'P1D') {
        return `${left} + 1`;
      }
    }
    const right = emitChildWithParens(args[1], '+', 'right');
    return `${left} + ${right}`;
  }

  // Subtraction
  if (fn.startsWith('sub_')) {
    const left = emitChildWithParens(args[0], '-', 'left');
    // Special case: today() - duration('P1D') -> Date.today - 1 (for YESTERDAY)
    if (fn === 'sub_date_duration') {
      const leftArg = args[0];
      const rightArg = args[1];
      if (leftArg.type === 'call' && leftArg.fn === 'today' &&
          rightArg.type === 'duration_literal' && rightArg.value === 'P1D') {
        return `${left} - 1`;
      }
    }
    const right = emitChildWithParens(args[1], '-', 'right');
    return `${left} - ${right}`;
  }

  // Multiplication
  if (fn.startsWith('mul_')) {
    const left = emitChildWithParens(args[0], '*', 'left');
    const right = emitChildWithParens(args[1], '*', 'right');
    return `${left} * ${right}`;
  }

  // Division
  if (fn.startsWith('div_')) {
    const left = emitChildWithParens(args[0], '/', 'left');
    const right = emitChildWithParens(args[1], '/', 'right');
    return `${left} / ${right}`;
  }

  // Modulo
  if (fn.startsWith('mod_')) {
    const left = emitChildWithParens(args[0], '%', 'left');
    const right = emitChildWithParens(args[1], '%', 'right');
    return `${left} % ${right}`;
  }

  // Power - Ruby uses ** instead of ^
  if (fn.startsWith('pow_')) {
    const left = emitChildWithParens(args[0], '**', 'left');
    const right = emitChildWithParens(args[1], '**', 'right');
    return `${left} ** ${right}`;
  }

  // Comparison operators
  if (fn.startsWith('lt_')) {
    const left = emitChildWithParens(args[0], '<', 'left');
    const right = emitChildWithParens(args[1], '<', 'right');
    return `${left} < ${right}`;
  }
  if (fn.startsWith('gt_')) {
    const left = emitChildWithParens(args[0], '>', 'left');
    const right = emitChildWithParens(args[1], '>', 'right');
    return `${left} > ${right}`;
  }
  if (fn.startsWith('lte_')) {
    const left = emitChildWithParens(args[0], '<=', 'left');
    const right = emitChildWithParens(args[1], '<=', 'right');
    return `${left} <= ${right}`;
  }
  if (fn.startsWith('gte_')) {
    const left = emitChildWithParens(args[0], '>=', 'left');
    const right = emitChildWithParens(args[1], '>=', 'right');
    return `${left} >= ${right}`;
  }

  // Equality
  if (fn.startsWith('eq_')) {
    const left = emitChildWithParens(args[0], '==', 'left');
    const right = emitChildWithParens(args[1], '==', 'right');
    return `${left} == ${right}`;
  }
  if (fn.startsWith('neq_')) {
    const left = emitChildWithParens(args[0], '!=', 'left');
    const right = emitChildWithParens(args[1], '!=', 'right');
    return `${left} != ${right}`;
  }

  // Logical operators
  if (fn.startsWith('and_')) {
    const left = emitChildWithParens(args[0], '&&', 'left');
    const right = emitChildWithParens(args[1], '&&', 'right');
    return `${left} && ${right}`;
  }
  if (fn.startsWith('or_')) {
    const left = emitChildWithParens(args[0], '||', 'left');
    const right = emitChildWithParens(args[1], '||', 'right');
    return `${left} || ${right}`;
  }

  // Unary operators
  if (fn.startsWith('neg_')) {
    const operand = emitRuby(args[0]);
    if (args[0].type === 'call' && isNativeBinaryOp(args[0].fn)) {
      return `-(${operand})`;
    }
    return `-${operand}`;
  }
  if (fn.startsWith('pos_')) {
    const operand = emitRuby(args[0]);
    if (args[0].type === 'call' && isNativeBinaryOp(args[0].fn)) {
      return `+(${operand})`;
    }
    return `+${operand}`;
  }
  if (fn.startsWith('not_')) {
    const operand = emitRuby(args[0]);
    if (args[0].type === 'call' && isNativeBinaryOp(args[0].fn)) {
      return `!(${operand})`;
    }
    return `!${operand}`;
  }

  // Unknown function - emit as generic function call
  return `${fn}(${args.map(emitRuby).join(', ')})`;
}
