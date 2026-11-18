/**
 * Everything, for a page that carries Elo: `eloForm(source)` reads the schema, builds the form
 * and compiles Elo's checks, all in one place. The two halves are also there on their own:
 * `@enspirit/elo-form/plan` (schema to plan and checks) and `@enspirit/elo-form/render`
 * (plan to form).
 */
import { EloForm } from './form.js';
import type { FormOptions } from './form.js';
import { canEvaluate, eloChecker, planSchema, resolveSchema, toPlan } from './schema.js';
import type { ResolveOptions, Schema } from './schema.js';

export interface EloFormOptions extends ResolveOptions, FormOptions {}

/** A form that read its own schema. */
export interface SchemaForm extends EloForm {
  readonly schema: Schema;
}

/** Build a form for an Elo type schema. Append `form.element` wherever it should appear. */
export function eloForm(source: string, options: EloFormOptions = {}): SchemaForm {
  const schema = resolveSchema(source, options);
  // In a page nothing is sent anywhere: a type used twice stays one object, and nothing is cut short.
  const { plan, index } = toPlan(schema, planSchema(schema), { evaluate: canEvaluate(), share: true });
  // A page that carries Elo expects its rules to run: where they cannot, and none were supplied, it is told.
  const form = new EloForm(plan, { notice: true, ...options }, options.checks ? undefined : eloChecker(index));
  return Object.assign(form, { schema });
}

export { EloForm, renderForm, renderHtml, hydrateForm, readPosted } from './form.js';
export type { FormOptions, Result, Problem, Reported, Posted } from './form.js';
export { defaultMessages } from './messages.js';
export type { Messages } from './messages.js';
export { resolveSchema, planSchema, check, canEvaluate } from './schema.js';
export type { Schema, Model, ResolveOptions } from './schema.js';
export { planForm, compileChecks } from './planner.js';
export type { PlanFormOptions, ChecksOptions } from './planner.js';
export { checkerFrom, simplify } from './plan.js';
export type { Plan, PlanNode, PlanRule, Atom, PlanScalar, Kind, Checker, CompiledChecks } from './plan.js';
export type { FallbackInfo, WidgetOptions, UnitSpec, Texts } from './widgets.js';
