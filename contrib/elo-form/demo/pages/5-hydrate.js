// Mode 5: the form arrived as HTML and already works. This script takes it over.
// With a bundler: import { hydrateForm } from '@enspirit/elo-form/render'.
import { hydrateForm } from '/lib/elo-form.render.js';

const host = document.getElementById('order');
const plan = await (await fetch('/order/plan.json')).json();
// What the server wrote into the HTML, so that the live form starts from the same data.
const value = JSON.parse(document.getElementById('value').textContent);
// The server decided whether this schema's checks may run here (see the page's data-checks).
const checks = host.dataset.checks === 'yes' ? (await import('/order/checks.js')).default : undefined;

// The same options the server wrote the HTML with. What was typed while this loaded is kept.
const form = hydrateForm(host, plan, { names: true, id: 'order', value, checks });

const out = document.getElementById('out');
const say = (text, good) => { out.textContent = text; out.className = `readout ${good ? 'good' : 'bad'}`; };
say(`taken over · enforced: ${form.result.enforced}`, true);

// With a script there is no need to leave the page to be told.
host.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (checks && !form.validate({ focus: true }).valid) return say('not sent: the form has problems', false);
  const response = await fetch('/order/check', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form.getRaw()),
  });
  const refusal = response.status === 422 ? await response.json() : null;
  form.setProblems(refusal ? [refusal] : []);
  say(refusal ? `refused by the server at ${refusal.path}` : 'accepted by the server', !refusal);
});
