// Mode 3: the form from a plan, and Elo's checks as a module the server compiled. The module
// imports Luxon itself (from /vendor/luxon.js, as the server told it to). Nothing is evaluated
// from text: this works under a policy without 'unsafe-eval'.
// With a bundler: import { renderForm } from '@enspirit/elo-form/render'.
import { renderForm } from '/lib/elo-form.render.js';
import checks from '/order/checks.js';

const plan = await (await fetch('/order/plan.json')).json();
const value = await (await fetch('/order/start.json')).json();

const form = renderForm(plan, { value, checks });
document.getElementById('slot').append(form.element);

const out = document.getElementById('out');
const say = (text, good) => { out.textContent = text; out.className = `readout ${good ? 'good' : 'bad'}`; };
const show = () => {
  const { valid, enforced, problems } = form.validate();
  say(`${valid ? 'valid' : `${problems.length} problem(s)`} · enforced: ${enforced}`, valid);
};
form.onChange(show);
show();

document.getElementById('send').onclick = async () => {
  // The page's verdict saves a round trip. It is not the one that counts.
  if (!form.validate({ focus: true }).valid) return say('not sent: the form has problems', false);
  const response = await fetch('/order/check', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form.getRaw()),
  });
  const refusal = response.status === 422 ? await response.json() : null;
  form.setProblems(refusal ? [refusal] : []);
  say(refusal ? `refused by the server at ${refusal.path}` : 'accepted by the server', !refusal);
};
