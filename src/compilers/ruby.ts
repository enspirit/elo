import { Expr } from '../ast';
import { IRExpr, IRCall, usesInput } from '../ir';
import { transform } from '../transform';
import { EmitContext } from '../stdlib';
import { createRubyBinding, isNativeBinaryOp, RUBY_OP_MAP } from '../bindings/ruby';
import { RUBY_HELPERS, RUBY_HELPER_DEPS } from '../runtime';

/**
 * Ruby compilation options
 */
export interface RubyCompileOptions {
  /** If true, always wrap output as a lambda (even if _ is not used) */
  asFunction?: boolean;
  /** If true, immediately execute the lambda with nil as input */
  execute?: boolean;
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
  const ir = transform(expr);
  const actuallyUsesInput = usesInput(ir);
  const result = emitRubyWithHelpers(ir);

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
 * Emit Ruby with helper tracking
 */
function emitRubyWithHelpers(ir: IRExpr): EmitResult {
  // Reset counter for deterministic output
  typeParserVarCounter = 0;
  const requiredHelpers = new Set<string>();
  const code = emitRuby(ir, requiredHelpers);
  return { code, requiredHelpers };
}

/**
 * Emit Ruby code from IR
 */
function emitRuby(ir: IRExpr, requiredHelpers?: Set<string>): string {
  const ctx: EmitContext<string> = {
    emit: (child) => emitRuby(child, requiredHelpers),
    emitWithParens: (child, parentOp, side) => {
      const emitted = emitRuby(child, requiredHelpers);
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
      return ir.value.toString();

    case 'null_literal':
      return 'nil';

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

    case 'object_literal': {
      const props = ir.properties.map(p => `${p.key}: ${ctx.emit(p.value)}`).join(', ');
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
      const needsParensForMember = ir.object.type === 'call' && isNativeBinaryOp(ir.object);
      const objectExpr = needsParensForMember ? `(${object})` : object;
      return `${objectExpr}[:${ir.property}]`;
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

      const assignments = allBindings.map(b => `${b.name} = ${b.value}`).join('; ');
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
      const params = ir.params.map(p => p.name).join(', ');
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
      const segments = ir.segments.map(s =>
        typeof s === 'string' ? `:${s}` : s.toString()
      );
      return `[${segments.join(', ')}]`;
    }

    case 'typedef': {
      // Generate parser lambda for the type and bind it
      const parserCode = emitTypeExprParser(ir.typeExpr, ctx);
      ctx.requireHelper?.('p_unwrap');
      const body = ctx.emit(ir.body);
      // The type name becomes a lambda that calls the parser and unwraps
      return `(_p_${ir.name} = ${parserCode}; ${ir.name} = ->(v) { p_unwrap(_p_${ir.name}.call(v, '')) }; ${body})`;
    }
  }
}

/**
 * Counter for generating unique variable names in nested type parsers
 */
let typeParserVarCounter = 0;

/**
 * Get a unique variable suffix for type parser variables
 */
function nextVarSuffix(): string {
  return `_${typeParserVarCounter++}`;
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
        'Datetime': 'p_datetime',
      };
      const parserName = parserMap[typeExpr.name];
      if (parserName) {
        ctx.requireHelper?.(parserName);
        return `method(:${parserName})`;
      }
      // Check if it's a user-defined type (uppercase identifier not in built-ins)
      // User-defined types are referenced as _p_TypeName
      const firstChar = typeExpr.name.charAt(0);
      if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
        return `_p_${typeExpr.name}`;
      }
      throw new Error(`Unknown type in type definition: ${typeExpr.name}`);
    }

    case 'type_schema': {
      // Object schema: generate inline parser lambda
      // Use unique variable names to avoid Ruby closure issues with nested schemas
      ctx.requireHelper?.('p_ok');
      ctx.requireHelper?.('p_fail');
      const suffix = nextVarSuffix();
      const oVar = `_o${suffix}`;
      const propParsers = typeExpr.properties.map(prop => {
        const propParser = emitTypeExprParser(prop.typeExpr, ctx);
        return { key: prop.key, parser: propParser, optional: prop.optional };
      });
      const knownKeys = typeExpr.properties.map(p => p.key);

      // Generate object parser with unique variable names
      const propChecks = propParsers.map(({ key, parser, optional }) => {
        const rVar = `_r_${key}${suffix}`;
        if (optional) {
          // Optional: if value is null/undefined, skip attribute; otherwise parse
          return `unless v[:${key}].nil?; ${rVar} = (${parser}).call(v[:${key}], p + '.${key}'); return p_fail(p, nil, [${rVar}]) unless ${rVar}[:success]; ${oVar}[:${key}] = ${rVar}[:value]; end`;
        }
        // Required: parse and fail if not successful
        return `${rVar} = (${parser}).call(v[:${key}], p + '.${key}'); return p_fail(p, nil, [${rVar}]) unless ${rVar}[:success]; ${oVar}[:${key}] = ${rVar}[:value]`;
      }).join('; ');

      // Handle extras based on the extras mode
      let extrasCheck: string;
      const knownKeysArr = knownKeys.map(k => `:${k}`).join(', ');
      const ksVar = `_ks${suffix}`;
      if (typeExpr.extras === undefined || typeExpr.extras === 'closed') {
        // Closed: fail if any extra keys exist
        extrasCheck = `${ksVar} = [${knownKeysArr}]; v.each_key { |_k| return p_fail(p + '.' + _k.to_s, 'unexpected attribute') unless ${ksVar}.include?(_k) }`;
      } else if (typeExpr.extras === 'ignored') {
        // Ignored: no check, extras are silently ignored
        extrasCheck = '';
      } else {
        // Typed extras: parse each extra key with the given type
        const extrasParser = emitTypeExprParser(typeExpr.extras, ctx);
        const epVar = `_ep${suffix}`;
        const reVar = `_re${suffix}`;
        extrasCheck = `${ksVar} = [${knownKeysArr}]; ${epVar} = ${extrasParser}; v.each_key { |_k| unless ${ksVar}.include?(_k); ${reVar} = ${epVar}.call(v[_k], p + '.' + _k.to_s); return p_fail(p, nil, [${reVar}]) unless ${reVar}[:success]; ${oVar}[_k] = ${reVar}[:value]; end }`;
      }

      return `->(v, p) { return p_fail(p, 'expected object, got ' + (v.nil? ? 'Null' : v.class.to_s)) unless v.is_a?(Hash); ${oVar} = {}; ${propChecks}; ${extrasCheck}; p_ok(${oVar}, p) }`;
    }

    case 'subtype_constraint': {
      // Subtype constraint: Int(i | i > 0)
      // First parse with base type, then check constraint
      ctx.requireHelper?.('p_ok');
      ctx.requireHelper?.('p_fail');
      const baseParser = emitTypeExprParser(typeExpr.baseType, ctx);
      const constraintCode = ctx.emit(typeExpr.constraint);
      const varName = typeExpr.variable;

      return `->(v, p) { _r = (${baseParser}).call(v, p); return _r unless _r[:success]; ${varName} = _r[:value]; return p_fail(p, 'constraint violated') unless (${constraintCode}); _r }`;
    }

    case 'array_type': {
      // Array type: [Int]
      // Parse each element with the element type
      ctx.requireHelper?.('p_ok');
      ctx.requireHelper?.('p_fail');
      const elemParser = emitTypeExprParser(typeExpr.elementType, ctx);

      return `->(v, p) { return p_fail(p, 'expected array, got ' + (v.nil? ? 'Null' : v.class.to_s)) unless v.is_a?(Array); _el = ${elemParser}; _a = []; v.each_with_index { |_e, _i| _r = _el.call(_e, p + '.' + _i.to_s); return p_fail(p, nil, [_r]) unless _r[:success]; _a << _r[:value] }; p_ok(_a, p) }`;
    }

    case 'union_type': {
      // Union type: Int|String
      // Try each type in order, return first successful parse (PEG-style)
      ctx.requireHelper?.('p_fail');
      const parsers = typeExpr.types.map(t => emitTypeExprParser(t, ctx));

      // Generate tries: call each parser directly in order
      const tries = parsers.map(p => `_r = (${p}).call(v, p); return _r if _r[:success]; _causes << _r`).join('; ');

      return `->(v, p) { _causes = []; ${tries}; p_fail(p, 'no union alternative matched', _causes) }`;
    }
  }
}
