// Mode 6: the form from a plan, and Elo's compiled checks in a worker. The page never loads the
// checks: it tells the worker where they are, asks it about values, and is answered a moment later.
// With a bundler: import { renderForm, workerChecks } from '@enspirit/elo-form/render', and the
// worker is '@enspirit/elo-form/worker'.
import { renderForm, workerChecks } from '/lib/elo-form.render.js';

const plan = await (await fetch('/order/plan.json')).json();
const value = await (await fetch('/order/start.json')).json();

// If the worker cannot start or load the checks, the form still works: the server decides (mode 2).
const worker = new Worker('/lib/elo-form.worker.js', { type: 'module' });
const checks = await workerChecks(worker, { checks: '/order/checks.js' }).catch(() => undefined);

const form = renderForm(plan, { value, checks });
document.getElementById('slot').append(form.element);

const out = document.getElementById('out');
const say = (text, good) => { out.textContent = text; out.className = `readout ${good ? 'good' : 'bad'}`; };
const show = () => {
  const { valid, enforced, pending, problems } = form.validate();
  if (pending) return say('asking the worker…', false);
  say(`${valid ? 'valid' : `${problems.length} problem(s)`} · enforced: ${enforced}`, valid);
};
// Called after every change — and each time the worker answers.
form.onChange(show);
show();

document.getElementById('send').onclick = async () => {
  // Wait for the worker's answers: the page's verdict saves a round trip. It is not the one that counts.
  if (!(await form.validated({ focus: true })).valid) return say('not sent: the form has problems', false);
  const response = await fetch('/order/check', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form.getRaw()),
  });
  const refusal = response.status === 422 ? await response.json() : null;
  form.setProblems(refusal ? [refusal] : []);
  say(refusal ? `refused by the server at ${refusal.path}` : 'accepted by the server', !refusal);
};
