import { Expr } from '../ast';
import { IRExpr, IRCall } from '../ir';
import { transform } from '../transform';

/**
 * SQL compilation options
 */
export interface SQLCompileOptions {
  // Reserved for future options
}

/**
 * SQL operator precedence (higher = binds tighter)
 */
const SQL_PRECEDENCE: Record<string, number> = {
  'OR': 0,
  'AND': 1,
  '=': 2, '<>': 2,
  '<': 3, '>': 3, '<=': 3, '>=': 3,
  '+': 4, '-': 4,
  '*': 5, '/': 5, '%': 5,
  // Power uses POWER() so doesn't need precedence handling
};

/**
 * Get the SQL operator for an IR function name
 */
function getSQLOperator(fn: string): string | null {
  if (fn.startsWith('add_')) return '+';
  if (fn.startsWith('sub_')) return '-';
  if (fn.startsWith('mul_')) return '*';
  if (fn.startsWith('div_')) return '/';
  if (fn.startsWith('mod_')) return '%';
  if (fn.startsWith('lt_')) return '<';
  if (fn.startsWith('gt_')) return '>';
  if (fn.startsWith('lte_')) return '<=';
  if (fn.startsWith('gte_')) return '>=';
  if (fn.startsWith('eq_')) return '=';
  if (fn.startsWith('neq_')) return '<>';
  if (fn.startsWith('and_')) return 'AND';
  if (fn.startsWith('or_')) return 'OR';
  return null;
}

/**
 * Check if a call will be emitted as a native SQL binary operator
 */
function isNativeBinaryOp(fn: string): boolean {
  return getSQLOperator(fn) !== null;
}

/**
 * Check if an IR expression needs parentheses when used as child of a binary op
 */
function needsParens(child: IRExpr, parentOp: string, side: 'left' | 'right'): boolean {
  if (child.type !== 'call') return false;

  const childOp = getSQLOperator(child.fn);
  if (!childOp) return false;

  const parentPrec = SQL_PRECEDENCE[parentOp] || 0;
  const childPrec = SQL_PRECEDENCE[childOp] || 0;

  // Lower precedence child needs parens
  if (childPrec < parentPrec) return true;

  // Right side of - and / needs parens if same precedence (left-associative)
  if (childPrec === parentPrec && side === 'right' && (parentOp === '-' || parentOp === '/')) {
    return true;
  }

  return false;
}

/**
 * Compiles Klang expressions to PostgreSQL SQL
 *
 * This compiler works in two phases:
 * 1. Transform AST to typed IR
 * 2. Emit SQL from IR
 */
export function compileToSQL(expr: Expr, options?: SQLCompileOptions): string {
  const ir = transform(expr);
  return emitSQL(ir);
}

/**
 * Emit SQL code from IR
 */
function emitSQL(ir: IRExpr): string {
  switch (ir.type) {
    case 'int_literal':
    case 'float_literal':
      return ir.value.toString();

    case 'bool_literal':
      return ir.value ? 'TRUE' : 'FALSE';

    case 'string_literal': {
      // SQL strings use single quotes, escape single quotes by doubling
      const escaped = ir.value.replace(/'/g, "''");
      return `'${escaped}'`;
    }

    case 'date_literal':
      return `DATE '${ir.value}'`;

    case 'datetime_literal': {
      // Convert ISO8601 to PostgreSQL TIMESTAMP format
      // '2024-01-15T10:30:00Z' -> '2024-01-15 10:30:00'
      const formatted = ir.value.replace('T', ' ').replace('Z', '').split('.')[0];
      return `TIMESTAMP '${formatted}'`;
    }

    case 'duration_literal':
      // Convert ISO8601 duration to PostgreSQL INTERVAL
      return `INTERVAL '${ir.value}'`;

    case 'variable':
      return ir.name;

    case 'member_access': {
      const object = emitSQL(ir.object);
      const needsParensForMember = ir.object.type === 'call' && isNativeBinaryOp(ir.object.fn);
      const objectExpr = needsParensForMember ? `(${object})` : object;
      return `${objectExpr}.${ir.property}`;
    }

    case 'let': {
      const bindingCols = ir.bindings
        .map(b => `${emitSQL(b.value)} AS ${b.name}`)
        .join(', ');
      const body = emitSQL(ir.body);
      return `(SELECT ${body} FROM (SELECT ${bindingCols}) AS _let)`;
    }

    case 'call':
      return emitCall(ir.fn, ir.args);
  }
}

/**
 * Emit a child expression, adding parens if needed for precedence
 */
function emitChildWithParens(child: IRExpr, parentOp: string, side: 'left' | 'right'): string {
  const emitted = emitSQL(child);
  if (needsParens(child, parentOp, side)) {
    return `(${emitted})`;
  }
  return emitted;
}

/**
 * Emit a function call
 * Maps IR function names to SQL implementations
 */
function emitCall(fn: string, args: IRExpr[]): string {
  // Handle built-in assert
  if (fn === 'assert') {
    const emittedArgs = args.map(emitSQL);
    if (emittedArgs.length < 1 || emittedArgs.length > 2) {
      throw new Error('assert requires 1 or 2 arguments: assert(condition, message?)');
    }
    const condition = emittedArgs[0];
    // Use CASE to check condition and return TRUE or raise error
    return `CASE WHEN ${condition} THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END`;
  }

  // Temporal nullary functions
  if (fn === 'today') {
    return 'CURRENT_DATE';
  }
  if (fn === 'now') {
    return 'CURRENT_TIMESTAMP';
  }

  // Temporal period boundary functions
  // SQL uses date_trunc() for period boundaries
  const periodBoundarySQL: Record<string, { truncate: string; end?: string }> = {
    'start_of_day': { truncate: 'day' },
    'end_of_day': { truncate: 'day', end: "+ INTERVAL '1 day' - INTERVAL '1 second'" },
    'start_of_week': { truncate: 'week' },
    'end_of_week': { truncate: 'week', end: "+ INTERVAL '6 days'" },
    'start_of_month': { truncate: 'month' },
    'end_of_month': { truncate: 'month', end: "+ INTERVAL '1 month' - INTERVAL '1 day'" },
    'start_of_quarter': { truncate: 'quarter' },
    'end_of_quarter': { truncate: 'quarter', end: "+ INTERVAL '3 months' - INTERVAL '1 day'" },
    'start_of_year': { truncate: 'year' },
    'end_of_year': { truncate: 'year', end: "+ INTERVAL '1 year' - INTERVAL '1 day'" },
  };

  if (fn in periodBoundarySQL) {
    const { truncate, end } = periodBoundarySQL[fn];
    const arg = args[0];
    // For SOD/EOD (applied to now()), use CURRENT_TIMESTAMP
    // For other period boundaries, use CURRENT_DATE
    let baseExpr: string;
    if (arg.type === 'call' && arg.fn === 'now') {
      baseExpr = fn.includes('_day') ? 'CURRENT_TIMESTAMP' : 'CURRENT_DATE';
    } else {
      baseExpr = emitSQL(arg);
    }
    const truncated = `date_trunc('${truncate}', ${baseExpr})`;
    return end ? `${truncated} ${end}` : truncated;
  }

  // Addition - special cases for temporal types, then native SQL
  if (fn.startsWith('add_')) {
    // today() + duration('P1D') -> CURRENT_DATE + INTERVAL '1 day' (for TOMORROW)
    if (fn === 'add_date_duration') {
      const leftArg = args[0];
      const rightArg = args[1];
      if (leftArg.type === 'call' && leftArg.fn === 'today' &&
          rightArg.type === 'duration_literal' && rightArg.value === 'P1D') {
        return "CURRENT_DATE + INTERVAL '1 day'";
      }
    }
    const left = emitChildWithParens(args[0], '+', 'left');
    const right = emitChildWithParens(args[1], '+', 'right');
    return `${left} + ${right}`;
  }

  // Subtraction
  if (fn.startsWith('sub_')) {
    // today() - duration('P1D') -> CURRENT_DATE - INTERVAL '1 day' (for YESTERDAY)
    if (fn === 'sub_date_duration') {
      const leftArg = args[0];
      const rightArg = args[1];
      if (leftArg.type === 'call' && leftArg.fn === 'today' &&
          rightArg.type === 'duration_literal' && rightArg.value === 'P1D') {
        return "CURRENT_DATE - INTERVAL '1 day'";
      }
    }
    const left = emitChildWithParens(args[0], '-', 'left');
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

  // Power - PostgreSQL uses POWER() function
  if (fn.startsWith('pow_')) {
    return `POWER(${emitSQL(args[0])}, ${emitSQL(args[1])})`;
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
    const left = emitChildWithParens(args[0], '=', 'left');
    const right = emitChildWithParens(args[1], '=', 'right');
    return `${left} = ${right}`;
  }
  if (fn.startsWith('neq_')) {
    const left = emitChildWithParens(args[0], '<>', 'left');
    const right = emitChildWithParens(args[1], '<>', 'right');
    return `${left} <> ${right}`;
  }

  // Logical operators
  if (fn.startsWith('and_')) {
    const left = emitChildWithParens(args[0], 'AND', 'left');
    const right = emitChildWithParens(args[1], 'AND', 'right');
    return `${left} AND ${right}`;
  }
  if (fn.startsWith('or_')) {
    const left = emitChildWithParens(args[0], 'OR', 'left');
    const right = emitChildWithParens(args[1], 'OR', 'right');
    return `${left} OR ${right}`;
  }

  // Unary operators
  if (fn.startsWith('neg_')) {
    const operand = emitSQL(args[0]);
    if (args[0].type === 'call' && isNativeBinaryOp(args[0].fn)) {
      return `-(${operand})`;
    }
    return `-${operand}`;
  }
  if (fn.startsWith('pos_')) {
    const operand = emitSQL(args[0]);
    if (args[0].type === 'call' && isNativeBinaryOp(args[0].fn)) {
      return `+(${operand})`;
    }
    return `+${operand}`;
  }
  if (fn.startsWith('not_')) {
    const operand = emitSQL(args[0]);
    if (args[0].type === 'call' && isNativeBinaryOp(args[0].fn)) {
      return `NOT (${operand})`;
    }
    return `NOT ${operand}`;
  }

  // Unknown function - emit as generic function call (uppercase for SQL)
  return `${fn.toUpperCase()}(${args.map(emitSQL).join(', ')})`;
}
