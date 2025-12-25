import { Expr } from '../ast';
import { IRExpr, IRCall } from '../ir';
import { transform } from '../transform';
import { EmitContext } from '../stdlib';
import { createRubyBinding, isNativeBinaryOp } from '../bindings/ruby';

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
 * Map IR function names to Ruby operators
 */
const OP_MAP: Record<string, string> = {
  'add': '+', 'sub': '-', 'mul': '*', 'div': '/', 'mod': '%', 'pow': '**',
  'lt': '<', 'gt': '>', 'lte': '<=', 'gte': '>=',
  'eq': '==', 'neq': '!=', 'and': '&&', 'or': '||',
};

/**
 * Check if an IR expression needs parentheses when used as child of a binary op
 */
function needsParens(child: IRExpr, parentOp: string, side: 'left' | 'right'): boolean {
  if (!isNativeBinaryOp(child, OP_MAP)) return false;

  const call = child as IRCall;
  const childOp = OP_MAP[call.fn];
  if (!childOp) return false;

  const parentPrec = RUBY_PRECEDENCE[parentOp] || 0;
  const childPrec = RUBY_PRECEDENCE[childOp] || 0;

  if (childPrec < parentPrec) return true;
  if (childPrec === parentPrec && side === 'right' && (parentOp === '-' || parentOp === '/')) {
    return true;
  }

  return false;
}

// Create the Ruby standard library binding
const rubyLib = createRubyBinding();

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
  const ctx: EmitContext<string> = {
    emit: emitRuby,
    emitWithParens: (child, parentOp, side) => {
      const emitted = emitRuby(child);
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
      const needsParensForMember = ir.object.type === 'call' && isNativeBinaryOp(ir.object, OP_MAP);
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
      return rubyLib.emit(ir.fn, ir.args, ir.argTypes, ctx);

    case 'if': {
      const cond = emitRuby(ir.condition);
      const thenBranch = emitRuby(ir.then);
      const elseBranch = emitRuby(ir.else);
      return `(${cond}) ? (${thenBranch}) : (${elseBranch})`;
    }

    case 'lambda': {
      const params = ir.params.map(p => p.name).join(', ');
      const body = emitRuby(ir.body);
      return `->(${params}) { ${body} }`;
    }
  }
}
