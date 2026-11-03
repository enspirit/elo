import { Expr } from '../ast';
import { IRExpr, IRCall, usesInput } from '../ir';
import { transform } from '../transform';
import { TypeAnnotations } from '../types';
import { EmitContext } from '../stdlib';
import { createJavaScriptBinding, isNativeBinaryOp } from '../bindings/javascript';
import { JS_HELPERS, JS_HELPER_DEPS } from '../runtime';
import { assertSafeIdentifier, assertSafeDatapathSegment } from './_validate';
import { Emitter, emit, resolveHelpers } from './_emit';

/**
 * JavaScript compilation options
 */
export interface JavaScriptCompileOptions {
  /** If true, always wrap output as a function (even if _ is not used) */
  asFunction?: boolean;
  /** If true, immediately execute the function with null as input */
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
}

/**
 * Result of JavaScript compilation
 */
export interface JavaScriptCompileResult {
  /** The generated JavaScript code */
  code: string;
  /** Whether the code uses the input variable _ */
  usesInput: boolean;
}

/**
 * Compiles Elo expressions to JavaScript code
 * Uses luxon for temporal operations
 *
 * This compiler works in two phases:
 * 1. Transform AST to typed IR
 * 2. Emit JavaScript from IR, through the shared walk in `_emit.ts`
 * 3. Wrap in IIFE with helper definitions if needed
 *
 * If the expression uses `_` (input variable), the output is a function
 * that takes `_` as a parameter instead of an IIFE.
 */
export function compileToJavaScript(expr: Expr, options?: JavaScriptCompileOptions): string {
  const result = compileToJavaScriptWithMeta(expr, options);
  return result.code;
}

/**
 * Compiles Elo expressions to JavaScript with metadata about input usage.
 * Use this when you need to know if the expression uses input.
 *
 * Every Elo program compiles to a function taking _ as input parameter.
 * The usesInput field indicates whether _ is actually referenced.
 */
export function compileToJavaScriptWithMeta(expr: Expr, options?: JavaScriptCompileOptions): JavaScriptCompileResult {
  const ir = transform(expr, new Map(), new Set(), { types: options?.types });
  const actuallyUsesInput = usesInput(ir);
  const requiredHelpers = new Set<string>();
  const code = emit(ir, jsEmitter, { stripGuards: options?.stripGuards || false }, requiredHelpers);

  const helperDefs = resolveHelpers(requiredHelpers, JS_HELPER_DEPS)
    .map(name => JS_HELPERS[name].replace(/\n\s*/g, ' '))
    .join(' ');

  // Always wrap as a function taking _ as input parameter
  // When execute is true, add (null) to call the function and ; to make it a statement
  const suffix = options?.execute ? '(null);' : '';
  const prefix = helperDefs ? `${helperDefs} ` : '';
  return { code: `(function(_) { ${prefix}return ${code}; })${suffix}`, usesInput: actuallyUsesInput };
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
 * How JavaScript spells each kind of IR node.
 *
 * The walk itself lives in `_emit.ts`; this is the whole of what makes the
 * emission JavaScript. Children arrive already emitted.
 */
const jsEmitter: Emitter = {
  lib: jsLib,
  needsParens,

  boolLiteral: (value) => value.toString(),
  nullLiteral: 'null',
  stringLiteral: (value) => JSON.stringify(value),
  dateLiteral: (value) => `DateTime.fromISO(${JSON.stringify(value)})`,
  datetimeLiteral: (value) => `DateTime.fromISO(${JSON.stringify(value)})`,
  durationLiteral: (value) => `Duration.fromISO(${JSON.stringify(value)})`,

  // Wrapped in parens to avoid the ambiguity with a block.
  //
  // `__proto__: v` as a bare (or quoted) key runs the [[Prototype]] setter
  // instead of defining a data property — so `{__proto__: x}` would repoint the
  // object's prototype, losing the key and, with a function value, defeating a
  // `typeof === 'object'` guard downstream. A *computed* key `['__proto__']: v`
  // defines an own property, which is what Elo means by a key named __proto__.
  objectLiteral: (properties) =>
    `({${properties.map(p => {
      const key = assertSafeIdentifier(p.key, 'object_literal key');
      return key === '__proto__' ? `['__proto__']: ${p.value}` : `${key}: ${p.value}`;
    }).join(', ')}})`,

  arrayLiteral: (elements) => `[${elements.join(', ')}]`,

  variable: (name) => assertSafeIdentifier(name, 'variable name'),

  memberAccess: (object, property, ir) => {
    const objectExpr = ir.object.type === 'call' ? `(${object})` : object;
    return `${objectExpr}.${assertSafeIdentifier(property, 'member_access property')}`;
  },

  letExpr: (bindings, body) => {
    const declarations = bindings
      .map(b => `const ${assertSafeIdentifier(b.name, 'let binding name')} = ${b.value};`)
      .join(' ');
    return `(() => { ${declarations} return ${body}; })()`;
  },

  ifExpr: (condition, then, otherwise) => `(${condition}) ? (${then}) : (${otherwise})`,

  lambda: (params, body) =>
    `(${params.map(p => assertSafeIdentifier(p, 'lambda parameter')).join(', ')}) => ${body}`,

  apply: (fn, args, ir) => {
    // Wrap the function in parens if it is a lambda expression
    const fnExpr = ir.fn.type === 'lambda' ? `(${fn})` : fn;
    return `${fnExpr}(${args.join(', ')})`;
  },

  // A nullish coalescing chain: a ?? b ?? c, each branch parenthesised when
  // it is a complex expression.
  alternative: (alternatives) => {
    const alts = alternatives.map(({ code, node }) =>
      node.type === 'call' || node.type === 'alternative' ? `(${code})` : code
    );
    return `(${alts.join(' ?? ')})`;
  },

  datapath: (segments) => {
    const emitted = segments.map(s => {
      const safe = assertSafeDatapathSegment(s);
      return typeof safe === 'string' ? JSON.stringify(safe) : safe.toString();
    });
    return `[${emitted.join(', ')}]`;
  },

  // One declaration per definition in a single scope, so a long prelude costs
  // one closure rather than one per type. The type name becomes a function
  // that calls the parser and unwraps the result.
  typedef: (definitions, body, ctx) => {
    ctx.requireHelper('pUnwrap');
    const decls = definitions.map(({ name, parser }) => {
      const safe = assertSafeIdentifier(name, 'typedef name');
      return `const _p_${safe} = ${parser}; const ${safe} = (v) => pUnwrap(_p_${safe}(v, ''));`;
    }).join(' ');
    return `(() => { ${decls} return ${body}; })()`;
  },

  typeParser: emitTypeExprParser,

  guard: (constraints, body, guardType, ctx) => {
    // The error says which kind of assertion it was and what it was called,
    // so a host does not have to read that back out of the message.
    ctx.requireHelper('pRaise');
    const checks = constraints.map(({ label, condition, message }) => {
      const name = label ? JSON.stringify(label) : 'null';
      return `if (!(${condition})) pRaise(${JSON.stringify(guardType)}, ${name}, ${JSON.stringify(message)});`;
    }).join(' ');
    return `(() => { ${checks} return ${body}; })()`;
  },

  unsupported: {},
};

/**
 * Emit a parser function for a type expression
 */
function emitTypeExprParser(
  typeExpr: import('../ir').IRTypeExpr,
  ctx: EmitContext<string>
): string {
  switch (typeExpr.kind) {
    case 'type_ref': {
      // Map type name to parser helper
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
      // Check if it's a user-defined type (uppercase identifier not in built-ins)
      // User-defined types are referenced as _p_TypeName
      const firstChar = typeExpr.name.charAt(0);
      if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
        return `_p_${assertSafeIdentifier(typeExpr.name, 'type reference')}`;
      }
      throw new Error(`Unknown type in type definition: ${typeExpr.name}`);
    }

    case 'type_schema': {
      ctx.requireHelper('pSchema');
      const props = typeExpr.properties.map(prop => {
        const propParser = emitTypeExprParser(prop.typeExpr, ctx);
        const key = assertSafeIdentifier(prop.key, 'type_schema property key');
        return `[${JSON.stringify(key)}, ${propParser}, ${prop.optional ? 'true' : 'false'}]`;
      });

      let extrasMode: string;
      let extrasParser = 'null';
      if (typeExpr.extras === undefined || typeExpr.extras === 'closed') {
        extrasMode = "'closed'";
      } else if (typeExpr.extras === 'ignored') {
        extrasMode = "'ignored'";
      } else {
        extrasMode = "'typed'";
        extrasParser = emitTypeExprParser(typeExpr.extras, ctx);
      }

      return `pSchema([${props.join(', ')}], ${extrasMode}, ${extrasParser})`;
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
        const label = c.label ? JSON.stringify(c.label) : 'null';
        return `[${JSON.stringify(errorMsg)}, ${label}, (${varName}) => ${conditionCode}]`;
      });

      return `pSubtype(${baseParser}, [${checks.join(', ')}])`;
    }

    case 'array_type': {
      ctx.requireHelper('pArray');
      return `pArray(${emitTypeExprParser(typeExpr.elementType, ctx)})`;
    }

    case 'union_type': {
      ctx.requireHelper('pUnion');
      const parsers = typeExpr.types.map(t => emitTypeExprParser(t, ctx));
      return `pUnion([${parsers.join(', ')}])`;
    }
  }
}
