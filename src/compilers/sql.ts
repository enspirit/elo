import { Expr } from '../ast';
import { IRExpr, IRCall } from '../ir';
import { transform } from '../transform';
import { EmitContext } from '../stdlib';
import { createSQLBinding, isNativeBinaryOp, SQL_OP_MAP } from '../bindings/sql';

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
};

/**
 * Check if an IR expression needs parentheses when used as child of a binary op
 */
function needsParens(child: IRExpr, parentOp: string, side: 'left' | 'right'): boolean {
  if (!isNativeBinaryOp(child)) return false;

  const call = child as IRCall;
  const childOp = SQL_OP_MAP[call.fn];
  if (!childOp) return false;

  const parentPrec = SQL_PRECEDENCE[parentOp] || 0;
  const childPrec = SQL_PRECEDENCE[childOp] || 0;

  if (childPrec < parentPrec) return true;
  if (childPrec === parentPrec && side === 'right' && (parentOp === '-' || parentOp === '/')) {
    return true;
  }

  return false;
}

// Create the SQL standard library binding
const sqlLib = createSQLBinding();

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
  const ctx: EmitContext<string> = {
    emit: emitSQL,
    emitWithParens: (child, parentOp, side) => {
      const emitted = emitSQL(child);
      if (needsParens(child, parentOp, side)) {
        return `(${emitted})`;
      }
      return emitted;
    },
  };

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
      const formatted = ir.value.replace('T', ' ').replace('Z', '').split('.')[0];
      return `TIMESTAMP '${formatted}'`;
    }

    case 'duration_literal':
      return `INTERVAL '${ir.value}'`;

    case 'variable':
      return ir.name;

    case 'member_access': {
      const object = emitSQL(ir.object);
      const needsParensForMember = ir.object.type === 'call' && isNativeBinaryOp(ir.object);
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
      return sqlLib.emit(ir.fn, ir.args, ir.argTypes, ctx);

    case 'if': {
      const cond = emitSQL(ir.condition);
      const thenBranch = emitSQL(ir.then);
      const elseBranch = emitSQL(ir.else);
      return `CASE WHEN ${cond} THEN ${thenBranch} ELSE ${elseBranch} END`;
    }

    case 'lambda':
      throw new Error('Lambda expressions are not supported in SQL target');

    case 'apply':
      throw new Error('Lambda invocation is not supported in SQL target');
  }
}
