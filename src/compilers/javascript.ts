import { Expr } from "../ast";
import { IRExpr, IRCall, usesInput } from "../ir";
import { transform } from "../transform";
import { EmitContext } from "../stdlib";
import {
  createJavaScriptBinding,
  isNativeBinaryOp,
} from "../bindings/javascript";
import { JS_HELPERS, JS_HELPER_DEPS } from "../runtime";

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
 * Result of JavaScript emission including required helpers
 */
interface EmitResult {
  code: string;
  requiredHelpers: Set<string>;
}

/**
 * Compiles Elo expressions to JavaScript code
 * Uses luxon for temporal operations
 *
 * This compiler works in two phases:
 * 1. Transform AST to typed IR
 * 2. Emit JavaScript from IR (tracking required helpers)
 * 3. Wrap in IIFE with helper definitions if needed
 *
 * If the expression uses `_` (input variable), the output is a function
 * that takes `_` as a parameter instead of an IIFE.
 */
export function compileToJavaScript(
  expr: Expr,
  options?: JavaScriptCompileOptions,
): string {
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
export function compileToJavaScriptWithMeta(
  expr: Expr,
  options?: JavaScriptCompileOptions,
): JavaScriptCompileResult {
  const ir = transform(expr);
  const actuallyUsesInput = usesInput(ir);
  const emitOptions = { stripGuards: options?.stripGuards || false };
  const result = emitJSWithHelpers(ir, emitOptions);

  // Resolve helper dependencies
  const allHelpers = new Set(result.requiredHelpers);
  for (const helper of result.requiredHelpers) {
    const deps = JS_HELPER_DEPS[helper];
    if (deps) {
      for (const dep of deps) {
        allHelpers.add(dep);
      }
    }
  }

  // Build helper definitions (sorted for deterministic output)
  const helperDefs = Array.from(allHelpers)
    .sort()
    .map((name) => JS_HELPERS[name].replace(/\n\s*/g, " "))
    .join(" ");

  // Always wrap as a function taking _ as input parameter
  // When execute is true, add (null) to call the function and ; to make it a statement
  const suffix = options?.execute ? "(null);" : "";
  if (result.requiredHelpers.size === 0) {
    return {
      code: `(function(_) { return ${result.code}; })${suffix}`,
      usesInput: actuallyUsesInput,
    };
  }
  return {
    code: `(function(_) { ${helperDefs} return ${result.code}; })${suffix}`,
    usesInput: actuallyUsesInput,
  };
}

/**
 * Options for JS emission
 */
interface EmitOptions {
  stripGuards: boolean;
}

/**
 * Emit JavaScript with helper tracking
 */
function emitJSWithHelpers(ir: IRExpr, options: EmitOptions): EmitResult {
  const requiredHelpers = new Set<string>();
  const code = emitJS(ir, requiredHelpers, options);
  return { code, requiredHelpers };
}

/**
 * JavaScript operator precedence (higher = binds tighter)
 */
const JS_PRECEDENCE: Record<string, number> = {
  "||": 1,
  "&&": 2,
  "==": 3,
  "!=": 3,
  "<": 4,
  ">": 4,
  "<=": 4,
  ">=": 4,
  "+": 5,
  "-": 5,
  "*": 6,
  "/": 6,
  "%": 6,
};

/**
 * Map IR function names to JS operators for precedence checking
 */
const OP_MAP: Record<string, string> = {
  add: "+",
  sub: "-",
  mul: "*",
  div: "/",
  mod: "%",
  lt: "<",
  gt: ">",
  lte: "<=",
  gte: ">=",
  eq: "==",
  neq: "!=",
  and: "&&",
  or: "||",
};

/**
 * Check if an IR expression needs parentheses when used as child of a binary op
 */
function needsParens(
  child: IRExpr,
  parentOp: string,
  side: "left" | "right",
): boolean {
  if (!isNativeBinaryOp(child)) return false;

  const call = child as IRCall;
  const childOp = OP_MAP[call.fn];
  if (!childOp) return false;

  const parentPrec = JS_PRECEDENCE[parentOp] || 0;
  const childPrec = JS_PRECEDENCE[childOp] || 0;

  if (childPrec < parentPrec) return true;
  if (childPrec === parentPrec && side === "right") return true;

  return false;
}

// Create the JavaScript standard library binding
const jsLib = createJavaScriptBinding();

/**
 * Emit JavaScript code from IR
 */
function emitJS(
  ir: IRExpr,
  requiredHelpers?: Set<string>,
  options?: EmitOptions,
): string {
  const ctx: EmitContext<string> = {
    emit: (child) => emitJS(child, requiredHelpers, options),
    emitWithParens: (child, parentOp, side) => {
      const emitted = emitJS(child, requiredHelpers, options);
      if (needsParens(child, parentOp, side)) {
        return `(${emitted})`;
      }
      return emitted;
    },
    requireHelper: requiredHelpers
      ? (name) => requiredHelpers.add(name)
      : undefined,
  };

  switch (ir.type) {
    case "int_literal":
    case "float_literal":
      return ir.value.toString();

    case "bool_literal":
      return ir.value.toString();

    case "null_literal":
      return "null";

    case "string_literal":
      return JSON.stringify(ir.value);

    case "date_literal":
      return `DateTime.fromISO('${ir.value}')`;

    case "datetime_literal":
      return `DateTime.fromISO('${ir.value}')`;

    case "duration_literal":
      return `Duration.fromISO('${ir.value}')`;

    case "object_literal": {
      const props = ir.properties
        .map((p) => `${p.key}: ${ctx.emit(p.value)}`)
        .join(", ");
      // Wrap in parens to avoid parsing ambiguity with blocks
      return `({${props}})`;
    }

    case "array_literal": {
      const elements = ir.elements.map((e) => ctx.emit(e)).join(", ");
      return `[${elements}]`;
    }

    case "variable":
      return ir.name;

    case "member_access": {
      const object = ctx.emit(ir.object);
      const needsParensForMember = ir.object.type === "call";
      const objectExpr = needsParensForMember ? `(${object})` : object;
      return `${objectExpr}.${ir.property}`;
    }

    case "let": {
      // Collect consecutive let bindings, but stop if we encounter shadowing
      const allBindings: Array<{ name: string; value: string }> = [];
      const seenNames = new Set<string>();
      let current: IRExpr = ir;

      while (current.type === "let") {
        let hasShadowing = false;
        for (const b of current.bindings) {
          if (seenNames.has(b.name)) {
            hasShadowing = true;
            break;
          }
        }
        if (hasShadowing) {
          // Stop flattening - emit nested IIFE for proper scoping
          break;
        }
        for (const b of current.bindings) {
          seenNames.add(b.name);
          allBindings.push({ name: b.name, value: ctx.emit(b.value) });
        }
        current = current.body;
      }

      const declarations = allBindings
        .map((b) => `const ${b.name} = ${b.value};`)
        .join(" ");
      const body = ctx.emit(current);
      return `(() => { ${declarations} return ${body}; })()`;
    }

    case "call":
      return jsLib.emit(ir.fn, ir.args, ir.argTypes, ctx);

    case "if": {
      const cond = ctx.emit(ir.condition);
      const thenBranch = ctx.emit(ir.then);
      const elseBranch = ctx.emit(ir.else);
      return `(${cond}) ? (${thenBranch}) : (${elseBranch})`;
    }

    case "lambda": {
      const params = ir.params.map((p) => p.name).join(", ");
      const body = ctx.emit(ir.body);
      return `(${params}) => ${body}`;
    }

    case "apply": {
      const fn = ctx.emit(ir.fn);
      const args = ir.args.map((a) => ctx.emit(a)).join(", ");
      // Wrap function in parens if it's a lambda expression
      const needsParens = ir.fn.type === "lambda";
      const fnExpr = needsParens ? `(${fn})` : fn;
      return `${fnExpr}(${args})`;
    }

    case "alternative": {
      // Compile to nullish coalescing chain: a ?? b ?? c
      const alts = ir.alternatives.map((alt) => {
        const code = ctx.emit(alt);
        // Wrap in parens if it's a complex expression
        return alt.type === "call" || alt.type === "alternative"
          ? `(${code})`
          : code;
      });
      return alts.join(" ?? ");
    }

    case "datapath": {
      // Compile datapath as an array of segments
      const segments = ir.segments.map((s) =>
        typeof s === "string" ? JSON.stringify(s) : s.toString(),
      );
      return `[${segments.join(", ")}]`;
    }

    case "typedef": {
      // Generate parser function for the type and bind it
      // Wrap it so calling TypeName(value) auto-unwraps the result
      const parserCode = emitTypeExprParser(ir.typeExpr, ctx);
      ctx.requireHelper?.("pUnwrap");
      const body = ctx.emit(ir.body);
      // The type name becomes a function that calls the parser and unwraps
      return `(() => { const _p_${ir.name} = ${parserCode}; const ${ir.name} = (v) => pUnwrap(_p_${ir.name}(v, '')); return ${body}; })()`;
    }

    case "guard": {
      const body = ctx.emit(ir.body);
      // If stripGuards is enabled, just emit the body
      if (options?.stripGuards) {
        return body;
      }
      // Generate guard checks that throw on failure
      const guardChecks = ir.constraints
        .map((c) => {
          const conditionCode = ctx.emit(c.condition);
          const errorMsg = c.label
            ? c.label.includes(" ")
              ? c.label
              : `${ir.guardType} '${c.label}' failed`
            : `${ir.guardType} failed`;
          // Escape single quotes in the error message for JS string
          const escapedMsg = errorMsg.replace(/'/g, "\\'");
          return `if (!(${conditionCode})) throw new Error('${escapedMsg}');`;
        })
        .join(" ");
      return `(() => { ${guardChecks} return ${body}; })()`;
    }
  }
}

/**
 * Emit a parser function for a type expression
 */
function emitTypeExprParser(
  typeExpr: import("../ir").IRTypeExpr,
  ctx: EmitContext<string>,
): string {
  switch (typeExpr.kind) {
    case "type_ref": {
      // Map type name to parser helper
      const parserMap: Record<string, string> = {
        Any: "pAny",
        Null: "pNull",
        String: "pString",
        Int: "pInt",
        Float: "pFloat",
        Bool: "pBool",
        Boolean: "pBool",
        Datetime: "pDatetime",
      };
      const parserName = parserMap[typeExpr.name];
      if (parserName) {
        ctx.requireHelper?.(parserName);
        return parserName;
      }
      // Check if it's a user-defined type (uppercase identifier not in built-ins)
      // User-defined types are referenced as _p_TypeName
      const firstChar = typeExpr.name.charAt(0);
      if (
        firstChar === firstChar.toUpperCase() &&
        firstChar !== firstChar.toLowerCase()
      ) {
        return `_p_${typeExpr.name}`;
      }
      throw new Error(`Unknown type in type definition: ${typeExpr.name}`);
    }

    case "type_schema": {
      // Object schema: generate inline parser
      ctx.requireHelper?.("pOk");
      ctx.requireHelper?.("pFail");
      const propParsers = typeExpr.properties.map((prop) => {
        const propParser = emitTypeExprParser(prop.typeExpr, ctx);
        return { key: prop.key, parser: propParser, optional: prop.optional };
      });
      const knownKeys = typeExpr.properties.map((p) => p.key);

      // Generate object parser - wrap parser in parens to handle inline functions
      const propChecks = propParsers
        .map(({ key, parser, optional }) => {
          if (optional) {
            // Optional: if value is null/undefined, skip attribute; otherwise parse
            return `if (v.${key} != null) { const _r_${key} = (${parser})(v.${key}, p + '.${key}'); if (!_r_${key}.success) return pFail(p, null, [_r_${key}]); _o.${key} = _r_${key}.value; }`;
          }
          // Required: parse and fail if not successful
          return `const _r_${key} = (${parser})(v.${key}, p + '.${key}'); if (!_r_${key}.success) return pFail(p, null, [_r_${key}]); _o.${key} = _r_${key}.value;`;
        })
        .join(" ");

      // Handle extras based on the extras mode
      let extrasCheck: string;
      if (typeExpr.extras === undefined || typeExpr.extras === "closed") {
        // Closed: fail if any extra keys exist
        const knownKeysSet = JSON.stringify(knownKeys);
        extrasCheck = `const _ks = ${knownKeysSet}; for (const _k in v) { if (!_ks.includes(_k)) return pFail(p + '.' + _k, 'unexpected attribute'); }`;
      } else if (typeExpr.extras === "ignored") {
        // Ignored: no check, extras are silently ignored
        extrasCheck = "";
      } else {
        // Typed extras: parse each extra key with the given type
        const extrasParser = emitTypeExprParser(typeExpr.extras, ctx);
        const knownKeysSet = JSON.stringify(knownKeys);
        extrasCheck = `const _ks = ${knownKeysSet}; const _ep = ${extrasParser}; for (const _k in v) { if (!_ks.includes(_k)) { const _re = _ep(v[_k], p + '.' + _k); if (!_re.success) return pFail(p, null, [_re]); _o[_k] = _re.value; } }`;
      }

      return `(v, p) => { if (typeof v !== 'object' || v === null) return pFail(p, 'expected object, got ' + (v === null ? 'Null' : typeof v)); const _o = {}; ${propChecks} ${extrasCheck} return pOk(_o, p); }`;
    }

    case "subtype_constraint": {
      // Subtype constraint: Int(i | i > 0) or Int(i | positive: i > 0, even: i % 2 == 0)
      // First parse with base type, then check all constraints
      ctx.requireHelper?.("pOk");
      ctx.requireHelper?.("pFail");
      const baseParser = emitTypeExprParser(typeExpr.baseType, ctx);
      const varName = typeExpr.variable;

      // Generate constraint checks
      const constraintChecks = typeExpr.constraints
        .map((c) => {
          const conditionCode = ctx.emit(c.condition);
          const errorMsg = c.label
            ? c.label.includes(" ")
              ? c.label
              : `constraint '${c.label}' failed`
            : "constraint failed";
          // Escape single quotes in the error message for JS string
          const escapedMsg = errorMsg.replace(/'/g, "\\'");
          return `if (!(${conditionCode})) return pFail(p, '${escapedMsg}');`;
        })
        .join(" ");

      return `(v, p) => { const _r = ${baseParser}(v, p); if (!_r.success) return _r; const ${varName} = _r.value; ${constraintChecks} return _r; }`;
    }

    case "array_type": {
      // Array type: [Int]
      // Parse each element with the element type
      ctx.requireHelper?.("pOk");
      ctx.requireHelper?.("pFail");
      const elemParser = emitTypeExprParser(typeExpr.elementType, ctx);

      // Store element parser in variable to handle inline functions (like object schemas)
      return `(v, p) => { if (!Array.isArray(v)) return pFail(p, 'expected array, got ' + (v === null ? 'Null' : typeof v)); const _el = ${elemParser}; const _a = []; for (let _i = 0; _i < v.length; _i++) { const _r = _el(v[_i], p + '.' + _i); if (!_r.success) return pFail(p, null, [_r]); _a.push(_r.value); } return pOk(_a, p); }`;
    }

    case "union_type": {
      // Union type: Int|String
      // Try each type in order, return first successful parse (PEG-style)
      ctx.requireHelper?.("pFail");
      const parsers = typeExpr.types.map((t) => emitTypeExprParser(t, ctx));

      // Generate tries: call each parser directly in order
      const tries = parsers
        .map(
          (p) =>
            `_r = (${p})(v, p); if (_r.success) return _r; _causes.push(_r);`,
        )
        .join(" ");

      return `(v, p) => { let _r; const _causes = []; ${tries} return pFail(p, 'no union alternative matched', _causes); }`;
    }
  }
}
