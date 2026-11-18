/**
 * Reading an Elo schema: from source text to a `Model` tree a form can be
 * built from, plus the validators that keep the form honest.
 *
 * Nothing here touches the DOM.
 *
 * Validation is never re-implemented: every check a form makes is the Elo
 * compiler's own output for the type at hand, so a form can only accept what
 * `data |> Type` accepts.
 */
import {
  parse,
  parseTypeExpr,
  loadProgram,
  hasNoExpression,
  compileToJavaScript,
  typeDef,
  functionCall,
  variable,
  lambda,
  withLetBindings,
  withTypeDefs,
} from '@enspirit/elo';
import type { TypeExpr, TypeBinding, Expr, LetBinding, ModuleLoader } from '@enspirit/elo';
import { DateTime, Duration, Interval } from 'luxon';
import { verdict } from './plan.js';
import type { Atom, Check, Checker, Cmp, Kind, Plan, PlanNode, PlanRule, PlanScalar } from './plan.js';

// ---------------------------------------------------------------------------
// Scopes
// ---------------------------------------------------------------------------

/** One `let` worth of names: type definitions, or values (imported or bound). */
export type Frame =
  /** `upto`: only the first that many are in sight — a definition sees the ones before it. */
  | { types: TypeBinding[]; upto?: number }
  | { lets: LetBinding[] };
/** What a type expression can see, outermost first. Never mutated. */
export type Scope = Frame[];

interface Alias {
  name: string;
  typeExpr: TypeExpr;
  /** What the alias' own definition can see: everything before it. */
  scope: Scope;
  env?: Env;
}

/**
 * The definitions in sight from one place: the first `limit` of a group, then what the group itself
 * could see. A view on shared maps, so that a schema of n definitions costs n and not n².
 */
interface Env {
  defs: Map<string, { alias: Alias; index: number }[]>;
  limit: number;
  outer?: Env;
}

function lookup(env: Env | undefined, name: string): Alias | undefined {
  for (let e = env; e; e = e.outer) {
    const found = e.defs.get(name);
    if (found) for (let i = found.length - 1; i >= 0; i--) if (found[i].index < e.limit) return found[i].alias;
  }
  return undefined;
}

export interface Schema {
  root: TypeExpr;
  scope: Scope;
  env?: Env;
  /** The name of the type the form is for, when it has one. */
  name?: string;
  /** Every type name the source defines, in order. */
  names: string[];
}

export interface ResolveOptions {
  /** Which definition to build the form for. Defaults to the one the source applies, else the last. */
  type?: string;
  /** Resolves `import … from` lines, as for Elo's own `compile`. */
  loader?: ModuleLoader;
  file?: string;
}


// Without a prototype: `constructor` and `toString` are not type names.
const BUILTINS: Record<string, Kind> = Object.assign(Object.create(null), {
  Any: 'any', Null: 'null', String: 'string', Int: 'int', Float: 'float', Bool: 'bool',
  Boolean: 'bool', Date: 'date', Datetime: 'datetime', Duration: 'duration', Data: 'data',
});


/** One subtype constraint, with what it needs to be evaluated on its own. */
export interface Rule {
  label?: string;
  variable: string;
  condition: Expr;
  scope: Scope;
  /** The type the constraint was written on: `Int` in `Int(i | i > 0)`. */
  base: TypeExpr;
}

export interface Model {
  kind: Kind;
  /** The type expression at this position, and what it can see. Absent on synthetic nodes. */
  type?: TypeExpr;
  scope?: Scope;
  /** The outermost alias this position was written as, e.g. `Person`. */
  alias?: string;
  /** Every alias on the way down to the underlying type, outermost first: `Price`, then `Money`. */
  aliases?: string[];
  /** Every constraint that applies here, innermost first (the order Elo checks them in). */
  rules: Rule[];
  /** `T|Null`: no value is a value. */
  nullable?: boolean;
  /** A text box standing for `Int|String`-like unions: Elo picks the reading. */
  textual?: boolean;
  props?: { key: string; optional: boolean; model: Model }[];
  extras?: 'closed' | 'ignored' | Model;
  element?: Model;
  alts?: Model[];
  /** A fixed label, for synthetic alternatives. */
  label?: string;
}

// ---------------------------------------------------------------------------
// Source -> Schema
// ---------------------------------------------------------------------------

function onlyBuiltins(t: TypeExpr): boolean {
  switch (t.kind) {
    case 'type_ref': return t.name in BUILTINS;
    case 'array_type': return onlyBuiltins(t.elementType);
    case 'union_type': return t.types.every(onlyBuiltins);
    case 'subtype_constraint': return onlyBuiltins(t.baseType);
    case 'type_schema':
      return t.properties.every((p) => onlyBuiltins(p.typeExpr))
        && (typeof t.extras !== 'object' || onlyBuiltins(t.extras));
  }
}

/**
 * Find the type a source is about.
 *
 * Accepts the three ways a schema gets written down:
 *  - a bare type expression: `{ name: String, age: Int }`
 *  - a type prelude: `Age = Int(a | a >= 0)⏎Person = { … }`, optionally ending with the type to use
 *  - a program: `let Person = { … } in _ |> Person` (imports included)
 */
export function resolveSchema(source: string, opts: ResolveOptions = {}): Schema {
  let bare: TypeExpr | undefined;
  try { bare = parseTypeExpr(source); } catch { /* not a bare type: a program, then */ }
  if (bare && onlyBuiltins(bare)) {
    return { root: bare, scope: [], names: [] };
  }

  const program = loadProgram(source, { loader: opts.loader, file: opts.file });
  let scope: Scope = [];
  let env: Env | undefined;
  const names: string[] = [];

  const pushLets = (lets: LetBinding[]) => { if (lets.length) scope = [...scope, { lets }]; };
  const pushTypes = (defs: TypeBinding[]) => {
    if (!defs.length) return;
    const outer = scope;
    const group: Env = { defs: new Map(), limit: defs.length, outer: env };
    defs.forEach((def, i) => {
      const before: Scope = [...outer, { types: defs, upto: i }];
      const alias: Alias = { name: def.name, typeExpr: def.typeExpr, scope: before, env: { ...group, limit: i } };
      const same = group.defs.get(def.name);
      if (same) same.push({ alias, index: i }); else group.defs.set(def.name, [{ alias, index: i }]);
      names.push(def.name);
    });
    scope = [...outer, { types: defs }];
    env = group;
  };

  pushLets(program.bindings);
  pushTypes(program.typeDefs);

  let applied: string | undefined;
  let trailing: TypeExpr | undefined;
  if (!hasNoExpression(program.body)) {
    // Definitions followed by a type — `Age = Int⏎{ age: Age }` — is not an Elo program, but it is
    // an obvious way to write a schema down, and no Elo expression reads as a type by accident.
    try { trailing = parseTypeExpr(program.body); } catch { /* an expression, then */ }
  }
  if (trailing && !opts.type) return { root: trailing, scope, env, names };
  if (!trailing && !hasNoExpression(program.body)) {
    let expr: Expr = parse(program.body);
    for (;;) {
      if (expr.type === 'typedef') { pushTypes(expr.definitions); expr = expr.body; }
      else if (expr.type === 'let') { pushLets(expr.bindings); expr = expr.body; }
      else break;
    }
    // `_ |> Person` parses as the call `Person(_)`.
    if (expr.type === 'function_call' && lookup(env, expr.name)) applied = expr.name;
  }

  const name = opts.type ?? applied ?? names[names.length - 1];
  if (!name) throw new Error('No type definition found: expected a type expression, or definitions such as `Person = { name: String }`.');
  if (!lookup(env, name) && !(name in BUILTINS)) {
    throw new Error(`Unknown type '${name}'. Defined here: ${[...new Set(names)].join(', ') || 'none'}.`);
  }
  return { root: { kind: 'type_ref', name }, scope, env, name, names };
}

// ---------------------------------------------------------------------------
// Schema -> Model
// ---------------------------------------------------------------------------

/**
 * Lay a type out as a tree of things to ask for.
 *
 * Aliases are followed (Elo has no recursive types, so this ends), constraints
 * are gathered on the node they apply to, and unions nested through aliases
 * are flattened, which reads the same: alternatives are tried left to right.
 */
export function planSchema(schema: Schema): Model {
  const memo = new Map<Alias, Model>();

  const plan = (t: TypeExpr, scope: Scope, env: Env | undefined): Model => {
    switch (t.kind) {
      case 'type_ref': {
        const kind = BUILTINS[t.name];
        if (kind) return { kind, type: t, scope, rules: [] };
        const alias = lookup(env, t.name);
        if (!alias) throw new Error(`Unknown type '${t.name}'.`);
        let inner = memo.get(alias);
        if (!inner) { inner = plan(alias.typeExpr, alias.scope, alias.env); memo.set(alias, inner); }
        return { ...inner, type: t, scope, alias: t.name, aliases: [t.name, ...(inner.aliases ?? [])] };
      }
      case 'subtype_constraint': {
        const inner = plan(t.baseType, scope, env);
        const own = t.constraints.map((c) => ({ label: c.label, variable: t.variable, condition: c.condition, scope, base: t.baseType }));
        return { ...inner, type: t, scope, rules: [...inner.rules, ...own] };
      }
      case 'array_type':
        return { kind: 'array', type: t, scope, rules: [], element: plan(t.elementType, scope, env) };
      case 'type_schema': {
        const props = t.properties.map((p) => ({ key: p.key, optional: !!p.optional, model: plan(p.typeExpr, scope, env) }));
        const extras = typeof t.extras === 'object' ? plan(t.extras, scope, env) : (t.extras ?? 'closed');
        return { kind: 'tuple', type: t, scope, rules: [], props, extras };
      }
      case 'union_type': {
        const alts: Model[] = [];
        for (const member of t.types) {
          const m = plan(member, scope, env);
          // Folding in is a convenience, so it stops where it would stop being one: `A1 = A0|A0`,
          // `A2 = A1|A1`… doubles at every line.
          if (m.kind === 'union' && m.rules.length === 0 && alts.length + m.alts!.length <= MAX_ALTERNATIVES) alts.push(...m.alts!);
          else alts.push(m);
        }
        return { kind: 'union', type: t, scope, rules: [], alts };
      }
    }
  };

  return plan(schema.root, schema.scope, schema.env);
}

/** How many alternatives nested unions are folded into one choice; past that they stay nested. */
const MAX_ALTERNATIVES = 24;


// ---------------------------------------------------------------------------
// Validation, by Elo itself
// ---------------------------------------------------------------------------


type Compiled = (input: unknown) => any;

let evalWorks: boolean | undefined;
/** False where the page forbids `new Function` (a strict CSP): Elo cannot run its output there. */
export function canEvaluate(): boolean {
  if (evalWorks === undefined) {
    try { evalWorks = new Function('return 1')() === 1; } catch { evalWorks = false; }
  }
  return evalWorks;
}

export function wrap(scope: Scope, body: Expr): Expr {
  return scope.reduceRight<Expr>(
    (inner, frame) => {
      if (!('types' in frame)) return withLetBindings(frame.lets, inner);
      const seen = frame.upto === undefined ? frame.types : frame.types.slice(0, frame.upto);
      return seen.length ? withTypeDefs(seen, inner) : inner;
    },
    body,
  );
}

/** Compile an expression under a scope into a function of the program input `_`. */
export function compileUnder(scope: Scope, body: Expr): Compiled {
  const code = compileToJavaScript(wrap(scope, body));
  return new Function('DateTime', 'Duration', 'Interval', `return ${code};`)(DateTime, Duration, Interval);
}

const NODE_TYPE = 'EloFormNodeType';
const NODE_VALUE = 'eloFormNodeValue';
const validators = new WeakMap<TypeExpr, Compiled | null>();

/**
 * Check a value against the type of one node: `value |> Type`, nothing else.
 *
 * `input` is what `_` means inside constraints: the whole form's value.
 */
export function check(model: Pick<Model, 'type' | 'scope'>, value: unknown, input: unknown): Check {
  if (!model.type || !canEvaluate()) return { ok: true, value };
  let run = validators.get(model.type);
  if (run === undefined) {
    const body = typeDef(
      [{ name: NODE_TYPE, typeExpr: model.type }],
      lambda([NODE_VALUE], functionCall(NODE_TYPE, [variable(NODE_VALUE)])),
    );
    run = compileUnder(model.scope ?? [], body);
    validators.set(model.type, run);
  }
  return verdict(() => run!(input)(value));
}


const singled = new WeakMap<Expr, TypeExpr>();

/**
 * Does a value pass one condition of a rule, taken alone?
 *
 * A rule fails as a whole; this is how the form finds which half of
 * `length(s) <= 80 and not isEmpty(s)` to talk about.
 */
export function passes(rule: Rule, condition: Expr, value: unknown, input: unknown): boolean {
  let type = singled.get(condition);
  if (!type) {
    type = { kind: 'subtype_constraint', baseType: rule.base, variable: rule.variable, constraints: [{ condition }] };
    singled.set(condition, type);
  }
  const r = check({ type, scope: rule.scope }, value, input);
  return r.ok || r.kind !== 'constraint';
}

// ---------------------------------------------------------------------------
// Model -> Plan: what is left once the syntax is read
// ---------------------------------------------------------------------------

function mentions(expr: unknown, name: string): boolean {
  if (Array.isArray(expr)) return expr.some((e) => mentions(e, name));
  if (expr && typeof expr === 'object') {
    const node = expr as Record<string, unknown>;
    if (node.type === 'variable' && node.name === name) return true;
    return Object.keys(node).some((k) => k !== 'loc' && mentions(node[k], name));
  }
  return false;
}

const FLIP: Record<string, Cmp> = { '>': '<', '>=': '<=', '<': '>', '<=': '>=', '==': '==', '!=': '!=' };

/** Print a condition back as Elo, or give up (returns undefined) on anything unusual. */
export function printExpr(e: Expr): string | undefined {
  const OPS: Record<string, string> = { '&&': 'and', '||': 'or' };
  const go = (x: any, nested = false): string => {
    switch (x.type) {
      case 'literal': return String(x.value);
      case 'null': return 'null';
      case 'string': return `'${String(x.value).replace(/[\\']/g, '\\$&')}'`;
      case 'date': case 'datetime': return 'D' + x.value;
      case 'duration': return String(x.value);
      case 'temporal_keyword': return x.keyword;
      case 'variable': return x.name;
      case 'member_access': return `${go(x.object, true)}.${x.property}`;
      case 'function_call': return `${x.name}(${x.args.map((a: any) => go(a)).join(', ')})`;
      case 'array': return `[${x.elements.map((a: any) => go(a)).join(', ')}]`;
      case 'unary': return x.operator === '!' ? `not ${go(x.operand, true)}` : `${x.operator}${go(x.operand, true)}`;
      case 'binary': {
        const s = `${go(x.left, true)} ${OPS[x.operator] ?? x.operator} ${go(x.right, true)}`;
        return nested ? `(${s})` : s;
      }
      default: throw new Error('unprintable');
    }
  };
  try { return go(e); } catch { return undefined; }
}

/** The `and`-ed conditions of a constraint, in order. */
export function conjuncts(e: Expr): Expr[] {
  return e.type === 'binary' && e.operator === '&&' ? [...conjuncts(e.left), ...conjuncts(e.right)] : [e];
}

function durationScalar(d: Duration): PlanScalar | undefined {
  if (!d.isValid) return undefined;
  const parts: Record<string, number> = {};
  for (const [unit, n] of Object.entries(d.toObject())) if (typeof n === 'number') parts[unit] = n;
  return { t: 'duration', v: d.toISO() ?? '', ms: d.toMillis(), parts };
}

/**
 * The constant a condition compares against, if it is one.
 *
 * Literals are read as written. Anything else that mentions neither the value nor the input
 * (`D2026-01-01 + P1D`, `2 * 5`) is a constant too, but knowing its value takes running it:
 * that happens only when `evaluate` allows.
 */
function constant(rule: Rule, e: Expr, evaluate: boolean): PlanScalar | undefined {
  if (mentions(e, rule.variable) || mentions(e, '_')) return undefined;
  if (e.type === 'temporal_keyword' && (e.keyword === 'TODAY' || e.keyword === 'NOW')) return { t: 'time', keyword: e.keyword };
  if (e.type === 'literal' && typeof e.value === 'number') return Number.isFinite(e.value) ? { t: 'number', v: e.value } : undefined;
  if (e.type === 'string') return { t: 'text', v: e.value };
  if (e.type === 'date' || e.type === 'datetime') return { t: 'time', v: String(e.value) };
  if (e.type === 'duration') return durationScalar(Duration.fromISO(String(e.value)));
  if (!evaluate) return undefined;
  let value: unknown;
  try { value = compileUnder(rule.scope, e)(null); } catch { return undefined; }
  if (typeof value === 'number' && Number.isFinite(value)) return { t: 'number', v: value };
  if (typeof value === 'string') return { t: 'text', v: value };
  if (DateTime.isDateTime(value) && value.isValid) return { t: 'time', v: value.toISO() ?? undefined };
  if (Duration.isDuration(value)) return durationScalar(value);
  return undefined;
}

/** One condition of a rule, as far as a form can use it. Null when it says nothing a form can read. */
function readAtom(rule: Rule, e: Expr, evaluate: boolean): Atom | null {
  const isVar = (x: Expr) => x.type === 'variable' && x.name === rule.variable;
  const isLength = (x: Expr) =>
    x.type === 'function_call' && (x.name === 'length' || x.name === 'count') && x.args.length === 1 && isVar(x.args[0]);

  if (e.type === 'binary' && e.operator in FLIP) {
    let { left, right } = e;
    let op = e.operator as Cmp;
    if (!isVar(left) && !isLength(left)) { [left, right] = [right, left]; op = FLIP[op]; }
    const x = constant(rule, right, evaluate);
    if (x) {
      if (isVar(left)) return { a: 'cmp', op, x };
      if (isLength(left) && x.t === 'number') return { a: 'length', op, n: x.v };
      return null;
    }
  }
  // not isEmpty(s), not isBlank(s)
  if (e.type === 'unary' && e.operator === '!' && e.operand.type === 'function_call'
    && (e.operand.name === 'isEmpty' || e.operand.name === 'isBlank')
    && e.operand.args.length === 1 && isVar(e.operand.args[0])) {
    return { a: 'filled' };
  }
  // s == 'a' or s == 'b', contains(['a', 'b'], s)
  const members: Expr[] = [];
  if (e.type === 'function_call' && e.name === 'contains' && e.args.length === 2
    && e.args[0].type === 'array' && isVar(e.args[1])) {
    members.push(...e.args[0].elements);
  } else {
    const walk = (x: Expr): boolean => {
      if (x.type === 'binary' && x.operator === '||') return walk(x.left) && walk(x.right);
      if (x.type === 'binary' && x.operator === '==') {
        if (isVar(x.left)) { members.push(x.right); return true; }
        if (isVar(x.right)) { members.push(x.left); return true; }
      }
      return false;
    };
    if (!(e.type === 'binary' && e.operator === '||') || !walk(e)) return null;
  }
  const values: (string | number)[] = [];
  for (const m of members) {
    const c = constant(rule, m, evaluate);
    if (!c || (c.t !== 'text' && c.t !== 'number')) return null;
    values.push(c.v);
  }
  return values.length ? { a: 'oneOf', values } : null;
}

/** Which model and which rule each id of a plan stands for: what checks are made from. */
export interface PlanIndex {
  nodes: Map<number, Model>;
  rules: Map<number, Rule>;
}

export interface PlanOptions {
  /**
   * Work out constants that are not literals (`D2026-01-01 + P1D`) by running them. Off, only
   * literals, `TODAY` and `NOW` are read, and nothing of the schema is ever executed.
   */
  evaluate?: boolean;
  /**
   * How many nodes a plan may hold before the rest is asked for as JSON files. A plan is a tree:
   * a type used in two places is written out twice.
   */
  maxNodes?: number;
  /** Keep a type used in several places as one shared object. Smaller in memory; not for JSON. */
  share?: boolean;
}

/** Turn a model into a plan, and remember what each id stands for. */
export function toPlan(schema: Schema, model: Model, opts: PlanOptions = {}): { plan: Plan; index: PlanIndex } {
  const evaluate = opts.evaluate ?? false;
  const index: PlanIndex = { nodes: new Map(), rules: new Map() };
  const nodeIds = new Map<Model, number>();
  const ruleIds = new Map<Rule, PlanRule>();
  const shared = new Map<Model, PlanNode>();
  let ids = 0;
  let left = opts.maxNodes ?? Infinity;

  const ruleOf = (rule: Rule): PlanRule => {
    let planned = ruleIds.get(rule);
    if (!planned) {
      planned = { id: ++ids, atoms: conjuncts(rule.condition).map((c) => readAtom(rule, c, evaluate)) };
      if (rule.label !== undefined) planned.label = rule.label;
      const source = printExpr(rule.condition);
      if (source !== undefined) planned.source = source;
      ruleIds.set(rule, planned);
      index.rules.set(planned.id, rule);
    }
    return planned;
  };

  const go = (m: Model): PlanNode => {
    const known = opts.share ? shared.get(m) : undefined;
    if (known) return known;
    const node: PlanNode = { kind: m.kind, rules: m.rules.map(ruleOf) };
    if (m.type) {
      let id = nodeIds.get(m);
      if (id === undefined) { id = ++ids; nodeIds.set(m, id); index.nodes.set(id, m); }
      node.id = id;
    }
    if (m.alias !== undefined) node.alias = m.alias;
    if (m.aliases) node.aliases = m.aliases;
    if (m.nullable) node.nullable = true;
    if (m.textual) node.textual = true;
    if (m.label !== undefined) node.label = m.label;
    if (opts.share) shared.set(m, node);
    const composite = m.kind === 'tuple' || m.kind === 'array' || m.kind === 'union';
    if (composite && --left < 0) { node.kind = 'json'; return node; }
    if (m.props) node.props = m.props.map((p) => ({ key: p.key, optional: p.optional, node: go(p.model) }));
    if (m.extras !== undefined) node.extras = typeof m.extras === 'object' ? go(m.extras) : m.extras;
    if (m.element) node.element = go(m.element);
    if (m.alts) node.alts = m.alts.map(go);
    return node;
  };

  const plan: Plan = { version: 1, root: go(model) };
  if (schema.name !== undefined) plan.name = schema.name;
  return { plan, index };
}

/** Checks compiled in the page, one at a time, as they are first needed. Needs `new Function`. */
export function eloChecker(index: PlanIndex): Checker {
  const enforced = canEvaluate();
  return {
    enforced,
    has: (id) => enforced && id !== undefined && index.nodes.has(id),
    check: (id, value, input) => {
      const model = index.nodes.get(id);
      return model ? check(model, value, input) : { ok: true, value };
    },
    passes: (id, part, value, input) => {
      const rule = index.rules.get(id);
      if (!rule || !enforced) return undefined;
      const condition = part === undefined ? rule.condition : conjuncts(rule.condition)[part];
      return condition ? passes(rule, condition, value, input) : undefined;
    },
  };
}
