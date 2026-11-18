// Mode 2: the form from a plan, the verdict from the server. No Elo here, and nothing evaluated.
// With a bundler: import { renderForm } from '@enspirit/elo-form/render'.
import { renderForm } from '/lib/elo-form.render.js';

const plan = await (await fetch('/order/plan.json')).json();
const value = await (await fetch('/order/start.json')).json();

const form = renderForm(plan, { value });
document.getElementById('slot').append(form.element);

const out = document.getElementById('out');
out.textContent = `not sent yet · enforced: ${form.result.enforced}`;

document.getElementById('send').onclick = async () => {
  const response = await fetch('/order/check', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form.getRaw()),
  });
  // 422 carries Elo's error as the server caught it: { path, kind, label, message }.
  const refusal = response.status === 422 ? await response.json() : null;
  // On its field, in the field's own words. What has no field to go on comes back, for the page to show.
  const unplaced = form.setProblems(refusal ? [refusal] : []);
  out.textContent = refusal
    ? `refused by the server at ${refusal.path}${unplaced.length ? `: ${refusal.message}` : ''}`
    : 'accepted by the server';
  out.className = `readout ${refusal ? 'bad' : 'good'}`;
};
