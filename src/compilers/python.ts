import { Expr } from '../ast';
import { IRExpr, IRCall, usesInput } from '../ir';
import { transform } from '../transform';
import { TypeAnnotations } from '../types';
import { EmitContext } from '../stdlib';
import { createPythonBinding, isNativeBinaryOp, PYTHON_OP_MAP } from '../bindings/python';
import { assertSafeIdentifier, assertSafeDatapathSegment, assertSafeTimezone } from './_validate';
import { DEFAULT_TIMEZONE } from '../runtime';
import { Emitter, emit, resolveHelpers } from './_emit';

/**
 * Python compilation options
 */
export interface PythonCompileOptions {
  /** If true, immediately execute the function with None as input */
  execute?: boolean;
  /** If true, strip guard/check assertions from output */
  stripGuards?: boolean;
  /**
   * Types the checker found for the AST, from `typecheckWithAnnotations`.
   *
   * With it, a declared field or coerced value gets a typed implementation
   * instead of a runtime dispatcher. Without it the emission is exactly what
   * it always was, which is why the compile path never calls the checker
   * itself.
   */
  types?: TypeAnnotations;
  /** Dispatch every call as though no operand type were known. */
  forceDynamic?: boolean;
  /**
   * The zone `NOW` and `TODAY` are read in, as an IANA name. Defaults to `UTC`.
   * 0259 D2: reaches the emission through the zone helper alone.
   */
  timezone?: string;
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

/** The operators Python chains, and PostgreSQL refuses to associate. */
const COMPARISONS = ['==', '!=', '<', '>', '<=', '>='];

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
  // Python *chains* comparisons rather than nesting them: `1 < 2 == True` is
  // `1 < 2 and 2 == True`, which is False where Elo means `(1 < 2) == true`.
  // The table above gives the ordering operators a tighter precedence than
  // equality, as C does, but Python has one comparison level and chains across
  // all of it — so a comparison inside a comparison is always parenthesised,
  // whatever their relative precedence here.
  if (COMPARISONS.includes(parentOp) && COMPARISONS.includes(childOp)) {
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
  const ir = transform(expr, new Map(), new Set(), { types: options?.types, forceDynamic: options?.forceDynamic });
  const actuallyUsesInput = usesInput(ir);
  // Helpers are provided by the prelude (--prelude-only), not embedded
  // per-expression, so the set is collected and not read back.
  const zone = assertSafeTimezone(options?.timezone ?? DEFAULT_TIMEZONE);
  const requiredHelpers = new Set<string>();
  const code = emit(ir, pyEmitter, { stripGuards: options?.stripGuards || false, timezone: zone }, requiredHelpers);

  // Wrap as lambda: (lambda _: CODE)(None)
  const suffix = options?.execute ? '(None)' : '';
  return { code: `(lambda _: ${code})${suffix}`, usesInput: actuallyUsesInput };
}


/**
 * How Python spells each kind of IR node.
 *
 * The walk itself lives in `_emit.ts`; this is the whole of what makes the
 * emission Python. Children arrive already emitted.
 *
 * Python has no block expression, so a sequence is a tuple read at `[-1]` and
 * a binding is a walrus.
 */
const pyEmitter: Emitter = {
  lib: pyLib,
  needsParens,

  boolLiteral: (value) => (value ? 'True' : 'False'),
  nullLiteral: 'None',
  stringLiteral: (value) => JSON.stringify(value),

  dateLiteral: (value) => {
    const [y, m, d] = value.split('-').map(Number);
    return `_elo_dt(${y}, ${m}, ${d})`;
  },

  datetimeLiteral: (value) => {
    // "2024-01-15T10:30:00" or "2024-01-15T10:30:00Z"
    const [datePart, timePart] = value.replace(/Z$/, '').split('T');
    const [dy, dm, dd] = datePart.split('-').map(Number);
    if (!timePart) return `_elo_dt(${dy}, ${dm}, ${dd})`;
    const [th, tm, ts] = timePart.split(':').map(Number);
    return `_elo_dt(${dy}, ${dm}, ${dd}, ${th}, ${tm}, ${ts || 0})`;
  },

  durationLiteral: (value) => `EloDuration.from_iso(${JSON.stringify(value)})`,

  objectLiteral: (properties) =>
    `{${properties.map(p => `${JSON.stringify(p.key)}: ${p.value}`).join(', ')}}`,

  arrayLiteral: (elements) => `[${elements.join(', ')}]`,

  variable: (name) => assertSafeIdentifier(name, 'variable name'),

  memberAccess: (object, property) =>
    `${object}.get(${JSON.stringify(assertSafeIdentifier(property, 'member_access property'))})`,

  letExpr: (bindings, body) => {
    const assignments = bindings
      .map(b => `${assertSafeIdentifier(b.name, 'let binding name')} := ${b.value}`);
    return `(${[...assignments, body].join(', ')})[-1]`;
  },

  // Parenthesised as a whole: a conditional expression binds looser than
  // almost everything, so an unwrapped one lets the operator around it
  // swallow the then-branch — `a + x if cond else y` is `(a + x) if cond else y`.
  ifExpr: (condition, then, otherwise) => `((${then}) if (${condition}) else (${otherwise}))`,

  lambda: (params, body) =>
    `lambda ${params.map(p => assertSafeIdentifier(p, 'lambda parameter')).join(', ')}: ${body}`,

  apply: (fn, args, ir) => {
    const fnExpr = ir.fn.type === 'lambda' ? `(${fn})` : fn;
    return `${fnExpr}(${args.join(', ')})`;
  },

  // Built from the right: the last branch is the default, each prior one binds
  // a walrus and checks it for None.
  alternative: (alternatives) => {
    if (alternatives.length === 1) return alternatives[0].code;
    let result = alternatives[alternatives.length - 1].code;
    for (let i = alternatives.length - 2; i >= 0; i--) {
      const tmpVar = `_alt${i}`;
      result = `(${tmpVar}) if (${tmpVar} := ${alternatives[i].code}) is not None else (${result})`;
    }
    return `(${result})`;
  },

  datapath: (segments) => {
    const emitted = segments.map(s => {
      const safe = assertSafeDatapathSegment(s);
      return typeof safe === 'string' ? JSON.stringify(safe) : safe.toString();
    });
    return `[${emitted.join(', ')}]`;
  },

  // All definitions go in one tuple, so a long prelude costs one level of
  // nesting rather than one per type. The type name becomes a lambda that
  // calls the parser and unwraps the result.
  typedef: (definitions, body, ctx) => {
    ctx.requireHelper('pUnwrap');
    const decls = definitions.flatMap(({ name, parser }) => {
      const safe = assertSafeIdentifier(name, 'typedef name');
      return [`_p_${safe} := ${parser}`, `${safe} := lambda v: pUnwrap(_p_${safe}(v, ''))`];
    });
    return `(${[...decls, body].join(', ')})[-1]`;
  },

  typeParser: emitTypeExprParser,

  guard: (constraints, body, guardType, ctx) => {
    // The error says which kind of assertion it was and what it was called,
    // so a host does not have to read that back out of the message.
    ctx.requireHelper('pAssert');
    const checks = constraints.map(({ label, condition, message }) => {
      const name = label ? JSON.stringify(label) : 'None';
      return `pAssert(${condition}, ${JSON.stringify(guardType)}, ${name}, ${JSON.stringify(message)})`;
    });
    return `(${[...checks, body].join(', ')})[-1]`;
  },

  unsupported: {},
};

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
        'Date': 'pDate',
        'Datetime': 'pDatetime',
        'Duration': 'pDuration',
        'Data': 'pData',
      };
      const parserName = parserMap[typeExpr.name];
      if (parserName) {
        ctx.requireHelper(parserName);
        return parserName;
      }
      // User-defined type reference
      const firstChar = typeExpr.name.charAt(0);
      if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
        return `_p_${assertSafeIdentifier(typeExpr.name, 'type reference')}`;
      }
      throw new Error(`Unknown type in type definition: ${typeExpr.name}`);
    }

    case 'type_schema': {
      ctx.requireHelper('pSchema');
      const propEntries = typeExpr.properties.map(prop => {
        const propParser = emitTypeExprParser(prop.typeExpr, ctx);
        const key = assertSafeIdentifier(prop.key, 'type_schema property key');
        return `(${JSON.stringify(key)}, ${propParser}, ${prop.optional ? 'True' : 'False'})`;
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
      ctx.requireHelper('pSubtype');
      const baseParser = emitTypeExprParser(typeExpr.baseType, ctx);
      const varName = assertSafeIdentifier(typeExpr.variable, 'subtype_constraint variable');

      // A constraint is its own kind of failure, and carries the label it was
      // written under.
      const checks = typeExpr.constraints.map(c => {
        const conditionCode = ctx.emit(c.condition);
        const errorMsg = c.label
          ? (c.label.includes(' ') ? c.label : `constraint '${c.label}' failed`)
          : 'constraint failed';
        const label = c.label ? JSON.stringify(c.label) : 'None';
        return `(${JSON.stringify(errorMsg)}, ${label}, lambda ${varName}: ${conditionCode})`;
      });

      return `pSubtype(${baseParser}, [${checks.join(', ')}])`;
    }

    case 'array_type': {
      ctx.requireHelper('pArray');
      const elemParser = emitTypeExprParser(typeExpr.elementType, ctx);
      return `pArray(${elemParser})`;
    }

    case 'union_type': {
      ctx.requireHelper('pUnion');
      const parsers = typeExpr.types.map(t => emitTypeExprParser(t, ctx));
      return `pUnion([${parsers.join(', ')}])`;
    }
  }
}
