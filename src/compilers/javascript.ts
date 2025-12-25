import { Expr } from '../ast';
import { IRExpr, IRCall } from '../ir';
import { transform } from '../transform';
import { EmitContext } from '../stdlib';
import { createJavaScriptBinding, isNativeBinaryOp } from '../bindings/javascript';

/**
 * JavaScript compilation options
 */
export interface JavaScriptCompileOptions {
  // Reserved for future options
}

/**
 * Compiles Klang expressions to JavaScript code
 * Uses dayjs for temporal operations
 *
 * This compiler works in two phases:
 * 1. Transform AST to typed IR
 * 2. Emit JavaScript from IR
 */
export function compileToJavaScript(expr: Expr, options?: JavaScriptCompileOptions): string {
  const ir = transform(expr);
  return emitJS(ir);
}

/**
 * JavaScript operator precedence (higher = binds tighter)
 */
const JS_PRECEDENCE: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '==': 3, '!=': 3,
  '<': 4, '>': 4, '<=': 4, '>=': 4,
  '+': 5, '-': 5,
  '*': 6, '/': 6, '%': 6,
};

/**
 * Map IR function names to JS operators for precedence checking
 */
const OP_MAP: Record<string, string> = {
  'add': '+', 'sub': '-', 'mul': '*', 'div': '/', 'mod': '%',
  'lt': '<', 'gt': '>', 'lte': '<=', 'gte': '>=',
  'eq': '==', 'neq': '!=', 'and': '&&', 'or': '||',
};

/**
 * Check if an IR expression needs parentheses when used as child of a binary op
 */
function needsParens(child: IRExpr, parentOp: string, side: 'left' | 'right'): boolean {
  if (!isNativeBinaryOp(child)) return false;

  const call = child as IRCall;
  const childOp = OP_MAP[call.fn];
  if (!childOp) return false;

  const parentPrec = JS_PRECEDENCE[parentOp] || 0;
  const childPrec = JS_PRECEDENCE[childOp] || 0;

  if (childPrec < parentPrec) return true;
  if (childPrec === parentPrec && side === 'right') return true;

  return false;
}

// Create the JavaScript standard library binding
const jsLib = createJavaScriptBinding();

/**
 * Emit JavaScript code from IR
 */
function emitJS(ir: IRExpr): string {
  const ctx: EmitContext<string> = {
    emit: emitJS,
    emitWithParens: (child, parentOp, side) => {
      const emitted = emitJS(child);
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

    case 'string_literal':
      return JSON.stringify(ir.value);

    case 'date_literal':
      return `dayjs('${ir.value}')`;

    case 'datetime_literal':
      return `dayjs('${ir.value}')`;

    case 'duration_literal':
      return `dayjs.duration('${ir.value}')`;

    case 'variable':
      return ir.name;

    case 'member_access': {
      const object = emitJS(ir.object);
      const needsParensForMember = ir.object.type === 'call';
      const objectExpr = needsParensForMember ? `(${object})` : object;
      return `${objectExpr}.${ir.property}`;
    }

    case 'let': {
      const params = ir.bindings.map(b => b.name).join(', ');
      const args = ir.bindings.map(b => emitJS(b.value)).join(', ');
      const body = emitJS(ir.body);
      return `((${params}) => ${body})(${args})`;
    }

    case 'call':
      return jsLib.emit(ir.fn, ir.args, ir.argTypes, ctx);

    case 'if': {
      const cond = emitJS(ir.condition);
      const thenBranch = emitJS(ir.then);
      const elseBranch = emitJS(ir.else);
      return `(${cond}) ? (${thenBranch}) : (${elseBranch})`;
    }

    case 'lambda': {
      const params = ir.params.map(p => p.name).join(', ');
      const body = emitJS(ir.body);
      return `(${params}) => ${body}`;
    }
  }
}
