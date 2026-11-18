/**
 * Elo's checks for a plan, written out as a JavaScript module.
 *
 * A page whose Content-Security-Policy forbids `new Function` cannot compile a
 * schema, but it can load a script. So the compiling happens here, ahead of
 * time, and what a page loads is Elo's own output: one function per type a
 * form asks about, known by the ids its plan carries.
 *
 * Nothing in the module is written by this library except the table saying
 * which function answers for which id. What the functions can do is what Elo's
 * compiled code can do.
 */
import { arrayLiteral, compileToJavaScript, functionCall, lambda, typeDef, variable } from '@enspirit/elo';
import type { Expr, TypeBinding, TypeExpr } from '@enspirit/elo';
import { simplify } from './plan.js';
import type { Plan, PlanNode } from './plan.js';
import { conjuncts, wrap } from './schema.js';
import type { PlanIndex, Scope } from './schema.js';

export interface ChecksOptions {
  /**
   * `'factory'` (default): the module's default export is a function taking `{ DateTime, Duration,
   * Interval }` — Luxon, which Elo's output needs — and returning the checks. `'module'`: it
   * imports Luxon itself and exports the checks.
   */
  format?: 'factory' | 'module';
  /** What `'module'` imports Luxon from. Default `'luxon'`. */
  luxon?: string;
}

const VALUE = 'eloFormNodeValue';

/**
 * A definition sees the ones before it, and only those. Seeing the later ones of its group too
 * changes nothing where no name of the group is defined twice or hides one from further out —
 * and it lets every definition of a group share one program.
 */
function widen(scope: Scope): Scope {
  const outer = new Set<string>();
  return scope.map((frame) => {
    if (!('types' in frame)) { for (const b of frame.lets) outer.add(b.name); return frame; }
    const names = frame.types.map((t) => t.name);
    const plain = new Set(names).size === names.length && !names.some((n) => outer.has(n));
    for (const n of names.slice(0, frame.upto ?? names.length)) outer.add(n);
    return plain && frame.upto !== undefined ? { types: frame.types } : frame;
  });
}

/** Scopes that see the same definitions get one program between them. */
function scopeKeys() {
  const ids = new WeakMap<object, number>();
  let next = 0;
  const idOf = (o: object) => { let id = ids.get(o); if (id === undefined) { id = ++next; ids.set(o, id); } return id; };
  return (scope: Scope): string => scope.map((frame) => ('types' in frame
    ? `t${idOf(frame.types)}${frame.upto === undefined ? '' : `:${frame.upto}`}`
    : `l${idOf(frame.lets)}`)).join('/');
}

/** The ids a form will ask about: the nodes it checks, and the rules it explains. */
function wanted(plan: Plan): { nodes: Set<number>; rules: Map<number, number> } {
  const nodes = new Set<number>();
  /** Rule id -> how many conditions it has. */
  const rules = new Map<number, number>();
  const seen = new Set<PlanNode>();
  const visit = (node: PlanNode) => {
    if (seen.has(node)) return;
    seen.add(node);
    const m = simplify(node);
    if (m.id !== undefined && (m.rules.length > 0 || m.kind === 'json')) nodes.add(m.id);
    for (const rule of m.rules) rules.set(rule.id, rule.atoms.length);
    if (m.kind === 'union') for (const alt of m.alts ?? []) { if (alt.id !== undefined) nodes.add(alt.id); visit(alt); }
    for (const p of m.props ?? []) visit(p.node);
    if (typeof m.extras === 'object') visit(m.extras);
    if (m.element) visit(m.element);
  };
  if (plan.root.id !== undefined) nodes.add(plan.root.id);
  visit(plan.root);
  return { nodes, rules };
}

/** Write the checks of a plan as the source of a JavaScript module. */
export function writeChecks(plan: Plan, index: PlanIndex, opts: ChecksOptions = {}): string {
  const keyOf = scopeKeys();
  const groups = new Map<string, { scope: Scope; types: TypeExpr[] }>();
  const place = (scope: Scope, type: TypeExpr): [number, number] => {
    const wide = widen(scope);
    const key = keyOf(wide);
    let group = groups.get(key);
    if (!group) { group = { scope: wide, types: [] }; groups.set(key, group); }
    group.types.push(type);
    return [[...groups.keys()].indexOf(key), group.types.length - 1];
  };

  const { nodes, rules } = wanted(plan);
  const nodeTable: Record<string, [number, number]> = {};
  const ruleTable: Record<string, [number, number]> = {};
  for (const id of [...nodes].sort((a, b) => a - b)) {
    const model = index.nodes.get(id);
    if (model?.type) nodeTable[id] = place(model.scope ?? [], model.type);
  }
  for (const [id, parts] of [...rules].sort((a, b) => a[0] - b[0])) {
    const rule = index.rules.get(id);
    if (!rule) continue;
    const alone = (condition: Expr): TypeExpr =>
      ({ kind: 'subtype_constraint', baseType: rule.base, variable: rule.variable, constraints: [{ condition }] });
    ruleTable[id] = place(rule.scope, alone(rule.condition));
    if (parts > 1) conjuncts(rule.condition).forEach((c, i) => { ruleTable[`${id}.${i}`] = place(rule.scope, alone(c)); });
  }

  const programs = [...groups.values()].map(({ scope, types }) => {
    const defs: TypeBinding[] = types.map((typeExpr, i) => ({ name: `EloFormNodeType${i}`, typeExpr }));
    const body = typeDef(defs, arrayLiteral(defs.map((d) => lambda([VALUE], functionCall(d.name, [variable(VALUE)])))));
    return compileToJavaScript(wrap(scope, body));
  });

  const table = `{
    version: 1,
    programs: [
${programs.map((p) => `      ${p}`).join(',\n')}
    ],
    nodes: ${JSON.stringify(nodeTable)},
    rules: ${JSON.stringify(ruleTable)}
  }`;
  const head = '// Generated by @enspirit/elo-form from an Elo schema: Elo\'s own checks, compiled ahead of time. Do not edit.\n';
  if (opts.format === 'module') {
    return `${head}import { DateTime, Duration, Interval } from ${JSON.stringify(opts.luxon ?? 'luxon')};\n\nexport default ${table};\n`;
  }
  return `${head}export default function eloFormChecks(runtime) {\n  const { DateTime, Duration, Interval } = runtime;\n  return ${table};\n}\n`;
}
