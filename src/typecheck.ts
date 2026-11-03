/**
 * Static type checking for Elo
 *
 * An optional, self-contained checker. It walks the AST, infers a type for
 * every node, and reports what it cannot justify. Nothing in the compile path
 * calls it: `parse`, `transform` and the four compilers behave exactly the same
 * whether or not it runs.
 *
 * The dependency can be made to run the other way, and only that way: a caller
 * that wants it (`eloc --optimize`) takes the per-node types from
 * `typecheckWithAnnotations` and hands them to `transform`, which consults them
 * where its own inference says `any`. The checker still knows nothing about the
 * compilers, and a compiler with no map behaves as it always did.
 *
 * Four properties shape the design:
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
 *    and so are lambda parameters whose element type is unknown. Reporting
 *    those would fire on nearly every program, so a call with an unknown
 *    argument type is accepted in silence.
 *
 *  - **It is more precise than the compiler, and the difference is what it
 *    knows rather than what it can say.** There is one type — `EloType`, which
 *    carries schemas, element types and unions — so the checker no longer
 *    carries a lattice of its own and no longer has to project down to a
 *    poorer one. It is more precise because it follows a declaration through
 *    `let X = { … } in _ |> X` and the transform does not, not because it has
 *    somewhere richer to write the answer down. That also means handing the
 *    answer over loses nothing: `typecheckWithAnnotations` gives the transform
 *    the type it actually inferred.
 *
 * Why no inference algorithm: Elo has no type variables, no recursion
 * (`transform.ts` rejects it) and no parametric polymorphism, and its only
 * subtyping relation is `t ≤ any`. A single bottom-up pass consulting an
 * overloaded signature table is all that is needed — unification would be the
 * wrong tool, not a more powerful one.
 */

import { Constraint, Expr, Lambda, SourceLocation, TypeExpr } from './ast';
import {
  BUILTIN_TYPES,
  EloType,
  Extras,
  SchemaProp,
  TypeAnnotations,
  Types,
  arrayOf,
  describeType,
  fnOf,
  isNullable,
  isUnknown,
  join,
  nullable,
  objectOf,
  propertyType,
  stripNull,
  structurallyEquals,
} from './types';
import { eloTypeDefs } from './typedefs';
import { formatSignature } from './stdlib';
import { parseExtractTemplate } from './extract';

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
  /** A field a declared schema says cannot be there. */
  | 'unknown-field'
  /** Reading a field off something that has none, like an Int or a Date. */
  | 'invalid-member-access'
  /** An unknown name in a type expression. */
  | 'unknown-type'
  /** Strict mode only: the program relies on a value of unknown type. */
  | 'unresolved-any'
  /** A value that may be null used where null is not accepted. */
  | 'nullable-misuse'
  /** A construct the transform rejects outright, whatever the types say. */
  | 'not-allowed'
  /** The checker gave up to protect itself; see `maxDepth`. */
  | 'nesting-too-deep';

/**
 * A single problem found in an expression.
 *
 * `loc` is present only when the AST was parsed with `{ locations: true }`.
 */
export interface Diagnostic {
  severity: 'error' | 'warning';
  code: DiagnosticCode;
  message: string;
  loc?: SourceLocation;
}

/**
 * Render a diagnostic for a human: `3:11: error: … [code]`, with the position
 * dropped when the AST carried none, and prefixed with the file when the node
 * came from an imported module rather than from the program itself.
 */
export function formatDiagnostic(diagnostic: Diagnostic): string {
  const { loc } = diagnostic;
  const file = loc?.file ? `${loc.file}:` : '';
  const where = loc ? `${file}${loc.line}:${loc.column}: ` : '';
  return `${where}${diagnostic.severity}: ${diagnostic.message} [${diagnostic.code}]`;
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
  /**
   * Declare the type of the input `_`.
   *
   * `_ |> Order` already says this in the language, and that stays the form to
   * teach. This is for a host that already knows the shape of its data — a
   * formula editor that knows its columns — and would rather supply it than
   * make the author restate it. Takes a parsed type expression, so there is
   * one spelling of a schema: `parseTypeExpr('{ total: Int }')`.
   */
  inputType?: TypeExpr;
  /**
   * Require every call to be fully typed.
   *
   * Without this, an argument of unknown type is accepted in silence, which is
   * what keeps the checker quiet about an uncoerced `_`. With it, relying on
   * something unknown is itself reported — which in practice means *the
   * program must declare its input*. That is the idiomatic form, so strict
   * mode is how a host requires idiomatic Elo and can then promise that a
   * saved formula will not fail at evaluation for type reasons.
   */
  strict?: boolean;
}

const DEFAULT_MAX_DEPTH = 100;

/**
 * How many member combinations the checker will try when resolving a call on
 * union-typed arguments. A union is small in practice; the cap is there so a
 * pathological type expression cannot make the checker do exponential work.
 */
const MAX_UNION_COMBINATIONS = 32;

/** Variable name to type. */
type TypeEnv = Map<string, EloType>;

/** Type name to the structure it stands for. */
type TypeNameEnv = Map<string, EloType>;

/**
 * Access paths a null check has established something about, keyed by their
 * source text (`order.customer.name`).
 *
 * This is the checker's only flow sensitivity, and it is deliberately narrow:
 * `isNull`/`isNotNull` applied to a syntactic path, `&&`-chained, plus the `|`
 * operator. No negation algebra, no general path sensitivity — that is where
 * this kind of thing stops being simple, and `|` covers the rest.
 */
type Narrowing = ReadonlySet<string>;

/**
 * Check an expression and return everything that could not be justified.
 * An empty array means the checker found nothing to object to — which is not
 * the same as "fully typed", since `any` is accepted in silence.
 */
export function typecheck(expr: Expr, options: TypecheckOptions = {}): Diagnostic[] {
  return new Checker(options).run(expr).diagnostics;
}

/**
 * Check an expression and return its type alongside the diagnostics.
 */
export function typecheckWithType(
  expr: Expr,
  options: TypecheckOptions = {}
): { type: EloType; diagnostics: Diagnostic[] } {
  const { type, diagnostics } = new Checker(options).run(expr);
  return { type, diagnostics };
}

/**
 * Check an expression and return the per-node types alongside the diagnostics,
 * for a caller that wants to compile with them (`--optimize`).
 *
 * A program the checker objected to gets **no** annotations, and the refusal is
 * here rather than at each call site so it cannot be skipped by accident. On a
 * reported node the recorded type is `any`-by-recovery: it carries the
 * checker's attempt at a guess, not its conclusion, and emitting from it would
 * turn a visible diagnostic into silently wrong code. A caller that wants to
 * compile anyway can simply not pass the map.
 */
export function typecheckWithAnnotations(
  expr: Expr,
  options: TypecheckOptions = {}
): { types: TypeAnnotations; diagnostics: Diagnostic[] } {
  const { types, diagnostics } = new Checker(options).run(expr);
  return { types: diagnostics.length > 0 ? new Map() : types, diagnostics };
}

/**
 * The same as `typecheckWithType`, which it now is: there is one type, so
 * there is no poorer version of the answer to return instead.
 *
 * @deprecated call `typecheckWithType`
 */
export function typecheckStructural(
  expr: Expr,
  options: TypecheckOptions = {}
): { type: EloType; diagnostics: Diagnostic[] } {
  return typecheckWithType(expr, options);
}

class Checker {
  private readonly diagnostics: Diagnostic[] = [];
  /**
   * The type found for every node, keyed on node identity, or `null` where two
   * visits disagreed. Keyed on the object because the checker and `transform`
   * walk the same AST.
   */
  private readonly annotations = new Map<Expr, EloType | null>();
  private readonly allowUndefinedVariables: boolean;
  private readonly maxDepth: number;
  private readonly strict: boolean;
  private readonly inputType?: TypeExpr;
  /** Paths a surrounding null check has established are not null. */
  private narrowed: Narrowing = new Set();

  constructor(options: TypecheckOptions) {
    this.allowUndefinedVariables = options.allowUndefinedVariables ?? false;
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    this.strict = options.strict ?? false;
    this.inputType = options.inputType;
  }

  run(expr: Expr): { type: EloType; diagnostics: Diagnostic[]; types: TypeAnnotations } {
    const env: TypeEnv = new Map();
    if (this.inputType) {
      env.set('_', this.typeExprToCheckType(this.inputType, env, new Map(), 0));
    }
    const type = this.check(expr, env, new Map(), 0);
    return { type, diagnostics: this.diagnostics, types: this.exportAnnotations() };
  }

  /**
   * The annotations worth handing to the emitter: the nodes one visit agreed
   * on, minus the ones it could say nothing useful about. `any` is dropped
   * because it is what the transform already assumes, so keeping it would only
   * make the map bigger.
   */
  private exportAnnotations(): TypeAnnotations {
    const exported = new Map<Expr, EloType>();
    for (const [expr, type] of this.annotations) {
      if (type && type.kind !== 'any') exported.set(expr, type);
    }
    return exported;
  }

  /**
   * Infer the type of an expression, recording what was found for `transform`
   * to consult, and reporting what cannot be justified.
   *
   * A node can be visited more than once with different answers — a lambda
   * body is checked once per argument type combination of a union — and the
   * recording has no way to say which visit the emitter will be looking at. So
   * a second, disagreeing answer poisons the entry rather than overwriting it:
   * emitting from the wrong one of two types is the failure mode this feature
   * has to not have.
   */
  private check(expr: Expr, env: TypeEnv, types: TypeNameEnv, depth: number): EloType {
    const type = this.checkNode(expr, env, types, depth);
    if (!this.annotations.has(expr)) {
      this.annotations.set(expr, type);
    } else {
      const seen = this.annotations.get(expr);
      // Compared all the way down: kind-equality would call two different
      // schemas the same and leave the entry unpoisoned.
      if (seen && !structurallyEquals(seen, type)) this.annotations.set(expr, null);
    }
    return type;
  }

  /**
   * Always returns a type: on failure that type is `any`, which stops one
   * mistake from cascading into a diagnostic at every enclosing node.
   */
  private checkNode(expr: Expr, env: TypeEnv, types: TypeNameEnv, depth: number): EloType {
    if (depth > this.maxDepth) {
      this.report('nesting-too-deep', `Maximum expression depth exceeded (${this.maxDepth})`, expr.loc);
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

      case 'variable': {
        // An undefined variable is the transform's error to raise (it refuses
        // them to keep host globals out of reach); the checker only types it.
        const type = env.get(expr.name) ?? Types.any;
        return this.narrowed.has(expr.name) ? stripNull(type) : type;
      }

      case 'binary': {
        const left = this.check(expr.left, env, types, next);
        const right = this.check(expr.right, env, types, next);
        const fn = BINARY_OPS[expr.operator];
        if (!fn) return Types.any;
        // The transform rejects `*` on a list outright, whatever the other
        // operand is (repeating a list is an unbounded allocation). Mirror it,
        // or the checker would pass a program no compiler accepts.
        if (fn === 'mul' && [left, right].some((t) => t.kind === 'array')) {
          this.report(
            'not-allowed',
            `Array multiplication is not supported: '*' requires numeric ` +
            `operands (or String * Number).`,
            expr.loc
          );
          return Types.any;
        }
        return this.resolve(fn, [left, right], 'operator-type-mismatch', expr.loc, expr.operator);
      }

      case 'unary': {
        const operand = this.check(expr.operand, env, types, next);
        const fn = UNARY_OPS[expr.operator];
        if (!fn) return Types.any;
        return this.resolve(fn, [operand], 'operator-type-mismatch', expr.loc, expr.operator);
      }

      case 'temporal_keyword':
        return TEMPORAL_KEYWORD_TYPES[expr.keyword] ?? Types.any;

      case 'function_call':
        return this.checkCall(expr.name, expr.args, expr.loc, env, types, next);

      case 'apply':
        this.check(expr.fn, env, types, next);
        for (const arg of expr.args) this.check(arg, env, types, next);
        return Types.any;

      case 'member_access': {
        const object = this.check(expr.object, env, types, next);
        const type = this.fieldOf(object, expr.property, expr.loc);
        const path = pathOf(expr);
        return path && this.narrowed.has(path) ? stripNull(type) : type;
      }

      case 'let': {
        // Bindings see the ones before them, so the environment grows as we go.
        const scope = new Map(env);
        for (const binding of expr.bindings) {
          scope.set(binding.name, this.check(binding.value, scope, types, next));
        }
        return this.check(expr.body, scope, types, next);
      }

      case 'if': {
        this.checkCondition(expr.condition, env, types, next, 'if', expr.loc);
        // `if isNotNull(k.a) then k.a + 1 else …` knows k.a is not null in the
        // `then` branch; `if isNull(k.a) then … else k.a + 1` knows it in the
        // `else` branch.
        const thenType = this.withNarrowing(nonNullPaths(expr.condition, true), () =>
          this.check(expr.then, env, types, next)
        );
        this.withNarrowing(nonNullPaths(expr.condition, false), () =>
          this.check(expr.else, env, types, next)
        );
        // The transform takes the `then` branch's type; mirror it rather than
        // computing a join, so the two never disagree.
        return thenType;
      }

      case 'lambda':
        // A lambda reached outside a call site has no argument to type its
        // parameters from.
        return this.checkLambda(expr, [], env, types, next);

      case 'object': {
        // An object literal gives precise types for the keys it writes, so
        // `{ a: 1 }.a` is an Int. But it is left *open*: reading a key it does
        // not have yields null, which Elo treats as how you express absence
        // (`isNull({}.budget)`), not as a mistake. Only a declared schema —
        // where the runtime validates and coerces, and extras provably cannot
        // survive — makes an undeclared field reportable.
        const props: SchemaProp[] = expr.properties.map((prop) => ({
          key: prop.key,
          type: this.check(prop.value, env, types, next),
          optional: false,
        }));
        return objectOf(props, Types.any);
      }

      case 'array': {
        const elements = expr.elements.map((element) => this.check(element, env, types, next));
        return arrayOf(join(elements));
      }

      case 'alternative': {
        // `a | b` yields the first non-null value, so whatever it returns is
        // not null: `k.a | 0` is an Int even when `a` is optional. This is the
        // compact way to handle an optional field.
        const alternatives = expr.alternatives
          .map((alt) => this.check(alt, env, types, next))
          .map(stripNull);
        // If the first alternative is opaque the result is opaque; otherwise
        // the first known type wins, as the transform has it.
        if (isUnknown(alternatives[0])) return Types.any;
        return alternatives.find((t) => !isUnknown(t)) ?? Types.any;
      }

      case 'datapath':
        // A datapath is a function from data to a value of unknown type.
        return fnOf(Types.any);

      case 'typedef': {
        const scope = new Map(env);
        const typeScope = new Map(types);
        for (const definition of expr.definitions) {
          // Each definition sees the ones before it, so `People = [Person]`
          // resolves `Person`.
          const declared = this.typeExprToCheckType(definition.typeExpr, scope, typeScope, next, expr.loc);
          // A type name is callable as a coercion, and it names a structure.
          scope.set(definition.name, fnOf(declared));
          typeScope.set(definition.name, declared);
        }
        return this.check(expr.body, scope, typeScope, next);
      }

      case 'guard': {
        // A guard holds for everything it guards, so `guard isNotNull(k.a) in
        // k.a + 1` is fine — which is the idiomatic way to handle an optional
        // field in Elo.
        const established = new Set<string>();
        for (const constraint of expr.constraints) {
          this.checkCondition(constraint.condition, env, types, next, expr.guardType, expr.loc);
          for (const path of nonNullPaths(constraint.condition, true)) established.add(path);
        }
        return this.withNarrowing(established, () => this.check(expr.body, env, types, next));
      }
    }
  }

  /**
   * Check a call. Three different things wear the same syntax:
   * a coercion through a declared type, an application of a function in scope,
   * and a stdlib call.
   */
  private checkCall(
    name: string,
    args: Expr[],
    loc: SourceLocation | undefined,
    env: TypeEnv,
    types: TypeNameEnv,
    depth: number
  ): EloType {
    const bound = env.get(name);

    // `_ |> Order` parses to Order(_). The runtime validates and coerces
    // against the declaration, raising if it does not match — so past this
    // point the value provably has the declared shape.
    const declared = types.get(name);
    if (declared) {
      for (const arg of args) this.check(arg, env, types, depth);
      return declared;
    }

    // A let-bound lambda: its result is whatever its body produced.
    if (bound && bound.kind === 'fn') {
      for (const arg of args) this.check(arg, env, types, depth);
      return bound.result ?? Types.any;
    }

    // `extract` is validated structurally by the transform, not by its
    // signature: the template must be a string literal and must parse. Mirror
    // both, or the checker would pass what every compiler refuses.
    if (name === 'extract' && args.length === 2) {
      const template = args[1];
      if (template.type !== 'string') {
        this.report(
          'not-allowed',
          `extract() template (2nd argument) must be a string literal`,
          loc
        );
      } else {
        try {
          parseExtractTemplate(template.value);
        } catch (error) {
          this.report('not-allowed', String((error as Error).message), loc);
        }
      }
    }

    // A stdlib call. Lambda arguments get their parameters typed from the
    // arguments to the left, which is how `map(xs, fn(x ~> …))` learns what
    // `x` is.
    const argTypes: EloType[] = [];
    for (const arg of args) {
      if (arg.type === 'lambda') {
        const params = lambdaParamTypes(name, argTypes, arg.params.length);
        argTypes.push(this.checkLambda(arg, params, env, types, depth));
      } else {
        argTypes.push(this.check(arg, env, types, depth));
      }
    }

    const resolved = this.resolve(name, argTypes, 'no-matching-signature', loc);
    // The signature table only knows flat types, so sharpen the result where
    // the argument types say more than it could.
    return refineListResult(name, argTypes, resolved);
  }

  /**
   * Check a lambda body with its parameters bound, and report the type of what
   * it returns so a caller like `map` can use it.
   */
  private checkLambda(
    lambda: Lambda,
    paramTypes: EloType[],
    env: TypeEnv,
    types: TypeNameEnv,
    depth: number
  ): EloType {
    const scope = new Map(env);
    lambda.params.forEach((param, index) => {
      scope.set(param, paramTypes[index] ?? Types.any);
    });
    const result = this.check(lambda.body, scope, types, depth + 1);
    return fnOf(result);
  }

  /**
   * Read a field off a value.
   *
   * A declared schema makes this checkable: a field it does not declare cannot
   * be read, because extras are either rejected (`closed`) or stripped from
   * the coerced value (`...`). Only typed extras (`...: T`) allow one, at that
   * type. This catches the worst class of mistake in practice, since an
   * undeclared field fails silently at runtime — `undefined` in JavaScript,
   * `nil` in Ruby, `NULL` in SQL — rather than raising.
   */
  private fieldOf(object: EloType, property: string, loc?: SourceLocation): EloType {
    // A union is readable only if every member can be read.
    if (object.members !== undefined) {
      return join(object.members.map((member) => this.fieldOf(member, property, loc)));
    }

    if (isUnknown(object)) {
      this.reportUnresolved(`'.${property}' reads a field of a value of unknown type`, loc);
      return Types.any;
    }

    if (object.kind === 'object') {
      // An object of unknown shape says nothing about its fields, which is
      // what `Object` on its own is.
      if (object.props === undefined) return Types.any;

      // `propertyType` answers what a read produces — including the `T|Null`
      // of an optional field, which is the author's own statement that it may
      // be absent, and the type of a typed extra.
      const declared = object.props.find((p) => p.key === property);
      if (declared || (object.extras !== undefined && typeof object.extras !== 'string')) {
        return propertyType(object, property);
      }

      const names = object.props.map((p) => p.key);
      const known = names.length > 0 ? ` Declared: ${names.join(', ')}.` : '';
      const why =
        object.extras === 'ignored'
          ? 'extra attributes are allowed in but stripped from the coerced value'
          : 'the schema is closed';
      this.report(
        'unknown-field',
        `'${property}' is not a field of ${describeType(object)}: ${why}.${known}`,
        loc
      );
      return Types.any;
    }

    // `xs.0` reaches an element; the transform allows member access on a list
    // and the index is not known statically.
    if (object.kind === 'array') return Types.any;

    // The transform permits member access on data only (`any`, `object`,
    // `array`); on anything else it is an error there too — but it only knows
    // the type when it is written literally. Having followed a declaration,
    // the checker knows it far more often.
    this.report(
      'invalid-member-access',
      `'.${property}' is not available on ${describeType(object)}. ` +
      `Use a stdlib function instead (for example 'start(interval)', not 'interval.start').`,
      loc
    );
    return Types.any;
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
    loc?: SourceLocation,
    operator?: string
  ): EloType {
    const known = eloTypeDefs.signaturesOf(name);
    if (known.length === 0) {
      this.report(
        'unknown-function',
        `Unknown function ${formatSignature(name, argTypes)}`,
        loc
      );
      return Types.any;
    }

    const sameArity = known.filter((sig) => sig.length === argTypes.length);
    if (sameArity.length === 0) {
      const arities = [...new Set(known.map((sig) => sig.length))].sort().join(' or ');
      this.report(
        'wrong-arity',
        `${name} takes ${arities} argument(s), got ${argTypes.length}`,
        loc
      );
      return Types.any;
    }

    // A union argument must work for every member it could be: that is what
    // makes `{ x: Int|String }` safe to use rather than merely permitted.
    const combinations = expandUnions(argTypes);
    if (combinations) {
      const results: EloType[] = [];
      for (const combination of combinations) {
        const flat = combination;
        if (!eloTypeDefs.has(name, flat)) {
          if (flat.some((t) => t.kind === 'any')) {
            // The table has no signature for this name on an unknown argument,
            // so the call needs a concrete type and we cannot tell whether it
            // has one. Note this never fires for a function that genuinely
            // accepts anything — isNull, typeOf, assert all declare `any`
            // signatures and resolve above.
            this.reportUnresolved(
              `${name} needs a known argument type, got ${argTypes.map(describeType).join(', ')}`,
              loc
            );
            results.push(Types.any);
            continue;
          }
          const where = operator ? `operator '${operator}'` : name;

          // When the member that fails is the Null of a value that *may* be
          // absent, the author's mistake is not the types — it is the missing
          // null handling, and that is what to say. A definitely-null argument
          // (a `null` literal) is an ordinary type mismatch, so it is reported
          // as one.
          if (combination.some(isNullable) && argTypes.some((t) => t.members !== undefined && isNullable(t))) {
            this.report(
              'nullable-misuse',
              `${where} does not accept a value that may be null ` +
              `(${argTypes.map(describeType).join(', ')}). ` +
              `Handle the null first: 'x | fallback', or guard with isNotNull(x).`,
              loc
            );
            return Types.any;
          }

          this.report(
            code,
            `No signature of ${where} accepts ${formatSignature(name, flat)}` +
            (combination.length === argTypes.length && argTypes.some((t) => t.members !== undefined)
              ? ` (from ${argTypes.map(describeType).join(', ')})`
              : '') +
            `. Known: ${sameArity.map((sig) => formatSignature(name, sig)).join(', ')}`,
            loc
          );
          return Types.any;
        }
        results.push(eloTypeDefs.lookup(name, flat));
      }
      return join(results);
    }

    // Too many combinations to be worth exploring: fall back to the flat types.
    return eloTypeDefs.lookup(name, argTypes);
  }

  /**
   * A condition must be a Bool. Elo has no truthiness: the targets disagree
   * about what a non-boolean condition means (SQL rejects `NOT 42` outright),
   * so requiring Bool is what keeps a program portable.
   */
  private checkCondition(
    expr: Expr,
    env: TypeEnv,
    types: TypeNameEnv,
    depth: number,
    context: string,
    enclosing?: SourceLocation
  ): void {
    const type = this.check(expr, env, types, depth);
    if (isUnknown(type) || type.kind === 'bool') return;
    this.report(
      'non-bool-condition',
      `${context} condition must be Bool, got ${describeType(type)}`,
      // Point at the condition when it carries a position, otherwise at the
      // `if`/`guard` keyword that introduced it.
      expr.loc ?? enclosing
    );
  }

  /**
   * Turn a type expression into a checker type, reporting what it cannot
   * resolve, and checking any predicates it carries.
   */
  private typeExprToCheckType(
    typeExpr: TypeExpr,
    env: TypeEnv,
    types: TypeNameEnv,
    depth: number,
    loc?: SourceLocation
  ): EloType {
    // Type expressions nest in parallel to value expressions, and a schema can
    // be nested arbitrarily deep. Count each level against the same guard so a
    // hostile declaration raises rather than overflowing the host stack.
    if (depth > this.maxDepth) {
      this.report('nesting-too-deep', `Maximum expression depth exceeded (${this.maxDepth})`, loc);
      return Types.any;
    }
    const next = depth + 1;

    switch (typeExpr.kind) {
      case 'type_ref': {
        const builtin = BUILTIN_TYPES[typeExpr.name];
        if (builtin) return builtin;
        const named = types.get(typeExpr.name);
        if (named) return named;
        // The transform raises here; the checker records it and carries on so
        // the rest of the expression is still checked.
        this.report('unknown-type', `Unknown type selector: '${typeExpr.name}'`, loc);
        return Types.any;
      }

      case 'type_schema': {
        const props: SchemaProp[] = typeExpr.properties.map((prop) => ({
          key: prop.key,
          type: this.typeExprToCheckType(prop.typeExpr, env, types, next, loc),
          optional: prop.optional ?? false,
        }));
        let extras: Extras;
        if (typeExpr.extras === undefined || typeExpr.extras === 'closed') {
          extras = 'closed';
        } else if (typeExpr.extras === 'ignored') {
          extras = 'ignored';
        } else {
          extras = this.typeExprToCheckType(typeExpr.extras, env, types, next, loc);
        }
        return objectOf(props, extras);
      }

      case 'subtype_constraint': {
        const base = this.typeExprToCheckType(typeExpr.baseType, env, types, next, loc);
        // The constrained variable has the base type, so a predicate that
        // misuses it is reportable — `Int(i | upper(i))` is not a valid
        // constraint.
        const scope = new Map(env);
        scope.set(typeExpr.variable, base);
        this.checkConstraints(typeExpr.constraints, scope, types, next);
        return base;
      }

      case 'array_type':
        return {
          kind: 'array',
          element: this.typeExprToCheckType(typeExpr.elementType, env, types, next, loc),
        };

      case 'union_type':
        return join(
          typeExpr.types.map((member) => this.typeExprToCheckType(member, env, types, next, loc))
        );
    }
  }

  private checkConstraints(
    constraints: Constraint[],
    env: TypeEnv,
    types: TypeNameEnv,
    depth: number
  ): void {
    for (const constraint of constraints) {
      this.checkCondition(constraint.condition, env, types, depth, 'constraint');
    }
  }

  /**
   * Run a check with extra paths known to be non-null, then put the previous
   * narrowing back. The walk is depth-first, so a save/restore around the
   * narrowed region is all the bookkeeping needed.
   */
  private withNarrowing<T>(paths: ReadonlySet<string>, run: () => T): T {
    if (paths.size === 0) return run();
    const previous = this.narrowed;
    this.narrowed = new Set([...previous, ...paths]);
    try {
      return run();
    } finally {
      this.narrowed = previous;
    }
  }

  /**
   * Report a reliance on something unknown — but only in strict mode, where
   * the author has asked to be told.
   */
  private reportUnresolved(message: string, loc?: SourceLocation): void {
    if (!this.strict) return;
    this.report(
      'unresolved-any',
      `${message}. Coerce the input through a declared type (for example ` +
      `'let X = { … } in _ |> X') so the checker can see it.`,
      loc
    );
  }

  private report(code: DiagnosticCode, message: string, loc?: SourceLocation): void {
    this.diagnostics.push(loc ? { severity: 'error', code, message, loc }
                              : { severity: 'error', code, message });
  }
}

/**
 * The source text of a syntactic access path — `order.customer.name` — or null
 * when the expression is not one.
 *
 * Narrowing is keyed on this, which is why it is syntactic: two spellings of
 * the same value are two paths, and only the one the author null-checked is
 * narrowed. That is the limit of the flow sensitivity, and it is a deliberate
 * one.
 */
function pathOf(expr: Expr): string | null {
  if (expr.type === 'variable') return expr.name;
  if (expr.type === 'member_access') {
    const base = pathOf(expr.object);
    return base === null ? null : `${base}.${expr.property}`;
  }
  return null;
}

/**
 * The paths a condition establishes are not null, when it holds (`positive`)
 * or when it does not.
 *
 *     isNotNull(k.a)                     holds      -> k.a is not null
 *     isNull(k.a)                        fails      -> k.a is not null
 *     isNotNull(k.a) && isNotNull(k.b)   holds      -> both
 *
 * Anything else yields nothing. In particular `||` establishes nothing on
 * either side, and negation is not followed: a reader should not have to do
 * boolean algebra to predict what the checker knows.
 */
function nonNullPaths(condition: Expr, positive: boolean): ReadonlySet<string> {
  const paths = new Set<string>();
  collectNonNullPaths(condition, positive, paths);
  return paths;
}

function collectNonNullPaths(condition: Expr, positive: boolean, into: Set<string>): void {
  if (condition.type === 'function_call' && condition.args.length === 1) {
    const wanted = positive ? 'isNotNull' : 'isNull';
    if (condition.name === wanted) {
      const path = pathOf(condition.args[0]);
      if (path) into.add(path);
    }
    return;
  }
  // `a && b` holds only if both do, so both sides' knowledge applies. `||`
  // tells us nothing about either side.
  if (condition.type === 'binary' && condition.operator === '&&' && positive) {
    collectNonNullPaths(condition.left, true, into);
    collectNonNullPaths(condition.right, true, into);
  }
}

/**
 * Every combination of union members across the argument list, or null when
 * there are too many to explore.
 */
function expandUnions(argTypes: EloType[]): EloType[][] | null {
  let total = 1;
  for (const type of argTypes) {
    if (type.members !== undefined) total *= type.members.length;
    if (total > MAX_UNION_COMBINATIONS) return null;
  }

  let combinations: EloType[][] = [[]];
  for (const type of argTypes) {
    const options = type.members ?? [type];
    const grown: EloType[][] = [];
    for (const combination of combinations) {
      for (const option of options) grown.push([...combination, option]);
    }
    combinations = grown;
  }
  return combinations;
}

/**
 * What a higher-order list function binds its lambda's parameters to.
 *
 * `map([1, 2], fn(x ~> …))` can say that `x` is an Int, which is what closes
 * the "lambda parameters are always `any`" hole for the common case.
 */
function lambdaParamTypes(name: string, earlier: EloType[], arity: number): EloType[] {
  const elementOf = (type: EloType | undefined): EloType =>
    type && type.kind === 'array' && type.element ? type.element : Types.any;

  switch (name) {
    case 'map':
    case 'filter':
    case 'find':
    case 'sortBy':
    case 'any':
    case 'all':
      // (list, fn(element ~> …))
      return [elementOf(earlier[0])];

    case 'reduce':
      // (list, seed, fn(accumulator, element ~> …))
      return [earlier[1] ?? Types.any, elementOf(earlier[0])];

    default:
      return new Array(arity).fill(Types.any);
  }
}

/**
 * Sharpen a result the flat signature table could not express.
 *
 * Every refinement here must project to the same `EloType` the table returned
 * — it may only add precision, never contradict. A unit test asserts exactly
 * that, which is what keeps this from becoming a second, divergent type table.
 */
function refineListResult(name: string, argTypes: EloType[], resolved: EloType): EloType {
  const list = argTypes[0];
  if (!list || list.kind !== 'array') return resolved;
  if (resolved.kind !== 'array' && resolved.kind !== 'any') return resolved;
  // A list of unknown element type refines to nothing.
  const element = list.element;
  if (element === undefined) return resolved;

  switch (name) {
    // The list comes back with its element type intact.
    case 'sort':
    case 'reverse':
    case 'unique':
    case 'filter':
    case 'sortBy':
      return list;

    // An element comes out.
    case 'first':
    case 'last':
    case 'min':
    case 'max':
    case 'sum':
    case 'find':
      return argTypes.length === 1 || name === 'find' ? element : resolved;

    case 'at':
      return element;

    // The lambda decides the element type of the result.
    case 'map': {
      const fn = argTypes[1];
      return fn && fn.kind === 'fn' ? arrayOf(fn.result ?? Types.any) : resolved;
    }

    // One level of nesting comes off.
    case 'flat':
      return element.kind === 'array' ? element : resolved;

    default:
      return resolved;
  }
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

/**
 * The type names usable in a type expression. This list must match
 * `BUILTIN_TYPE_SELECTORS` in transform.ts exactly: a name the checker accepts
 * and the transform rejects is the worst kind of divergence, since
 * `--typecheck` would pass and compilation would then fail. `.` parses as `Any`.
 *
 * Interval is deliberately absent: it is a selector *function*, not a schema
 * type, because no target has a parser for it (done/0173). A name admitted
 * here without one compiles to a reference that does not exist.
 */
/** The names above, for the test that pins them to the transform's list. */
export const BUILTIN_TYPE_NAMES: readonly string[] = Object.keys(BUILTIN_TYPES);

// Re-exported so a host can work with the checker's richer types without
// reaching into an internal module.
export type { TypeAnnotations } from './types';
export type { EloType } from './types';
export { describeType, structurallyEquals as typesEqual } from './types';
/**
 * There is one type now, so there is nothing to project onto: a type's `kind`
 * *is* what dispatch sees. Kept so a host that called it still compiles.
 *
 * @deprecated the type it would return is the type it was given
 */
export function projectType(type: EloType): EloType {
  return type;
}
/**
 * @deprecated `EloType` is the checker's type and the compiler's; this alias
 * is kept for hosts that named the old one.
 */
export type CheckType = EloType;
