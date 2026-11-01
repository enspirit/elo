/**
 * Static type checking for Elo
 *
 * An optional, self-contained checker. It walks the AST, infers a type for
 * every node from the language-agnostic signature table, and reports what it
 * cannot justify. Nothing in the compile path calls it: `parse`, `transform`
 * and the four compilers behave exactly the same whether or not it runs.
 *
 * Three properties shape the design:
 *
 *  - **It reads the AST only.** The one thing it shares with the compiler is
 *    `typedefs.ts`, the table that says which signatures exist and what they
 *    return. Type *knowledge* is therefore never duplicated, only the walk.
 *
 *  - **It collects, it never throws.** On a node it cannot justify it records
 *    a diagnostic, gives the node type `any`, and carries on — so one pass
 *    reports every problem in an expression. `transform` throws on the first
 *    hard error and structurally cannot do this.
 *
 *  - **`any` suppresses errors.** The input `_` is `any` until it is coerced,
 *    and so are lambda parameters. Reporting those would fire on nearly every
 *    program, so a call with an unknown argument type is accepted in silence.
 *
 * Why no inference algorithm: Elo has no type variables, no recursion
 * (`transform.ts` rejects it) and no parametric polymorphism, and its only
 * subtyping relation is `t ≤ any`. A single bottom-up pass consulting an
 * overloaded signature table is all that is needed — unification would be the
 * wrong tool, not a more powerful one.
 */

import { Constraint, Expr, TypeExpr } from './ast';
import { EloType, Types } from './types';
import { eloTypeDefs } from './typedefs';
import { formatSignature } from './stdlib';

/**
 * What kind of problem a diagnostic reports.
 */
export type DiagnosticCode =
  /** A name no signature in the type table knows. */
  | 'unknown-function'
  /** A known name, but no signature accepts this many arguments. */
  | 'wrong-arity'
  /** A known name and arity, but no signature accepts these types. */
  | 'no-matching-signature'
  /** The same, for a node the author wrote as an operator. */
  | 'operator-type-mismatch'
  /** A condition (`if`, `guard`, `check`) whose type is known and is not Bool. */
  | 'non-bool-condition'
  /** The checker gave up to protect itself; see MAX_DEPTH. */
  | 'nesting-too-deep';

/**
 * A single problem found in an expression.
 */
export interface Diagnostic {
  severity: 'error' | 'warning';
  code: DiagnosticCode;
  message: string;
}

/**
 * Options for `typecheck`.
 */
export interface TypecheckOptions {
  /**
   * Treat undefined variables as `any` instead of reporting them.
   *
   * Mirrors `TransformOptions.allowUndefinedVariables`, which the SQL target
   * uses because a bare name there is a column reference.
   */
  allowUndefinedVariables?: boolean;
  /**
   * Maximum expression nesting the checker will walk. Matches the transform's
   * guard: the checker runs at compile time, so it carries the same obligation
   * to terminate on hostile input rather than overflow the host stack.
   */
  maxDepth?: number;
}

const DEFAULT_MAX_DEPTH = 100;

/**
 * Type environment: variable name to inferred type. Same shape as the
 * transform's, deliberately.
 */
type TypeEnv = Map<string, EloType>;

/**
 * Check an expression and return everything that could not be justified.
 * An empty array means the checker found nothing to object to — which is not
 * the same as "fully typed", since `any` is accepted in silence.
 */
export function typecheck(expr: Expr, options: TypecheckOptions = {}): Diagnostic[] {
  const checker = new Checker(options);
  checker.check(expr, new Map(), 0);
  return checker.diagnostics;
}

/**
 * Check an expression and return both its type and the diagnostics.
 * Used by the tests that compare the checker against the transform.
 */
export function typecheckWithType(
  expr: Expr,
  options: TypecheckOptions = {}
): { type: EloType; diagnostics: Diagnostic[] } {
  const checker = new Checker(options);
  const type = checker.check(expr, new Map(), 0);
  return { type, diagnostics: checker.diagnostics };
}

class Checker {
  readonly diagnostics: Diagnostic[] = [];
  private readonly allowUndefinedVariables: boolean;
  private readonly maxDepth: number;

  constructor(options: TypecheckOptions) {
    this.allowUndefinedVariables = options.allowUndefinedVariables ?? false;
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  }

  /**
   * Infer the type of an expression, reporting what cannot be justified.
   * Always returns a type: on failure that type is `any`, which stops one
   * mistake from cascading into a diagnostic at every enclosing node.
   */
  check(expr: Expr, env: TypeEnv, depth: number): EloType {
    if (depth > this.maxDepth) {
      this.report('nesting-too-deep', `Maximum expression depth exceeded (${this.maxDepth})`);
      return Types.any;
    }
    const next = depth + 1;

    switch (expr.type) {
      case 'literal':
        if (typeof expr.value === 'boolean') return Types.bool;
        // `1.0` and `1` are the same JavaScript number; only the parser's
        // marker distinguishes them.
        return Number.isInteger(expr.value) && !expr.isFloat ? Types.int : Types.float;

      case 'string':
        return Types.string;

      case 'null':
        return Types.null;

      case 'date':
        return Types.date;

      case 'datetime':
        return Types.datetime;

      case 'duration':
        return Types.duration;

      case 'variable':
        // An undefined variable is the transform's error to raise (it refuses
        // them to keep host globals out of reach); the checker only types it.
        return env.get(expr.name) ?? Types.any;

      case 'binary': {
        const left = this.check(expr.left, env, next);
        const right = this.check(expr.right, env, next);
        const fn = BINARY_OPS[expr.operator];
        if (!fn) return Types.any;
        return this.resolve(fn, [left, right], 'operator-type-mismatch', expr.operator);
      }

      case 'unary': {
        const operand = this.check(expr.operand, env, next);
        const fn = UNARY_OPS[expr.operator];
        if (!fn) return Types.any;
        return this.resolve(fn, [operand], 'operator-type-mismatch', expr.operator);
      }

      case 'temporal_keyword':
        return TEMPORAL_KEYWORD_TYPES[expr.keyword] ?? Types.any;

      case 'function_call': {
        const argTypes = expr.args.map((arg) => this.check(arg, env, next));
        // A name bound to a function in scope is an application, not a stdlib
        // call: its result is opaque, exactly as the transform treats it.
        const bound = env.get(expr.name);
        if (bound && bound.kind === 'fn') return Types.any;
        return this.resolve(expr.name, argTypes, 'no-matching-signature');
      }

      case 'apply':
        this.check(expr.fn, env, next);
        for (const arg of expr.args) this.check(arg, env, next);
        return Types.any;

      case 'member_access':
        // Field types are not known from an untyped object; the transform
        // types every member access `any` too.
        this.check(expr.object, env, next);
        return Types.any;

      case 'let': {
        // Bindings see the ones before them, so the environment grows as we go.
        const scope = new Map(env);
        for (const binding of expr.bindings) {
          scope.set(binding.name, this.check(binding.value, scope, next));
        }
        return this.check(expr.body, scope, next);
      }

      case 'if': {
        this.checkCondition(expr.condition, env, next, 'if');
        const thenType = this.check(expr.then, env, next);
        this.check(expr.else, env, next);
        // The transform takes the `then` branch's type; mirror it rather than
        // computing a join, so the two never disagree.
        return thenType;
      }

      case 'lambda': {
        const scope = new Map(env);
        for (const param of expr.params) scope.set(param, Types.any);
        this.check(expr.body, scope, next);
        return Types.fn;
      }

      case 'object':
        for (const prop of expr.properties) this.check(prop.value, env, next);
        return Types.object;

      case 'array':
        for (const element of expr.elements) this.check(element, env, next);
        return Types.array;

      case 'alternative': {
        const types = expr.alternatives.map((alt) => this.check(alt, env, next));
        // `a | b` yields the first non-null value. If the first alternative is
        // opaque the result is opaque; otherwise the first known type wins.
        if (types[0].kind === 'any') return Types.any;
        return types.find((t) => t.kind !== 'any') ?? Types.any;
      }

      case 'datapath':
        // A datapath is a function from data to a value.
        return Types.fn;

      case 'typedef': {
        this.checkTypeExpr(expr.typeExpr, env, next);
        const scope = new Map(env);
        // A type name is callable, so it lives in scope as a function.
        scope.set(expr.name, Types.fn);
        return this.check(expr.body, scope, next);
      }

      case 'guard': {
        for (const constraint of expr.constraints) {
          this.checkCondition(constraint.condition, env, next, expr.guardType);
        }
        return this.check(expr.body, env, next);
      }
    }
  }

  /**
   * Look up a call and report it when the type table cannot justify it.
   *
   * The checks are ordered by what `any` can and cannot excuse. A wrong name
   * and a wrong argument count are wrong whatever the arguments turn out to
   * be, so they are reported even for opaque arguments; only the *types* of a
   * call become unknowable, and that is where `any` buys silence.
   */
  private resolve(
    name: string,
    argTypes: EloType[],
    code: DiagnosticCode,
    operator?: string
  ): EloType {
    if (eloTypeDefs.has(name, argTypes)) {
      return eloTypeDefs.lookup(name, argTypes);
    }

    const known = eloTypeDefs.signaturesOf(name);
    if (known.length === 0) {
      this.report('unknown-function', `Unknown function ${formatSignature(name, argTypes)}`);
      return Types.any;
    }

    const sameArity = known.filter((sig) => sig.length === argTypes.length);
    if (sameArity.length === 0) {
      const arities = [...new Set(known.map((sig) => sig.length))].sort().join(' or ');
      this.report(
        'wrong-arity',
        `${name} takes ${arities} argument(s), got ${argTypes.length}`
      );
      return Types.any;
    }

    if (argTypes.some((t) => t.kind === 'any')) {
      return eloTypeDefs.lookup(name, argTypes);
    }

    const where = operator ? `operator '${operator}'` : name;
    this.report(
      code,
      `No signature of ${where} accepts ${formatSignature(name, argTypes)}. ` +
      `Known: ${sameArity.map((sig) => formatSignature(name, sig)).join(', ')}`
    );
    return Types.any;
  }

  /**
   * A condition must be a Bool. Elo has no truthiness: the targets disagree
   * about what a non-boolean condition means (SQL rejects `NOT 42` outright),
   * so requiring Bool is what keeps a program portable.
   */
  private checkCondition(expr: Expr, env: TypeEnv, depth: number, context: string): void {
    const type = this.check(expr, env, depth);
    if (type.kind === 'any' || type.kind === 'bool') return;
    this.report(
      'non-bool-condition',
      `${context} condition must be Bool, got ${capitalize(type.kind)}`
    );
  }

  /**
   * Walk a type expression. Nothing in a type expression has a value type to
   * report, but the predicates inside a subtype constraint are ordinary
   * expressions and must themselves type-check.
   */
  private checkTypeExpr(typeExpr: TypeExpr, env: TypeEnv, depth: number): void {
    if (depth > this.maxDepth) {
      this.report('nesting-too-deep', `Maximum expression depth exceeded (${this.maxDepth})`);
      return;
    }
    const next = depth + 1;

    switch (typeExpr.kind) {
      case 'type_ref':
        return;

      case 'type_schema':
        for (const prop of typeExpr.properties) {
          this.checkTypeExpr(prop.typeExpr, env, next);
        }
        if (typeExpr.extras && typeExpr.extras !== 'closed' && typeExpr.extras !== 'ignored') {
          this.checkTypeExpr(typeExpr.extras, env, next);
        }
        return;

      case 'subtype_constraint': {
        this.checkTypeExpr(typeExpr.baseType, env, next);
        const scope = new Map(env);
        // The constrained variable is `any` here; §5 of the analysis makes it
        // the base type, which is what lets `Int(i | upper(i))` be caught.
        scope.set(typeExpr.variable, Types.any);
        this.checkConstraints(typeExpr.constraints, scope, next);
        return;
      }

      case 'array_type':
        this.checkTypeExpr(typeExpr.elementType, env, next);
        return;

      case 'union_type':
        for (const member of typeExpr.types) this.checkTypeExpr(member, env, next);
        return;
    }
  }

  private checkConstraints(constraints: Constraint[], env: TypeEnv, depth: number): void {
    for (const constraint of constraints) {
      this.checkCondition(constraint.condition, env, depth, 'constraint');
    }
  }

  private report(code: DiagnosticCode, message: string): void {
    this.diagnostics.push({ severity: 'error', code, message });
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Operator to function name. Must agree with the transform's own maps, which
 * is what the cross-check test verifies.
 */
const BINARY_OPS: Record<string, string> = {
  '+': 'add',
  '-': 'sub',
  '*': 'mul',
  '/': 'div',
  '%': 'mod',
  '^': 'pow',
  '<': 'lt',
  '>': 'gt',
  '<=': 'lte',
  '>=': 'gte',
  '==': 'eq',
  '!=': 'neq',
  '&&': 'and',
  '||': 'or',
};

const UNARY_OPS: Record<string, string> = {
  '-': 'neg',
  '+': 'pos',
  '!': 'not',
};

/**
 * Temporal keyword to its type. TOMORROW and YESTERDAY are date arithmetic, so
 * they stay Dates; the period boundaries are instants, so they are Datetimes.
 */
const TEMPORAL_KEYWORD_TYPES: Record<string, EloType> = {
  TODAY: Types.date,
  TOMORROW: Types.date,
  YESTERDAY: Types.date,
  NOW: Types.datetime,
  SOD: Types.datetime,
  EOD: Types.datetime,
  SOW: Types.datetime,
  EOW: Types.datetime,
  SOM: Types.datetime,
  EOM: Types.datetime,
  SOQ: Types.datetime,
  EOQ: Types.datetime,
  SOY: Types.datetime,
  EOY: Types.datetime,
  BOT: Types.datetime,
  EOT: Types.datetime,
};
