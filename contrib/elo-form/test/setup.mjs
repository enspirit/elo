// A DOM for the tests, and the two ways they talk to Elo directly.
import { JSDOM } from 'jsdom';
import { compile } from '@enspirit/elo';
import { DateTime, Duration, Interval } from 'luxon';

const dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true });
for (const k of ['window', 'document', 'HTMLElement', 'HTMLSelectElement', 'HTMLInputElement', 'CustomEvent', 'Event', 'File', 'FileReader', 'Node']) {
  globalThis[k] = dom.window[k];
}

export const { eloForm, resolveSchema, planSchema, simplify } = await import('../dist/elo-form.js');
// The two halves, each from its own bundle: what a server and a page would each load.
export const { planForm, compileChecks } = await import('../dist/elo-form.plan.js');
export const { renderForm, renderHtml, hydrateForm, readPosted } = await import('../dist/elo-form.render.js');

/** What a page gets from the module `compileChecks` writes, without a file in between. */
export function loadChecks(source, options) {
  const text = compileChecks(source, options);
  return new Function(text.replace(/^export default /m, 'return '))()({ DateTime, Duration, Interval });
}

/** The form a page would build from what a server planned and compiled: JSON in, checks loaded. */
export function mountPlanned(source, options = {}, formOptions = {}) {
  const plan = JSON.parse(JSON.stringify(planForm(source, options)));
  const form = renderForm(plan, { checks: loadChecks(source, options), ...formOptions });
  document.body.replaceChildren(form.element);
  return form;
}

/** Build a form and put it in the document. */
export function mount(source, options) {
  const form = eloForm(source, options);
  document.body.replaceChildren(form.element);
  return form;
}

/** Type into a control the way a person would. */
export function type(el, value) {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export function click(el) {
  el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
}

/** Tick a checkbox or radio. */
export function tick(el, on = true) {
  el.checked = on;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

export const $ = (form, selector) => form.element.querySelector(selector);
export const $$ = (form, selector) => [...form.element.querySelectorAll(selector)];

/** The field for a key: its control, by label text. */
export function control(form, label) {
  const found = $$(form, 'label.elo-label').find((l) => l.querySelector('.elo-label-text')?.textContent === label);
  if (!found) throw new Error(`no field labelled "${label}"`);
  return form.element.querySelector(`#${found.getAttribute('for')}`);
}

/** Elo's own verdict: `data |> Type`, compiled from the same source. */
export function elo(source, typeName) {
  const run = compile(`${source}\n_ |> ${typeName}`, { runtime: { DateTime, Duration, Interval } });
  return (data) => {
    try { return { ok: true, value: run(data) }; } catch (e) { return { ok: false, error: e }; }
  };
}

/** Make a value Elo produced comparable: dates and durations become plain markers. */
export function plain(v) {
  if (DateTime.isDateTime(v)) return { $datetime: v.toMillis() };
  if (Duration.isDuration(v)) return { $duration: v.toMillis() };
  // Elo lets an attribute typed "anything" be absent; the form hands it back as null.
  if (v === undefined) return null;
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, plain(v[k])]));
  return v;
}
