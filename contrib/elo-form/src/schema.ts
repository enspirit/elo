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

export type Kind =
  | 'string' | 'int' | 'float' | 'bool' | 'null' | 'date' | 'datetime' | 'duration'
  | 'any' | 'data' | 'tuple' | 'array' | 'union'
  /** Not an Elo type: "ask for a JSON file", the fallback. */
  | 'json';

// Without a prototype: `constructor` and `toString` are not type names.
const BUILTINS: Record<string, Kind> = Object.assign(Object.create(null), {
  Any: 'any', Null: 'null', String: 'string', Int: 'int', Float: 'float', Bool: 'bool',
  Boolean: 'bool', Date: 'date', Datetime: 'datetime', Duration: 'duration', Data: 'data',
});

/**
 * Fill a message's `{placeholders}` in. The values are text and stay text: neither `$&` nor a
 * `{placeholder}` inside one means anything.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (all, name) =>
    (Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : all));
}

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
      const before: Scope = i === 0 ? outer : [...outer, { types: defs, upto: i }];
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

const isPlain = (m: Model, ...kinds: Kind[]) => kinds.includes(m.kind) && m.rules.length === 0;

/**
 * Turn a union into the simplest thing that asks for the same values.
 *
 *  - `T|Null` is T, where leaving it empty means null.
 *  - `Int|Float` is one number box: a whole number is read as the Int.
 *  - `Int|String` is one text box: Elo reads "42" as the Int and the rest as text.
 *  - anything else stays a choice between alternatives.
 */
export function simplify(m: Model): Model {
  if (m.kind !== 'union') return m;
  const alts = m.alts!.filter((a) => !isPlain(a, 'null'));
  const nullable = alts.length < m.alts!.length || undefined;
  const carry = { type: m.type, scope: m.scope, nullable, label: m.label };
  if (alts.length === 0) return { ...m, kind: 'null', alts: undefined };
  if (alts.length === 1) {
    const only = simplify(alts[0]);
    return {
      ...only, ...carry, nullable: nullable || only.nullable, alias: m.alias ?? only.alias,
      aliases: [...(m.aliases ?? []), ...(only.aliases ?? [])], rules: [...only.rules, ...m.rules],
    };
  }
  if (alts.every((a) => isPlain(a, 'int', 'float'))) {
    return { kind: alts.every((a) => a.kind === 'int') ? 'int' : 'float', ...carry, alias: m.alias, aliases: m.aliases, rules: m.rules };
  }
  // Only when String comes last: `String|Int` reads a typed 42 as text, so the Int needs its own box.
  if (alts.every((a) => isPlain(a, 'int', 'float', 'string')) && alts.findIndex((a) => a.kind === 'string') === alts.length - 1) {
    return { kind: 'string', textual: true, ...carry, alias: m.alias, aliases: m.aliases, rules: m.rules };
  }
  return { ...m, alts, nullable };
}

// ---------------------------------------------------------------------------
// Validation, by Elo itself
// ---------------------------------------------------------------------------

export type Check =
  | { ok: true; value: unknown }
  | { ok: false; path: string; kind: string; label?: string; message: string };

type Compiled = (input: unknown) => any;

let evalWorks: boolean | undefined;
/** False where the page forbids `new Function` (a strict CSP): Elo cannot run its output there. */
export function canEvaluate(): boolean {
  if (evalWorks === undefined) {
    try { evalWorks = new Function('return 1')() === 1; } catch { evalWorks = false; }
  }
  return evalWorks;
}

function wrap(scope: Scope, body: Expr): Expr {
  return scope.reduceRight<Expr>(
    (inner, frame) => ('types' in frame
      ? withTypeDefs(frame.upto === undefined ? frame.types : frame.types.slice(0, frame.upto), inner)
      : withLetBindings(frame.lets, inner)),
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
  try {
    return { ok: true, value: run!(input)(value) };
  } catch (e: any) {
    const text = String(e?.message ?? e);
    const path = typeof e?.path === 'string' && e.path ? e.path : '.';
    // Elo prefixes its message with the path; the path is reported apart.
    const message = text.startsWith(path + ': ') ? text.slice(path.length + 2) : text;
    return { ok: false, path, kind: e?.kind ?? 'error', label: e?.label ?? undefined, message };
  }
}

// ---------------------------------------------------------------------------
// Reading constraints, to give hints
// ---------------------------------------------------------------------------
//
// Hints never decide anything: a constraint this code cannot read is still
// enforced, by the validator above. They only make the form say up front what
// the validator would say afterwards.

export type Scalar = number | string | DateTime | Duration;

export interface Facts {
  min?: { value: Scalar; exclusive: boolean };
  max?: { value: Scalar; exclusive: boolean };
  minLength?: number;
  maxLength?: number;
  /** The only values that can pass, when a constraint lists them. */
  options?: (string | number)[];
}

export interface RuleText {
  rule: Rule;
  /** "be greater than 0": reads after "Must". Absent when the rule is verbatim or unreadable. */
  phrase?: string;
  /** The rule's `and`-ed conditions with a phrase each, when every one of them could be read. */
  parts?: { condition: Expr; phrase: string }[];
  /** The author's own sentence: a label with spaces in it. */
  verbatim?: string;
  /** The condition as Elo source, when all else fails and it can be printed. */
  source?: string;
}

export interface Reading { facts: Facts; texts: RuleText[] }

export interface Phrases {
  cmp: Record<'number' | 'date' | 'datetime' | 'duration' | 'text', Record<'>' | '>=' | '<' | '<=' | '==' | '!=', string>>;
  length: Record<'string' | 'array', Record<'>' | '>=' | '<' | '<=' | '==' | '!=', string>>;
  notEmpty: string;
  oneOf: string;
  /** For a constraint known only by its label: `{label}` is e.g. "positive". */
  label: string;
  and: string;
  today: string;
  now: string;
  /** The language these phrases are written in, for the dates and durations inside them: `en`, `fr-BE`… */
  locale: string;
}

function mentions(expr: unknown, name: string): boolean {
  if (Array.isArray(expr)) return expr.some((e) => mentions(e, name));
  if (expr && typeof expr === 'object') {
    const node = expr as Record<string, unknown>;
    if (node.type === 'variable' && node.name === name) return true;
    return Object.keys(node).some((k) => k !== 'loc' && mentions(node[k], name));
  }
  return false;
}

const FLIP: Record<string, string> = { '>': '<', '>=': '<=', '<': '>', '<=': '>=', '==': '==', '!=': '!=' };

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

const words = (label: string) =>
  label.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase();

/**
 * What the constraints on a node say, in facts a widget can use and words a person can read.
 *
 * `quantity` dresses a bound on the value itself for display — "100" as "100 %" — when the
 * field has a unit.
 */
export function readRules(model: Model, phrases: Phrases, quantity?: (number: string) => string): Reading {
  const facts: Facts = {};
  const family: keyof Phrases['cmp'] =
    model.kind === 'date' ? 'date' : model.kind === 'datetime' ? 'datetime'
      : model.kind === 'duration' ? 'duration' : model.kind === 'string' ? 'text' : 'number';

  const constant = (rule: Rule, e: Expr): { value: Scalar; text: string } | undefined => {
    if (mentions(e, rule.variable) || mentions(e, '_')) return undefined;
    let value: unknown;
    try {
      if (e.type === 'literal' || e.type === 'string') value = e.value;
      else if (canEvaluate()) value = compileUnder(rule.scope, e)(null);
    } catch { return undefined; }
    if (e.type === 'temporal_keyword' && e.keyword === 'TODAY') return { value: value as DateTime, text: phrases.today };
    if (e.type === 'temporal_keyword' && e.keyword === 'NOW') return { value: value as DateTime, text: phrases.now };
    if (typeof value === 'number' && Number.isFinite(value)) return { value, text: String(value) };
    if (typeof value === 'string') return { value, text: `“${value}”` };
    if (DateTime.isDateTime(value) && value.isValid) {
      const dateOnly = model.kind === 'date' || +value === +value.startOf('day');
      // In the language of the sentence it goes into, not the one the browser happens to be set to.
      return { value, text: value.setLocale(phrases.locale).toLocaleString(dateOnly ? DateTime.DATE_MED : DateTime.DATETIME_MED) };
    }
    if (Duration.isDuration(value) && value.isValid) return { value, text: value.reconfigure({ locale: phrases.locale }).toHuman() };
    return undefined;
  };

  const isVar = (rule: Rule, e: Expr) => e.type === 'variable' && e.name === rule.variable;
  const isLength = (rule: Rule, e: Expr) =>
    e.type === 'function_call' && (e.name === 'length' || e.name === 'count') && e.args.length === 1 && isVar(rule, e.args[0]);

  /** One conjunct -> a phrase, recording what it implies. Undefined when unreadable. */
  const atom = (rule: Rule, e: Expr): string | undefined => {
    if (e.type === 'binary' && e.operator in FLIP) {
      let { left, right } = e;
      let op = e.operator as keyof typeof FLIP;
      if (!isVar(rule, left) && !isLength(rule, left)) { [left, right] = [right, left]; op = FLIP[op]; }
      const c = constant(rule, right);
      if (!c) return undefined;
      if (isVar(rule, left)) {
        const fam = typeof c.value === 'string' ? 'text' : family;
        if (fam === 'text' && op !== '==' && op !== '!=') return undefined;
        if (op === '>' || op === '>=') facts.min = tighter(facts.min, { value: c.value, exclusive: op === '>' }, 1);
        if (op === '<' || op === '<=') facts.max = tighter(facts.max, { value: c.value, exclusive: op === '<' }, -1);
        if (op === '==' && (typeof c.value === 'string' || typeof c.value === 'number')) facts.options = meet(facts.options, [c.value]);
        const shown = quantity && typeof c.value === 'number' ? quantity(c.text) : c.text;
        return fill(phrases.cmp[fam][op as '>'], { x: shown });
      }
      if (isLength(rule, left) && typeof c.value === 'number' && (model.kind === 'string' || model.kind === 'array')) {
        const n = c.value;
        if (op === '>') facts.minLength = Math.max(facts.minLength ?? 0, Math.floor(n) + 1);
        if (op === '>=') facts.minLength = Math.max(facts.minLength ?? 0, Math.ceil(n));
        if (op === '<') facts.maxLength = Math.min(facts.maxLength ?? Infinity, Math.ceil(n) - 1);
        if (op === '<=') facts.maxLength = Math.min(facts.maxLength ?? Infinity, Math.floor(n));
        if (op === '==') { facts.minLength = n; facts.maxLength = n; }
        if (model.kind === 'string' && n === 0 && (op === '>' || op === '!=')) return phrases.notEmpty;
        return fill(phrases.length[model.kind][op as '>'], { n, s: n === 1 ? '' : 's' });
      }
      return undefined;
    }
    // not isEmpty(s), not isBlank(s)
    if (e.type === 'unary' && e.operator === '!' && e.operand.type === 'function_call'
      && (e.operand.name === 'isEmpty' || e.operand.name === 'isBlank')
      && e.operand.args.length === 1 && isVar(rule, e.operand.args[0])) {
      facts.minLength = Math.max(facts.minLength ?? 0, 1);
      return phrases.notEmpty;
    }
    // s == 'a' or s == 'b', contains(['a', 'b'], s)
    const listed = enumerated(rule, e);
    if (listed) {
      facts.options = meet(facts.options, listed.values);
      return fill(phrases.oneOf, { list: listed.texts.join(', ') });
    }
    return undefined;
  };

  const enumerated = (rule: Rule, e: Expr): { values: (string | number)[]; texts: string[] } | undefined => {
    const members: Expr[] = [];
    if (e.type === 'function_call' && e.name === 'contains' && e.args.length === 2
      && e.args[0].type === 'array' && isVar(rule, e.args[1])) {
      members.push(...e.args[0].elements);
    } else {
      const walk = (x: Expr): boolean => {
        if (x.type === 'binary' && x.operator === '||') return walk(x.left) && walk(x.right);
        if (x.type === 'binary' && x.operator === '==') {
          if (isVar(rule, x.left)) { members.push(x.right); return true; }
          if (isVar(rule, x.right)) { members.push(x.left); return true; }
        }
        return false;
      };
      if (!(e.type === 'binary' && e.operator === '||') || !walk(e)) return undefined;
    }
    const values: (string | number)[] = [];
    const texts: string[] = [];
    for (const m of members) {
      const c = constant(rule, m);
      if (!c || (typeof c.value !== 'string' && typeof c.value !== 'number')) return undefined;
      values.push(c.value);
      texts.push(typeof c.value === 'string' ? c.value : c.text);
    }
    return values.length ? { values, texts } : undefined;
  };

  const conjuncts = (e: Expr): Expr[] =>
    e.type === 'binary' && e.operator === '&&' ? [...conjuncts(e.left), ...conjuncts(e.right)] : [e];

  const texts = model.rules.map((rule): RuleText => {
    // Read every conjunct even when the label speaks for the rule: the facts still help the widget.
    const conditions = conjuncts(rule.condition);
    const parts = conditions.map((c) => atom(rule, c));
    if (rule.label && /\s/.test(rule.label)) return { rule, verbatim: rule.label };
    if (parts.every((p) => p !== undefined)) {
      return {
        rule,
        phrase: joinPhrases(parts as string[], phrases.and),
        parts: conditions.map((condition, i) => ({ condition, phrase: parts[i] as string })),
      };
    }
    if (rule.label) return { rule, phrase: fill(phrases.label, { label: words(rule.label) }) };
    return { rule, source: printExpr(rule.condition) };
  });

  return { facts, texts };
}

function order(v: Scalar): number | string {
  return typeof v === 'number' || typeof v === 'string' ? v : +v;
}

function tighter<B extends { value: Scalar; exclusive: boolean }>(a: B | undefined, b: B, sign: 1 | -1): B {
  if (!a || typeof order(a.value) !== typeof order(b.value)) return a ?? b;
  const x = order(a.value), y = order(b.value);
  if (x === y) return a.exclusive ? a : b;
  return (x > y ? sign === 1 : sign === -1) ? a : b;
}

function meet<T>(a: T[] | undefined, b: T[]): T[] {
  const unique = [...new Set(b)];
  return a ? a.filter((v) => unique.includes(v)) : unique;
}

/** "be at least 1" + "be at most 10" -> "be at least 1 and at most 10". */
export function joinPhrases(parts: string[], and: string): string {
  const unique = [...new Set(parts)];
  return unique
    .map((p, i) => {
      const verb = unique[0].split(' ')[0] + ' ';
      return i > 0 && p.startsWith(verb) ? p.slice(verb.length) : p;
    })
    .join(and);
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
