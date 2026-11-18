/**
 * From a schema to what a form is made of — the half that needs Elo, and no page.
 *
 * `planForm` gives the form as JSON; `compileChecks` gives Elo's checks for it as a JavaScript
 * module. Both read the same source the same way, so the ids in one are the ids in the other.
 */
import { planSchema, resolveSchema, toPlan } from './schema.js';
import type { PlanOptions, ResolveOptions } from './schema.js';
import { writeChecks } from './checks.js';
import type { ChecksOptions } from './checks.js';
import type { Plan } from './plan.js';

export interface PlanFormOptions extends ResolveOptions, Pick<PlanOptions, 'evaluate' | 'maxNodes'> {}

/** How many nodes a plan holds by default before the rest is asked for as JSON files. */
const MAX_NODES = 5000;

function read(source: string, options: PlanFormOptions) {
  const schema = resolveSchema(source, options);
  return toPlan(schema, planSchema(schema), { evaluate: options.evaluate ?? false, maxNodes: options.maxNodes ?? MAX_NODES });
}

/**
 * Read a schema into a form plan: plain JSON, to store, send, and hand to `renderForm`,
 * `renderHtml` or `hydrateForm`.
 *
 * Nothing of the schema is executed unless `evaluate` is set: it is read, not run.
 */
export function planForm(source: string, options: PlanFormOptions = {}): Plan {
  return read(source, options).plan;
}

/**
 * Compile Elo's checks for a schema into the source of a JavaScript module, for the `checks`
 * option of a form made from `planForm(source, options)` — the same source, the same options.
 */
export function compileChecks(source: string, options: PlanFormOptions & ChecksOptions = {}): string {
  const { plan, index } = read(source, options);
  return writeChecks(plan, index, options);
}

export type { ChecksOptions } from './checks.js';
export type { Plan, PlanNode, PlanRule, Atom, PlanScalar, Kind, CompiledChecks } from './plan.js';
