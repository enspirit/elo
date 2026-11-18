// Checks in a worker: the page asks and is answered later. A real Worker needs a browser; here
// the two ends talk through a pair that delivers messages the way one does — copied, and later.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planForm, renderForm, loadChecks, mountPlanned, control, type } from './setup.mjs';

const { workerChecks } = await import('../dist/elo-form.render.js');
const { serveChecks } = await import('../dist/elo-form.worker.js');

const ORDER = `
Qty = Int(q | q > 0)
Order = { customer: String(s | 'please say who it is for': not isEmpty(s)), qty: Qty, due: Date(d | d >= TODAY), size: String|Int }
`;
const BAD = { customer: 'Ada', qty: -5, due: '2001-01-01', size: 'M' };

function pair(source, { hang = false, broken = false } = {}) {
  const page = {
    onmessage: null, onerror: null, terminated: false,
    postMessage(message) {
      const data = structuredClone(message);
      setTimeout(() => { if (!page.terminated && !(hang && 'n' in data)) scope.onmessage({ data }); });
    },
    terminate() { page.terminated = true; },
  };
  const scope = {
    onmessage: null,
    postMessage(message) { const data = structuredClone(message); setTimeout(() => page.onmessage?.({ data })); },
  };
  serveChecks(scope, async () => {
    if (broken) throw new Error('404');
    return { default: loadChecks(source) };
  });
  return page;
}

async function mountWorker(source, formOptions = {}, pairOptions = {}, checksOptions = {}) {
  const plan = JSON.parse(JSON.stringify(planForm(source)));
  const worker = pair(source, pairOptions);
  const checks = await workerChecks(worker, { checks: '/checks.js', ...checksOptions });
  const form = renderForm(plan, { checks, ...formOptions });
  document.body.replaceChildren(form.element);
  return { form, worker };
}

test('a form checked in a worker says, once answered, what one checked in the page says', async () => {
  const { form } = await mountWorker(ORDER, { value: BAD });
  const first = form.validate();
  assert.equal(first.pending, true);
  assert.equal(first.valid, false, 'nothing is valid before it is checked');
  assert.equal(first.enforced, true);

  const result = await form.validated();
  const here = mountPlanned(ORDER, {}, { value: BAD }).validate();
  assert.equal(result.pending, false);
  assert.deepEqual(result.problems, here.problems);
  assert.equal(result.problems.length, 2);
});

test('the form is told when answers arrive, and typing asks again', async () => {
  let told = 0;
  const { form } = await mountWorker(ORDER, { value: BAD, onChange: () => { told++; } });
  await form.validated();
  assert.ok(told > 0, 'onChange fires when the worker answers');

  type(control(form, 'Qty'), '3');
  type(control(form, 'Due'), '2999-01-01');
  assert.equal(form.result.pending, true);
  const result = await form.validated();
  assert.deepEqual(result, { ...result, valid: true, pending: false, enforced: true, problems: [] });
  assert.deepEqual(result.raw, { ...BAD, qty: 3, due: '2999-01-01' });
});

test('a worker that stops answering is terminated, and the form says nothing is checked here', async () => {
  const { form, worker } = await mountWorker(ORDER, { value: BAD }, { hang: true }, { timeout: 30 });
  const result = await form.validated();
  assert.equal(worker.terminated, true);
  assert.deepEqual(
    { valid: result.valid, pending: result.pending, enforced: result.enforced },
    { valid: true, pending: false, enforced: false },
  );
});

test('checks that cannot be loaded are a rejection, and the worker is let go', async () => {
  const worker = pair(ORDER, { broken: true });
  await assert.rejects(workerChecks(worker, { checks: '/nowhere.js' }), /could not be loaded: 404/);
  assert.equal(worker.terminated, true);
});
