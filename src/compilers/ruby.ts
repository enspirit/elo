import { Expr } from '../ast';
import { IRExpr, IRCall, usesInput } from '../ir';
import { transform } from '../transform';
import { TypeAnnotations } from '../types';
import { EmitContext } from '../stdlib';
import { createRubyBinding, isNativeBinaryOp, RUBY_OP_MAP } from '../bindings/ruby';
import { RUBY_HELPERS, RUBY_HELPER_DEPS } from '../runtime';
import { assertSafeIdentifier, assertSafeDatapathSegment } from './_validate';
import { Emitter, emit, resolveHelpers } from './_emit';

/**
 * Ruby compilation options
 */
export interface RubyCompileOptions {
  /** If true, always wrap output as a lambda (even if _ is not used) */
  asFunction?: boolean;
  /** If true, immediately execute the lambda with nil as input */
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
 * Result of Ruby compilation
 */
export interface RubyCompileResult {
  /** The generated Ruby code */
  code: string;
  /** Whether the code uses the input variable _ */
  usesInput: boolean;
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
 * Check if an IR expression needs parentheses when used as child of a binary op
 */
function needsParens(child: IRExpr, parentOp: string, side: 'left' | 'right'): boolean {
  if (!isNativeBinaryOp(child)) return false;

  const call = child as IRCall;
  const childOp = RUBY_OP_MAP[call.fn];
  if (!childOp) return false;

  const parentPrec = RUBY_PRECEDENCE[parentOp] || 0;
  const childPrec = RUBY_PRECEDENCE[childOp] || 0;

  if (childPrec < parentPrec) return true;
  if (childPrec === parentPrec && side === 'right' && (parentOp === '-' || parentOp === '/')) {
    return true;
  }
  // Non-associative operators in Ruby need parens when chained
  const nonAssociative = ['==', '!=', '<', '>', '<=', '>='];
  if (childPrec === parentPrec && nonAssociative.includes(parentOp) && nonAssociative.includes(childOp)) {
    return true;
  }

  return false;
}

// Create the Ruby standard library binding
const rubyLib = createRubyBinding();

/**
 * Compiles Elo expressions to Ruby code
 *
 * This compiler works in two phases:
 * 1. Transform AST to typed IR
 * 2. Emit Ruby from IR (tracking required helpers)
 * 3. Wrap with helper definitions if needed
 *
 * If the expression uses `_` (input variable), the output is a lambda
 * that takes `_` as a parameter.
 */
export function compileToRuby(expr: Expr, options?: RubyCompileOptions): string {
  const result = compileToRubyWithMeta(expr, options);
  return result.code;
}

/**
 * Compiles Elo expressions to Ruby with metadata about input usage.
 * Use this when you need to know if the expression uses input.
 *
 * Every Elo program compiles to a lambda taking _ as input parameter.
 * The usesInput field indicates whether _ is actually referenced.
 */
export function compileToRubyWithMeta(expr: Expr, options?: RubyCompileOptions): RubyCompileResult {
  const ir = transform(expr, new Map(), new Set(), { types: options?.types });
  const actuallyUsesInput = usesInput(ir);
  const requiredHelpers = new Set<string>();
  const code = emit(ir, rubyEmitter, { stripGuards: options?.stripGuards || false }, requiredHelpers);

  const helperDefs = resolveHelpers(requiredHelpers, RUBY_HELPER_DEPS)
    .map(name => RUBY_HELPERS[name].replace(/\n\s*/g, '; ').replace(/; end/, ' end'))
    .join('; ');

  // Always wrap as a lambda taking _ as input parameter
  // When execute is true, add .call(nil) to call the lambda and ; to make it a statement
  const suffix = options?.execute ? '.call(nil);' : '';
  const prefix = helperDefs ? `${helperDefs}; ` : '';
  return { code: `->(_) { ${prefix}${code} }${suffix}`, usesInput: actuallyUsesInput };
}

/**
 * Escape a raw string for embedding inside a Ruby double-quoted string literal.
 * In particular, `#` must be escaped so that `#{...}`, `#@ivar`, `#@@cvar` and
 * `#$gvar` cannot trigger Ruby string interpolation — otherwise attacker-controlled
 * text (string literals, constraint labels, etc.) becomes executable code.
 */
function escapeRubyDQ(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/#/g, '\\#')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r');
}

/**
 * How Ruby spells each kind of IR node.
 *
 * The walk itself lives in `_emit.ts`; this is the whole of what makes the
 * emission Ruby. Children arrive already emitted.
 */
const rubyEmitter: Emitter = {
  lib: rubyLib,
  needsParens,

  boolLiteral: (value) => value.toString(),
  nullLiteral: 'nil',
  stringLiteral: (value) => `"${escapeRubyDQ(value)}"`,
  dateLiteral: (value) => `Date.parse(${JSON.stringify(value)})`,
  datetimeLiteral: (value) => `DateTime.parse(${JSON.stringify(value)})`,
  durationLiteral: (value) => `ActiveSupport::Duration.parse(${JSON.stringify(value)})`,

  objectLiteral: (properties) =>
    `{${properties.map(p => `${assertSafeIdentifier(p.key, 'object_literal key')}: ${p.value}`).join(', ')}}`,

  arrayLiteral: (elements) => `[${elements.join(', ')}]`,

  variable: (name) => assertSafeIdentifier(name, 'variable name'),

  memberAccess: (object, property, ir) => {
    const objectExpr = ir.object.type === 'call' && isNativeBinaryOp(ir.object) ? `(${object})` : object;
    return `${objectExpr}[:${assertSafeIdentifier(property, 'member_access property')}]`;
  },

  letExpr: (bindings, body) => {
    const assignments = bindings
      .map(b => `${assertSafeIdentifier(b.name, 'let binding name')} = ${b.value}`)
      .join('; ');
    return `(${assignments}; ${body})`;
  },

  ifExpr: (condition, then, otherwise) => `(${condition}) ? (${then}) : (${otherwise})`,

  lambda: (params, body) =>
    `->(${params.map(p => assertSafeIdentifier(p, 'lambda parameter')).join(', ')}) { ${body} }`,

  apply: (fn, args) => `${fn}.call(${args.join(', ')})`,

  // A lambda with an early return per branch: Ruby has no nil-coalescing
  // operator, and `||` would also take a `false` for a missing value.
  alternative: (alternatives) => {
    const parts = alternatives.slice(0, -1).map(({ code }) => `v = ${code}; return v unless v.nil?`);
    parts.push(alternatives[alternatives.length - 1].code);
    return `->() { ${parts.join('; ')} }.call`;
  },

  // Symbols for names, integers for indices
  datapath: (segments) => {
    const emitted = segments.map(s => {
      const safe = assertSafeDatapathSegment(s);
      return typeof safe === 'string' ? `:${safe}` : safe.toString();
    });
    return `[${emitted.join(', ')}]`;
  },

  // One assignment per definition in a single sequence, so a long prelude
  // costs one level of parentheses rather than one per type. The type name
  // becomes a lambda that calls the parser and unwraps the result.
  typedef: (definitions, body, ctx) => {
    ctx.requireHelper('p_unwrap');
    const decls = definitions.map(({ name, parser }) => {
      const safe = assertSafeIdentifier(name, 'typedef name');
      return `_p_${safe} = ${parser}; ${safe} = ->(v) { p_unwrap(_p_${safe}.call(v, '')) }`;
    }).join('; ');
    return `(${decls}; ${body})`;
  },

  typeParser: emitTypeExprParser,

  guard: (constraints, body, guardType, ctx) => {
    // The error says which kind of assertion it was and what it was called,
    // so a host does not have to read that back out of the message.
    ctx.requireHelper('p_raise');
    const checks = constraints.map(({ label, condition, message }) => {
      const name = label ? `"${escapeRubyDQ(label)}"` : 'nil';
      return `p_raise('${guardType}', ${name}, "${escapeRubyDQ(message)}") unless ${condition}`;
    }).join('; ');
    return `(${checks}; ${body})`;
  },

  unsupported: {},
};

/**
 * Emit a parser lambda for a type expression in Ruby
 */
function emitTypeExprParser(
  typeExpr: import('../ir').IRTypeExpr,
  ctx: EmitContext<string>
): string {
  switch (typeExpr.kind) {
    case 'type_ref': {
      // Map type name to parser helper
      const parserMap: Record<string, string> = {
        'Any': 'p_any',
        'Null': 'p_null',
        'String': 'p_string',
        'Int': 'p_int',
        'Float': 'p_float',
        'Bool': 'p_bool',
        'Boolean': 'p_bool',
        'Date': 'p_date',
        'Datetime': 'p_datetime',
        'Duration': 'p_duration',
        'Data': 'p_data',
      };
      const parserName = parserMap[typeExpr.name];
      if (parserName) {
        ctx.requireHelper(parserName);
        return `method(:${parserName})`;
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
      ctx.requireHelper('p_schema');
      const props = typeExpr.properties.map(prop => {
        const propParser = emitTypeExprParser(prop.typeExpr, ctx);
        const key = assertSafeIdentifier(prop.key, 'type_schema property key');
        return `[:${key}, ${propParser}, ${prop.optional ? 'true' : 'false'}]`;
      });

      let extrasMode: string;
      let extrasParser = 'nil';
      if (typeExpr.extras === undefined || typeExpr.extras === 'closed') {
        extrasMode = "'closed'";
      } else if (typeExpr.extras === 'ignored') {
        extrasMode = "'ignored'";
      } else {
        extrasMode = "'typed'";
        extrasParser = emitTypeExprParser(typeExpr.extras, ctx);
      }

      return `p_schema([${props.join(', ')}], ${extrasMode}, ${extrasParser})`;
    }

    case 'subtype_constraint': {
      ctx.requireHelper('p_subtype');
      const baseParser = emitTypeExprParser(typeExpr.baseType, ctx);
      const varName = assertSafeIdentifier(typeExpr.variable, 'subtype_constraint variable');

      // A constraint is its own kind of failure, and carries the label it was
      // written under. The message is escaped for a double-quoted Ruby string:
      // a user-written label must not trigger `#{...}` interpolation.
      const checks = typeExpr.constraints.map(c => {
        const conditionCode = ctx.emit(c.condition);
        const errorMsg = c.label
          ? (c.label.includes(' ') ? c.label : `constraint '${c.label}' failed`)
          : 'constraint failed';
        const label = c.label ? `"${escapeRubyDQ(c.label)}"` : 'nil';
        return `["${escapeRubyDQ(errorMsg)}", ${label}, ->(${varName}) { ${conditionCode} }]`;
      });

      return `p_subtype(${baseParser}, [${checks.join(', ')}])`;
    }

    case 'array_type': {
      ctx.requireHelper('p_array');
      return `p_array(${emitTypeExprParser(typeExpr.elementType, ctx)})`;
    }

    case 'union_type': {
      ctx.requireHelper('p_union');
      const parsers = typeExpr.types.map(t => emitTypeExprParser(t, ctx));
      return `p_union([${parsers.join(', ')}])`;
    }
  }
}
