import { Expr } from '../ast';
import { IRExpr, IRCall, usesInput } from '../ir';
import { transform } from '../transform';
import { EmitContext } from '../stdlib';
import { createPythonBinding, isNativeBinaryOp, PYTHON_OP_MAP } from '../bindings/python';
import { PY_HELPER_DEPS } from '../runtime';

/**
 * Python compilation options
 */
export interface PythonCompileOptions {
  /** If true, immediately execute the function with None as input */
  execute?: boolean;
  /** If true, strip guard/check assertions from output */
  stripGuards?: boolean;
}

/**
 * Result of Python compilation
 */
export interface PythonCompileResult {
  /** The generated Python code */
  code: string;
  /** Whether the code uses the input variable _ */
  usesInput: boolean;
}

/**
 * Result of Python emission including required helpers
 */
interface EmitResult {
  code: string;
  requiredHelpers: Set<string>;
}

/**
 * Python operator precedence (higher = binds tighter)
 */
const PY_PRECEDENCE: Record<string, number> = {
  'or': 0,
  'and': 1,
  '==': 2, '!=': 2,
  '<': 3, '>': 3, '<=': 3, '>=': 3,
  '+': 4, '-': 4,
  '*': 5, '/': 5, '%': 5,
  '**': 6,
};

/**
 * Check if an IR expression needs parentheses when used as child of a binary op
 */
function needsParens(child: IRExpr, parentOp: string, side: 'left' | 'right'): boolean {
  if (!isNativeBinaryOp(child)) return false;

  const call = child as IRCall;
  const childOp = PYTHON_OP_MAP[call.fn];
  if (!childOp) return false;

  const parentPrec = PY_PRECEDENCE[parentOp] || 0;
  const childPrec = PY_PRECEDENCE[childOp] || 0;

  if (childPrec < parentPrec) return true;
  if (childPrec === parentPrec && side === 'right' && (parentOp === '-' || parentOp === '/')) {
    return true;
  }
  // Non-associative operators need parens when chained
  const nonAssociative = ['==', '!=', '<', '>', '<=', '>='];
  if (childPrec === parentPrec && nonAssociative.includes(parentOp) && nonAssociative.includes(childOp)) {
    return true;
  }

  return false;
}

// Create the Python standard library binding
const pyLib = createPythonBinding();

/**
 * Compiles Elo expressions to Python code
 */
export function compileToPython(expr: Expr, options?: PythonCompileOptions): string {
  const result = compileToPythonWithMeta(expr, options);
  return result.code;
}

/**
 * Compiles Elo expressions to Python with metadata about input usage.
 */
export function compileToPythonWithMeta(expr: Expr, options?: PythonCompileOptions): PythonCompileResult {
  const ir = transform(expr);
  const actuallyUsesInput = usesInput(ir);
  const emitOptions: EmitOptions = { stripGuards: options?.stripGuards || false };
  const result = emitPyWithHelpers(ir, emitOptions);

  // Resolve helper dependencies
  const allHelpers = new Set(result.requiredHelpers);
  for (const helper of result.requiredHelpers) {
    const deps = PY_HELPER_DEPS[helper];
    if (deps) {
      for (const dep of deps) {
        allHelpers.add(dep);
      }
    }
  }

  // Helpers are provided by the prelude (--prelude-only), not embedded per-expression.
  // Wrap as lambda: (lambda _: CODE)(None)
  const suffix = options?.execute ? '(None)' : '';
  return { code: `(lambda _: ${result.code})${suffix}`, usesInput: actuallyUsesInput };
}


interface EmitOptions {
  stripGuards: boolean;
}

function emitPyWithHelpers(ir: IRExpr, options: EmitOptions): EmitResult {
  const requiredHelpers = new Set<string>();
  const code = emitPy(ir, requiredHelpers, options);
  return { code, requiredHelpers };
}

/**
 * Emit Python code from IR
 */
function emitPy(ir: IRExpr, requiredHelpers?: Set<string>, options?: EmitOptions): string {
  const ctx: EmitContext<string> = {
    emit: (child) => emitPy(child, requiredHelpers, options),
    emitWithParens: (child, parentOp, side) => {
      const emitted = emitPy(child, requiredHelpers, options);
      if (needsParens(child, parentOp, side)) {
        return `(${emitted})`;
      }
      return emitted;
    },
    requireHelper: requiredHelpers ? (name) => requiredHelpers.add(name) : undefined,
  };

  switch (ir.type) {
    case 'int_literal':
    case 'float_literal':
      return ir.value.toString();

    case 'bool_literal':
      return ir.value ? 'True' : 'False';

    case 'null_literal':
      return 'None';

    case 'string_literal':
      return JSON.stringify(ir.value);

    case 'date_literal': {
      // Parse date string to emit as _elo_dt(y, m, d)
      const [y, m, d] = ir.value.split('-').map(Number);
      return `_elo_dt(${y}, ${m}, ${d})`;
    }

    case 'datetime_literal': {
      // Parse datetime string: "2024-01-15T10:30:00" or "2024-01-15T10:30:00Z"
      const dtVal = ir.value.replace(/Z$/, '');
      const [datePart, timePart] = dtVal.split('T');
      const [dy, dm, dd] = datePart.split('-').map(Number);
      if (timePart) {
        const [th, tm, ts] = timePart.split(':').map(Number);
        return `_elo_dt(${dy}, ${dm}, ${dd}, ${th}, ${tm}, ${ts || 0})`;
      }
      return `_elo_dt(${dy}, ${dm}, ${dd})`;
    }

    case 'duration_literal':
      return `EloDuration.from_iso(${JSON.stringify(ir.value)})`;

    case 'object_literal': {
      const props = ir.properties.map(p => `${JSON.stringify(p.key)}: ${ctx.emit(p.value)}`).join(', ');
      return `{${props}}`;
    }

    case 'array_literal': {
      const elements = ir.elements.map(e => ctx.emit(e)).join(', ');
      return `[${elements}]`;
    }

    case 'variable':
      return ir.name;

    case 'member_access': {
      const object = ctx.emit(ir.object);
      // Use .get() for safe access (returns None for missing keys)
      return `${object}.get(${JSON.stringify(ir.property)})`;
    }

    case 'let': {
      // Use walrus operator: (x := val, body)[-1]
      // For multiple bindings, chain: (a := 1, b := 2, body)[-1]
      const allBindings: Array<{ name: string; value: string }> = [];
      let current: IRExpr = ir;

      while (current.type === 'let') {
        for (const b of current.bindings) {
          allBindings.push({ name: b.name, value: ctx.emit(b.value) });
        }
        current = current.body;
      }

      const body = ctx.emit(current);
      const assignments = allBindings.map(b => `${b.name} := ${b.value}`);
      return `(${[...assignments, body].join(', ')})[-1]`;
    }

    case 'call':
      return pyLib.emit(ir.fn, ir.args, ir.argTypes, ctx);

    case 'if': {
      const cond = ctx.emit(ir.condition);
      const thenBranch = ctx.emit(ir.then);
      const elseBranch = ctx.emit(ir.else);
      return `(${thenBranch}) if (${cond}) else (${elseBranch})`;
    }

    case 'lambda': {
      const params = ir.params.map(p => p.name).join(', ');
      const body = ctx.emit(ir.body);
      return `lambda ${params}: ${body}`;
    }

    case 'apply': {
      const fn = ctx.emit(ir.fn);
      const args = ir.args.map(a => ctx.emit(a)).join(', ');
      // Wrap lambda in parens
      const needsParensWrap = ir.fn.type === 'lambda';
      const fnExpr = needsParensWrap ? `(${fn})` : fn;
      return `${fnExpr}(${args})`;
    }

    case 'alternative': {
      // Null-coalescing: (lambda: v if (v := a) is not None else b)()
      // For simplicity, use nested ternary
      const alts = ir.alternatives;
      if (alts.length === 1) return ctx.emit(alts[0]);

      // Build from right: last is default, each prior checks for None
      let result = ctx.emit(alts[alts.length - 1]);
      for (let i = alts.length - 2; i >= 0; i--) {
        const alt = ctx.emit(alts[i]);
        const tmpVar = `_alt${i}`;
        result = `(${tmpVar}) if (${tmpVar} := ${alt}) is not None else (${result})`;
      }
      return `(${result})`;
    }

    case 'datapath': {
      const segments = ir.segments.map(s =>
        typeof s === 'string' ? JSON.stringify(s) : s.toString()
      );
      return `[${segments.join(', ')}]`;
    }

    case 'typedef': {
      // Generate parser function for the type and bind it
      const parserCode = emitTypeExprParser(ir.typeExpr, ctx);
      ctx.requireHelper?.('pUnwrap');
      const body = ctx.emit(ir.body);
      // Use walrus pattern: (_p_Name := parser, Name := lambda v: pUnwrap(_p_Name(v, '')), body)[-1]
      return `(_p_${ir.name} := ${parserCode}, ${ir.name} := lambda v: pUnwrap(_p_${ir.name}(v, '')), ${body})[-1]`;
    }

    case 'guard': {
      const body = ctx.emit(ir.body);
      if (options?.stripGuards) {
        return body;
      }
      // Generate guard checks using kAssert helper
      ctx.requireHelper?.('kAssert');
      const guardChecks = ir.constraints.map(c => {
        const conditionCode = ctx.emit(c.condition);
        const errorMsg = c.label
          ? (c.label.includes(' ') ? c.label : `${ir.guardType} '${c.label}' failed`)
          : `${ir.guardType} failed`;
        return `kAssert(${conditionCode}, ${JSON.stringify(errorMsg)})`;
      });
      // Chain with tuple: (check1, check2, body)[-1]
      return `(${[...guardChecks, body].join(', ')})[-1]`;
    }
  }
}

/**
 * Emit a parser expression for a type expression in Python.
 * Uses combinator helpers (pSchema, pArray, pUnion, pSubtype) so that
 * each result is a single expression compatible with walrus-operator chains.
 */
function emitTypeExprParser(
  typeExpr: import('../ir').IRTypeExpr,
  ctx: EmitContext<string>
): string {
  switch (typeExpr.kind) {
    case 'type_ref': {
      const parserMap: Record<string, string> = {
        'Any': 'pAny',
        'Null': 'pNull',
        'String': 'pString',
        'Int': 'pInt',
        'Float': 'pFloat',
        'Bool': 'pBool',
        'Boolean': 'pBool',
        'Datetime': 'pDatetime',
      };
      const parserName = parserMap[typeExpr.name];
      if (parserName) {
        ctx.requireHelper?.(parserName);
        return parserName;
      }
      // User-defined type reference
      const firstChar = typeExpr.name.charAt(0);
      if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
        return `_p_${typeExpr.name}`;
      }
      throw new Error(`Unknown type in type definition: ${typeExpr.name}`);
    }

    case 'type_schema': {
      ctx.requireHelper?.('pSchema');
      const propEntries = typeExpr.properties.map(prop => {
        const propParser = emitTypeExprParser(prop.typeExpr, ctx);
        return `(${JSON.stringify(prop.key)}, ${propParser}, ${prop.optional ? 'True' : 'False'})`;
      });

      let extrasMode: string;
      let extrasParser = 'None';
      if (typeExpr.extras === undefined || typeExpr.extras === 'closed') {
        extrasMode = '"closed"';
      } else if (typeExpr.extras === 'ignored') {
        extrasMode = '"ignored"';
      } else {
        extrasMode = '"typed"';
        extrasParser = emitTypeExprParser(typeExpr.extras, ctx);
      }

      return `pSchema([${propEntries.join(', ')}], ${extrasMode}, ${extrasParser})`;
    }

    case 'subtype_constraint': {
      ctx.requireHelper?.('pSubtype');
      const baseParser = emitTypeExprParser(typeExpr.baseType, ctx);
      const varName = typeExpr.variable;

      const checks = typeExpr.constraints.map(c => {
        const conditionCode = ctx.emit(c.condition);
        const errorMsg = c.label
          ? (c.label.includes(' ') ? c.label : `constraint '${c.label}' failed`)
          : 'constraint failed';
        return `(${JSON.stringify(errorMsg)}, lambda ${varName}: ${conditionCode})`;
      });

      return `pSubtype(${baseParser}, [${checks.join(', ')}])`;
    }

    case 'array_type': {
      ctx.requireHelper?.('pArray');
      const elemParser = emitTypeExprParser(typeExpr.elementType, ctx);
      return `pArray(${elemParser})`;
    }

    case 'union_type': {
      ctx.requireHelper?.('pUnion');
      const parsers = typeExpr.types.map(t => emitTypeExprParser(t, ctx));
      return `pUnion([${parsers.join(', ')}])`;
    }
  }
}
