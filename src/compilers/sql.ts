import { Expr } from '../ast';
import { IRExpr, IRCall, inferType, usesInput } from '../ir';
import { transform } from '../transform';
import { Types, TypeAnnotations } from '../types';
import { EmitContext } from '../stdlib';
import { createSQLBinding, isNativeBinaryOp, SQL_OP_MAP, PG_TYPE, pgTypeOf, jsonFieldPgType } from '../bindings/sql';
import { assertNumericLiteral, formatFloatLiteral, assertSafeIdentifier, assertSafeDatapathSegment } from './_validate';

/**
 * SQL compilation options
 */
export interface SQLCompileOptions {
  /** If true, always mark as using input (even if _ is not used) */
  asFunction?: boolean;
  /**
   * Types the checker found for the AST, from `typecheckWithAnnotations`.
   *
   * With it, a declared field or coerced value gets a typed implementation
   * instead of a runtime dispatcher. Without it the emission is exactly what
   * it always was, which is why the compile path never calls the checker
   * itself.
   */
  types?: TypeAnnotations;
}

/**
 * Result of SQL compilation
 */
export interface SQLCompileResult {
  /** The generated SQL code */
  code: string;
  /** Whether the code uses the input parameter $1 */
  usesInput: boolean;
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
 * Compiles Elo expressions to PostgreSQL SQL
 *
 * This compiler works in two phases:
 * 1. Transform AST to typed IR
 * 2. Emit SQL from IR
 *
 * If the expression uses `_` (input variable), it is compiled as `$1`
 * (PostgreSQL parameter placeholder).
 */
export function compileToSQL(expr: Expr, options?: SQLCompileOptions): string {
  const result = compileToSQLWithMeta(expr, options);
  return result.code;
}

/**
 * Compiles Elo expressions to SQL with metadata about input usage.
 * Use this when you need to know if the expression uses input parameter $1.
 *
 * Note: SQL compilation allows undefined variables since they represent
 * database column names, not program variables with potential global access.
 */
export function compileToSQLWithMeta(expr: Expr, options?: SQLCompileOptions): SQLCompileResult {
  // SQL allows undefined variables since they represent column names
  const ir = transform(expr, new Map(), new Set(), { allowUndefinedVariables: true, types: options?.types });
  const needsInput = usesInput(ir) || options?.asFunction;
  const code = emitSQL(ir);

  return { code, usesInput: needsInput || false };
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
      return assertNumericLiteral(ir.value).toString();

    case 'float_literal':
      return formatFloatLiteral(ir.value);

    case 'bool_literal':
      return ir.value ? 'TRUE' : 'FALSE';

    case 'null_literal':
      return 'NULL';

    case 'string_literal': {
      // SQL strings use single quotes, escape single quotes by doubling
      const escaped = ir.value.replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r');
      // Use E'...' escape syntax if string contains escape sequences
      const prefix = escaped !== ir.value.replace(/'/g, "''") ? 'E' : '';
      return `${prefix}'${escaped}'`;
    }

    case 'date_literal': {
      const escaped = ir.value.replace(/'/g, "''");
      return `DATE '${escaped}'`;
    }

    case 'datetime_literal': {
      // Convert ISO8601 to PostgreSQL TIMESTAMP format
      const formatted = ir.value.replace('T', ' ').replace('Z', '').split('.')[0];
      const escaped = formatted.replace(/'/g, "''");
      return `TIMESTAMP '${escaped}'`;
    }

    case 'duration_literal': {
      const escaped = ir.value.replace(/'/g, "''");
      return `INTERVAL '${escaped}'`;
    }

    case 'object_literal': {
      if (ir.properties.length === 0) {
        return `'{}'::jsonb`;
      }
      const args = ir.properties
        .map(p => `'${assertSafeIdentifier(p.key, 'object_literal key')}', ${emitSQL(p.value)}`)
        .join(', ');
      return `jsonb_build_object(${args})`;
    }

    case 'array_literal': {
      // PostgreSQL rejects `ARRAY[]`: an array constructor takes its element
      // type from its elements, and there are none. The typed empty-array
      // literal is the way to write it, with the element type the list
      // carries. Reached where nothing else supplies one — `typeOf([])` — so
      // the fallback only has to be *an* array.
      if (ir.elements.length === 0) {
        return `'{}'::${PG_TYPE[ir.elementType.kind] ?? 'text'}[]`;
      }
      const elements = ir.elements.map(e => emitSQL(e)).join(', ');
      return `ARRAY[${elements}]`;
    }

    case 'variable':
      // Map _ to $1 (PostgreSQL parameter placeholder for input)
      if (ir.name === '_') return '$1';
      return assertSafeIdentifier(ir.name, 'variable name');

    case 'member_access': {
      const object = emitSQL(ir.object);
      const objectType = inferType(ir.object);
      const needsParensForMember = ir.object.type === 'call' && isNativeBinaryOp(ir.object);
      const objectExpr = needsParensForMember ? `(${object})` : object;
      const prop = assertSafeIdentifier(ir.property, 'member_access property');

      // Use JSON access for object types
      if (objectType.kind === 'object') {
        const read = `${objectExpr}->>'${prop}'`;
        // `->>` is text whatever the field holds. When the type checker told
        // us what it holds (`--optimize`), say so here and the value composes
        // like any other; otherwise it stays text and the operation using it
        // supplies the type — see readsJsonField.
        const pg = jsonFieldPgType(ir.inferredType);
        return pg ? `(${read})::${pg}` : read;
      }

      // The input is a *row* on SQL, not a document: `_.person.age` is a field
      // reference, which is what a host passing a record expects.
      return `${objectExpr}.${prop}`;
    }

    case 'let': {
      // Bindings are sequential: a binding may use the previous ones. SQL
      // cannot reference an alias within the same SELECT list, so each
      // binding gets its own scope and they are nested here rather than in
      // the AST — the other targets emit a flat sequence.
      const nest = (index: number): string => {
        const binding = ir.bindings[index];
        const column = `${emitSQL(binding.value)} AS ${assertSafeIdentifier(binding.name, 'let binding name')}`;
        const body = index === ir.bindings.length - 1 ? emitSQL(ir.body) : nest(index + 1);
        return `(SELECT ${body} FROM (SELECT ${column}) AS _let)`;
      };
      return nest(0);
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

    case 'alternative': {
      // Compile to COALESCE - returns first non-NULL value.
      //
      // COALESCE needs one type for all its arguments where Elo does not:
      // `tuple.x | 0` is a String with an Int default, and a json field read
      // is text, so PostgreSQL refuses to match them. The alternative's value
      // is the first one's, so that is the type the rest are brought to.
      const target = pgTypeOf(ir.alternatives[0]);
      const conflict = target !== null &&
        ir.alternatives.some(alt => {
          const type = pgTypeOf(alt);
          return type !== null && type !== target;
        });
      const alts = ir.alternatives
        .map(alt => {
          const emitted = emitSQL(alt);
          if (!conflict || pgTypeOf(alt) === target) return emitted;
          return `(${emitted})::${target}`;
        })
        .join(', ');
      return `COALESCE(${alts})`;
    }

    case 'datapath': {
      // Compile datapath as an array of path segments for use with fetch
      const segments = ir.segments.map(s => {
        const safe = assertSafeDatapathSegment(s);
        return typeof safe === 'string' ? `'${safe}'` : safe.toString();
      });
      return `ARRAY[${segments.join(', ')}]`;
    }

    case 'typedef':
      throw new Error('Type definitions are not yet supported in SQL compilation');

    case 'guard':
      throw new Error('Guard expressions are not supported in SQL compilation');
  }
}
