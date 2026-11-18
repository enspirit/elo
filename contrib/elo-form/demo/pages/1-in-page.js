// Mode 1: everything in the page. `EloForm` is the global that elo-form.standalone.js defines,
// with Elo and Luxon inside. With a bundler: import { eloForm } from '@enspirit/elo-form'.
const source = await (await fetch('/order/schema.elo')).text();
const value = await (await fetch('/order/start.json')).json();

const form = EloForm.eloForm(source, { value });
document.getElementById('slot').append(form.element);

// The page's own business from here: say what the form thinks, as it changes.
const out = document.getElementById('out');
const show = () => {
  const { valid, enforced, problems } = form.validate();
  out.textContent = `${valid ? 'valid' : `${problems.length} problem(s)`} · enforced: ${enforced}`;
  out.className = `readout ${valid ? 'good' : 'bad'}`;
};
form.onChange(show);
show();
