// What is left of a form on a page whose Content-Security-Policy has no 'unsafe-eval':
// `new Function` throws there, so Elo's compiled checks cannot be made in the browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { mount, type, control, $, $$, planForm, compileChecks, renderForm } from './setup.mjs';

const SOURCE = `
  Qty   = Int(q | q > 0)
  Order = { customer: String(s | length(s) <= 20), size: String(s | s == 'S' or s == 'M'), qty: Qty, due: Date(d | d >= TODAY) }`;

// Compiled ahead of time, the way doc/security.md says to: `eloc -t js` at build time, wrapped as a
// module. By the time the page loads it, it is a plain function, which no policy objects to.
const out = new URL('../node_modules/.cache/elo-form-test/', import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL('order.elo', out), `${SOURCE}\n_ |> Order\n`);
const compiled = execFileSync(process.execPath, ['node_modules/@enspirit/elo/bin/eloc', '-t', 'js', new URL('order.elo', out).pathname], { encoding: 'utf8' });
writeFileSync(new URL('order.check.mjs', out), `import { DateTime, Duration, Interval } from 'luxon';\nexport default ${compiled}`);
const { default: checkOrder } = await import(new URL('order.check.mjs', out));

// And the library's own way: the checks of the whole form, written as a module while nothing forbade it.
writeFileSync(new URL('order.checks.mjs', out), compileChecks(SOURCE, { type: 'Order' }));
writeFileSync(new URL('order.plan.json', out), JSON.stringify(planForm(SOURCE, { type: 'Order' })));
const { default: orderChecks } = await import(new URL('order.checks.mjs', out));
const luxon = await import('luxon');

// From here on the page forbids evaluating strings, as a browser would under such a policy.
const RealFunction = Function;
globalThis.Function = function Function() { throw new EvalError("Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script"); };
globalThis.Function.prototype = RealFunction.prototype;

const texts = (form, selector) => $$(form, selector).map((e) => e.textContent);

test('the form still builds, says so, and reports enforced: false', () => {
  const form = mount(SOURCE);
  assert.equal(form.result.enforced, false);
  assert.match($(form, '.elo-banner').textContent, /not checked here/);
});

test('what the widgets guarantee by themselves still holds', () => {
  const form = mount(SOURCE);
  // Constraints written with literals are still read: hints, lengths and drop-downs need no evaluation.
  assert.deepEqual(texts(form, '.elo-hint').slice(0, 3), ['Must be at most 20 characters long.', 'Must be one of: S, M.', 'Must be greater than 0.']);
  assert.equal(control(form, 'Customer').getAttribute('maxlength'), '20');
  assert.equal(control(form, 'Size').tagName, 'SELECT');
  // Required fields and unreadable input are still problems.
  type(control(form, 'Qty'), 'many');
  assert.deepEqual(form.validate().problems.map((p) => [p.path, p.message]), [
    ['.size', 'This field is required.'], ['.qty', 'Enter a whole number, like 42.'], ['.due', 'This field is required.'],
  ]);
});

test('constraints are not enforced: valid no longer means that Elo accepts', () => {
  const form = mount(SOURCE, { value: { customer: 'Ada', size: 'M', qty: -5, due: '2001-01-01' } });
  const result = form.validate();
  assert.equal(result.valid, true);
  assert.equal(result.enforced, false);
  // `TODAY` needs no evaluating to be known: the hint reads and the picker is limited all the same.
  assert.equal(texts(form, '.elo-hint')[3], 'Must be today or later.');
  assert.match(control(form, 'Due').getAttribute('min'), /^\d{4}-\d{2}-\d{2}$/);
});

test('a validator compiled ahead of time gives Elo\'s verdict on what the form holds', () => {
  const form = mount(SOURCE, { value: { customer: 'Ada', size: 'M', qty: -5, due: '2999-01-01' } });
  assert.throws(() => checkOrder(form.getRaw()), (e) => e.path === '.qty' && e.kind === 'constraint' && /^\.qty: /.test(e.message));
  type(control(form, 'Qty'), '5');
  assert.equal(checkOrder(form.getRaw()).qty, 5);
});

test('checks compiled ahead of time are enforced, field by field, with nothing evaluated in the page', async () => {
  const { readFileSync } = await import('node:fs');
  const plan = JSON.parse(readFileSync(new URL('order.plan.json', out), 'utf8'));
  const form = renderForm(plan, { checks: orderChecks(luxon), value: { customer: 'Ada', size: 'M', qty: -5, due: '2001-01-01' } });
  document.body.replaceChildren(form.element);
  const result = form.validate();
  assert.equal(result.enforced, true);
  assert.equal(result.valid, false);
  assert.deepEqual(result.problems.map((p) => [p.path, p.message]), [
    ['.qty', 'Must be greater than 0.'], ['.due', 'Must be today or later.'],
  ]);
  assert.equal($(form, '.elo-banner.elo-note'), null);
  type(control(form, 'Qty'), '5');
  type(control(form, 'Due'), '2999-01-01');
  assert.equal(form.result.valid, true);
  assert.equal(form.result.value.qty, 5);
});
