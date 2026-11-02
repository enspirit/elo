import { Expr, locate } from '../ast';
import { IRExpr, IRCall, usesInput } from '../ir';
import { transform } from '../transform';
import { TypeAnnotations } from '../types';
import { EmitContext } from '../stdlib';
import { createRubyBinding, isNativeBinaryOp, RUBY_OP_MAP } from '../bindings/ruby';
import { RUBY_HELPERS, RUBY_HELPER_DEPS } from '../runtime';
import { assertNumericLiteral, formatFloatLiteral, assertSafeIdentifier, assertSafeDatapathSegment } from './_validate';

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
 * Result of Ruby emission including required helpers
 */
interface EmitResult {
  code: string;
  requiredHelpers: Set<string>;
}

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
  const emitOptions: EmitOptions = { stripGuards: options?.stripGuards || false };
  const result = emitRubyWithHelpers(ir, emitOptions);

  // Resolve helper dependencies
  const allHelpers = new Set(result.requiredHelpers);
  for (const helper of result.requiredHelpers) {
    const deps = RUBY_HELPER_DEPS[helper];
    if (deps) {
      for (const dep of deps) {
        allHelpers.add(dep);
      }
    }
  }

  // Build helper definitions (sorted for deterministic output)
  const helperDefs = Array.from(allHelpers)
    .sort()
    .map(name => RUBY_HELPERS[name].replace(/\n\s*/g, '; ').replace(/; end/, ' end'))
    .join('; ');

  // Always wrap as a lambda taking _ as input parameter
  // When execute is true, add .call(nil) to call the lambda and ; to make it a statement
  const suffix = options?.execute ? '.call(nil);' : '';
  if (result.requiredHelpers.size === 0) {
    return { code: `->(_) { ${result.code} }${suffix}`, usesInput: actuallyUsesInput };
  }
  return { code: `->(_) { ${helperDefs}; ${result.code} }${suffix}`, usesInput: actuallyUsesInput };
}

/**
 * Options for Ruby emission
 */
interface EmitOptions {
  stripGuards: boolean;
}

/**
 * Emit Ruby with helper tracking
 */
function emitRubyWithHelpers(ir: IRExpr, options: EmitOptions): EmitResult {
  const requiredHelpers = new Set<string>();
  const code = emitRuby(ir, requiredHelpers, options);
  return { code, requiredHelpers };
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
 * Emit Ruby code from IR, saying where in the source a refusal was about.
 *
 * Positioned here rather than at each throw site: emission is a recursion, so
 * the node in hand is the piece of source the refusal is about, and a refusal
 * added later is positioned by the same construction. The position is there
 * only when the parse recorded one.
 */
function emitRuby(ir: IRExpr, requiredHelpers: Set<string>, options: EmitOptions): string {
  try {
    return emitRubyNode(ir, requiredHelpers, options);
  } catch (error) {
    throw locate(error, ir.loc);
  }
}

function emitRubyNode(ir: IRExpr, requiredHelpers: Set<string>, options: EmitOptions): string {
  const ctx: EmitContext<string> = {
    emit: (child) => emitRuby(child, requiredHelpers, options),
    emitWithParens: (child, parentOp, side) => {
      const emitted = emitRuby(child, requiredHelpers, options);
      if (needsParens(child, parentOp, side)) {
        return `(${emitted})`;
      }
      return emitted;
    },
    requireHelper: (name) => requiredHelpers.add(name),
  };

  switch (ir.type) {
    case 'int_literal':
      return assertNumericLiteral(ir.value).toString();

    case 'float_literal':
      return formatFloatLiteral(ir.value);

    case 'bool_literal':
      return ir.value.toString();

    case 'null_literal':
      return 'nil';

    case 'string_literal':
      return `"${escapeRubyDQ(ir.value)}"`;

    case 'date_literal':
      return `Date.parse(${JSON.stringify(ir.value)})`;

    case 'datetime_literal':
      return `DateTime.parse(${JSON.stringify(ir.value)})`;

    case 'duration_literal':
      return `ActiveSupport::Duration.parse(${JSON.stringify(ir.value)})`;

    case 'object_literal': {
      const props = ir.properties
        .map(p => `${assertSafeIdentifier(p.key, 'object_literal key')}: ${ctx.emit(p.value)}`)
        .join(', ');
      return `{${props}}`;
    }

    case 'array_literal': {
      const elements = ir.elements.map(e => ctx.emit(e)).join(', ');
      return `[${elements}]`;
    }

    case 'variable':
      return assertSafeIdentifier(ir.name, 'variable name');

    case 'member_access': {
      const object = ctx.emit(ir.object);
      const needsParensForMember = ir.object.type === 'call' && isNativeBinaryOp(ir.object);
      const objectExpr = needsParensForMember ? `(${object})` : object;
      return `${objectExpr}[:${assertSafeIdentifier(ir.property, 'member_access property')}]`;
    }

    case 'let': {
      // Collect all consecutive let bindings for flattened output
      const allBindings: Array<{ name: string; value: string }> = [];
      let current: IRExpr = ir;

      while (current.type === 'let') {
        for (const b of current.bindings) {
          allBindings.push({ name: b.name, value: ctx.emit(b.value) });
        }
        current = current.body;
      }

      const assignments = allBindings.map(b => `${assertSafeIdentifier(b.name, 'let binding name')} = ${b.value}`).join('; ');
      const body = ctx.emit(current);
      return `(${assignments}; ${body})`;
    }

    case 'call':
      return rubyLib.emit(ir.fn, ir.args, ir.argTypes, ctx);

    case 'if': {
      const cond = ctx.emit(ir.condition);
      const thenBranch = ctx.emit(ir.then);
      const elseBranch = ctx.emit(ir.else);
      return `(${cond}) ? (${thenBranch}) : (${elseBranch})`;
    }

    case 'lambda': {
      const params = ir.params.map(p => assertSafeIdentifier(p.name, 'lambda parameter')).join(', ');
      const body = ctx.emit(ir.body);
      return `->(${params}) { ${body} }`;
    }

    case 'apply': {
      const fn = ctx.emit(ir.fn);
      const args = ir.args.map(a => ctx.emit(a)).join(', ');
      return `${fn}.call(${args})`;
    }

    case 'alternative': {
      // Compile to lambda with early returns for non-nil values
      const alts = ir.alternatives;
      const parts = alts.slice(0, -1).map((alt) => {
        const code = ctx.emit(alt);
        return `v = ${code}; return v unless v.nil?`;
      });
      // Last alternative is just returned directly
      const last = ctx.emit(alts[alts.length - 1]);
      parts.push(last);
      return `->() { ${parts.join('; ')} }.call`;
    }

    case 'datapath': {
      // Compile datapath as an array of segments (symbols for strings, integers for numbers)
      const segments = ir.segments.map(s => {
        const safe = assertSafeDatapathSegment(s);
        return typeof safe === 'string' ? `:${safe}` : safe.toString();
      });
      return `[${segments.join(', ')}]`;
    }

    case 'typedef': {
      // Generate a parser lambda per type and bind it
      ctx.requireHelper('p_unwrap');
      // One assignment per definition in a single sequence, so a long prelude
      // costs one level of parentheses rather than one per type
      const decls = ir.definitions.map(definition => {
        const parserCode = emitTypeExprParser(definition.typeExpr, ctx);
        // The type name becomes a lambda that calls the parser and unwraps
        const name = assertSafeIdentifier(definition.name, 'typedef name');
        return `_p_${name} = ${parserCode}; ${name} = ->(v) { p_unwrap(_p_${name}.call(v, '')) }`;
      }).join('; ');
      const body = ctx.emit(ir.body);
      return `(${decls}; ${body})`;
    }

    case 'guard': {
      const body = ctx.emit(ir.body);
      // If stripGuards is enabled, just emit the body
      if (options.stripGuards) {
        return body;
      }
      // Generate guard checks that raise on failure. The error says which kind
      // of assertion it was and what it was called, so a host does not have to
      // read that back out of the message.
      ctx.requireHelper('p_raise');
      const guardChecks = ir.constraints.map(c => {
        const conditionCode = ctx.emit(c.condition);
        const errorMsg = c.label
          ? (c.label.includes(' ') ? c.label : `${ir.guardType} '${c.label}' failed`)
          : `${ir.guardType} failed`;
        const label = c.label ? `"${escapeRubyDQ(c.label)}"` : 'nil';
        return `p_raise('${ir.guardType}', ${label}, "${escapeRubyDQ(errorMsg)}") unless ${conditionCode}`;
      }).join('; ');
      return `(${guardChecks}; ${body})`;
    }
  }
}

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
