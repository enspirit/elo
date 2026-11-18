// The two halves on their own: a schema read into a plan and a module of checks where Elo is,
// and a form made from them where it is not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import {
  mount, mountPlanned, type, tick, control, $, $$,
  planForm, compileChecks, loadChecks, renderForm, renderHtml, hydrateForm, readPosted,
} from './setup.mjs';

const ORDER = `
  Qty   = Int(q | q > 0)
  Size  = String(s | s == 'S' or s == 'M' or s == 'L')
  Line  = { product: String, qty: Qty }
  Order = {
    customer: { name: String(s | length(s) <= 20 and not isEmpty(s)), vip: Bool },
    size: Size, qty: Qty, ratio :? Float, due: Date(d | d >= D2026-01-01), at :? Datetime,
    wait :? Duration(w | w <= P30D), gift: Bool|Null, lines: [Line], pay: Int|{ iban: String }
  }`;

const shownErrors = (form) => $$(form, '.elo-error').filter((e) => !e.hidden).map((e) => e.textContent);
/** What a browser would show: the values typed are properties, not attributes — write them down to compare. */
function snapshot(root) {
  const copy = root.cloneNode(true);
  const from = [...root.querySelectorAll('input, select, textarea')];
  [...copy.querySelectorAll('input, select, textarea')].forEach((el, i) => {
    const live = from[i];
    if (live.type === 'checkbox' || live.type === 'radio') { if (live.checked) el.setAttribute('checked', ''); else el.removeAttribute('checked'); }
    else if (live.tagName === 'SELECT') [...el.options].forEach((o, j) => { if (live.options[j].selected && live.value !== '' ) o.setAttribute('selected', ''); else o.removeAttribute('selected'); });
    else if (live.tagName === 'TEXTAREA') el.textContent = live.value;
    else if (live.type !== 'file' && live.value !== '') el.setAttribute('value', live.value);
  });
  return copy.outerHTML;
}

// ---------------------------------------------------------------------------
test('a plan is plain JSON, and holds nothing of the syntax it was read from', () => {
  const plan = planForm(ORDER);
  const text = JSON.stringify(plan);
  assert.deepEqual(JSON.parse(text), plan);
  assert.equal(plan.version, 1);
  assert.equal(plan.name, 'Order');
  assert.doesNotMatch(text, /"loc"|type_ref|subtype_constraint|"condition"/);
  const qty = plan.root.props.find((p) => p.key === 'qty').node;
  assert.deepEqual(qty.rules.map((r) => r.atoms), [[{ a: 'cmp', op: '>', x: { t: 'number', v: 0 } }]]);
  assert.deepEqual(qty.aliases, ['Qty']);
});

test('the render bundle carries neither Elo nor a date library, and evaluates nothing', () => {
  const bundle = readFileSync(new URL('../dist/elo-form.render.js', import.meta.url), 'utf8');
  assert.doesNotMatch(bundle, /^import /m);
  assert.doesNotMatch(bundle, /new Function|\beval\(|["']luxon["']|@enspirit\/elo"/);
});

test('reading a schema runs nothing of it, unless asked to', () => {
  const source = 'Int(i | i > 2 * 5 and i < 100)';
  const atoms = (options) => planForm(source, options).root.rules[0].atoms;
  // Not a literal: knowing it is 10 takes running it.
  assert.deepEqual(atoms(), [null, { a: 'cmp', op: '<', x: { t: 'number', v: 100 } }]);
  assert.deepEqual(atoms({ evaluate: true })[0], { a: 'cmp', op: '>', x: { t: 'number', v: 10 } });
  const real = globalThis.Function;
  globalThis.Function = function Function() { throw new Error('a schema was run'); };
  globalThis.Function.prototype = real.prototype;
  try { planForm(ORDER); planForm(source); } finally { globalThis.Function = real; }
});

test('a form made from a plan is the form made from the source', () => {
  const value = { customer: { name: 'Ada', vip: true }, size: 'M', qty: 3, due: '2026-06-01', gift: null, lines: [{ product: 'pen', qty: 2 }], pay: { iban: 'BE1' } };
  const whole = mount(ORDER, { value, id: 'f' });
  const html = snapshot(whole.element);
  const planned = mountPlanned(ORDER, {}, { value, id: 'f' });
  assert.equal(snapshot(planned.element), html);
  assert.deepEqual(planned.getRaw(), whole.getRaw());
  assert.equal(planned.validate().valid, true);
});

test('a form written as HTML is the form a page would have built', () => {
  const plan = planForm(ORDER);
  const options = {
    id: 'f', names: true, labels: { qty: 'Quantity' }, help: { '.due': 'When it has to be there.' }, placeholders: { name: 'Ada Lovelace' },
    value: { customer: { name: 'A & <b>', vip: true }, size: 'M', qty: 3, due: '2026-06-01', wait: 'P1DT2H', lines: [{ product: 'pen', qty: 2 }], pay: 4 },
  };
  const html = renderHtml(plan, options);
  const parsed = new JSDOM(`<body>${html}</body>`).window.document.body.firstElementChild;
  const live = renderForm(plan, options);
  document.body.replaceChildren(live.element);
  assert.equal(snapshot(parsed), snapshot(live.element));
  // The same twice: nothing in it depends on how many forms were written before.
  assert.equal(renderHtml(plan, options), html);
  assert.match(html, /A &amp; &lt;b&gt;/);
});

test('help and placeholders are said where they were given', () => {
  const form = renderForm(planForm(ORDER), { help: { '.due': 'When it has to be there.', product: 'What it is.' }, placeholders: { '.customer.name': 'Ada', qty: '1' } });
  document.body.replaceChildren(form.element);
  const due = control(form, 'Due');
  const help = form.element.querySelector(`#${due.id}-p`);
  assert.equal(help.textContent, 'When it has to be there.');
  assert.ok(due.getAttribute('aria-describedby').split(' ').includes(help.id));
  assert.equal(control(form, 'Name').getAttribute('placeholder'), 'Ada');
  assert.equal(control(form, 'Qty').getAttribute('placeholder'), '1');
  assert.equal(control(form, 'Vip').getAttribute('placeholder'), null);
});

// ---------------------------------------------------------------------------
test('with names, the plain fields post by themselves and nothing else does', () => {
  const html = renderHtml(planForm(ORDER), { names: true, value: { customer: { name: 'Ada', vip: false }, lines: [{ product: 'pen', qty: 2 }], pay: { iban: 'BE1' } } });
  const { document: page } = new JSDOM(`<form id="it">${html}</form>`).window;
  const posted = [...new page.defaultView.FormData(page.getElementById('it'))].map(([k]) => k);
  // An unticked box says so; what is inside a list or a choice, the choice itself, durations and files do not post.
  assert.deepEqual(posted, ['customer.name', 'customer.vip', 'size', 'qty', 'ratio', 'due', 'at', 'gift']);
  assert.equal(page.querySelectorAll('input[type=radio]').length > 0, true);
});

test('what was posted is read back the way the form reads it', () => {
  const plan = planForm(ORDER);
  const options = { names: true, value: { lines: [{ product: 'pen', qty: 2 }], pay: 4 } };
  const posted = new URLSearchParams('customer.name=Ada&customer.vip=false&customer.vip=true&size=M&qty=3&ratio=&due=2026-06-01&at=&gift=&stray=1');
  const result = readPosted(plan, posted, options);
  assert.deepEqual(result.raw, {
    customer: { name: 'Ada', vip: true }, size: 'M', qty: 3, due: '2026-06-01', gift: null, lines: [{ product: 'pen', qty: 2 }], pay: 4,
  });
  assert.equal(result.valid, true);
  assert.equal(result.enforced, false);
  // What cannot be read is handed on as typed, for Elo to refuse in its own words, and said here too.
  const bad = readPosted(plan, new URLSearchParams('qty=many&size=XXL'), options);
  assert.equal(bad.raw.qty, 'many');
  assert.deepEqual(bad.problems.filter((p) => p.path === '.qty'), [{ path: '.qty', message: 'Enter a whole number, like 42.' }]);
  // With the checks, the server's reading is Elo's verdict.
  const checked = readPosted(plan, new URLSearchParams('customer.name=Ada&size=M&qty=-3&due=2026-06-01'), { ...options, checks: loadChecks(ORDER) });
  assert.deepEqual(checked.problems, [{ path: '.qty', message: 'Must be greater than 0.' }]);
});

test('a form that arrived as HTML is taken over, keeping what was typed meanwhile', () => {
  const plan = planForm(ORDER);
  const options = { names: true, id: 'f', value: { customer: { name: 'Ada', vip: false }, size: 'M', qty: 3, due: '2026-06-01', lines: [], pay: 4 } };
  document.body.innerHTML = `<form>${renderHtml(plan, options)}</form>`;
  // Somebody types before the script arrives.
  document.querySelector('[name="customer.name"]').value = 'Grace';
  document.querySelector('input[type=checkbox][name="customer.vip"]').checked = true;
  const form = hydrateForm(document.querySelector('form'), plan, { ...options, checks: loadChecks(ORDER) });
  assert.equal(document.querySelectorAll('.elo-form').length, 1);
  assert.equal(document.querySelector('.elo-form'), form.element);
  assert.deepEqual(form.getRaw().customer, { name: 'Grace', vip: true });
  // Checks that arrive later are taken on the same way, over the live form.
  const bare = renderForm(plan, { value: { qty: -1 } });
  document.body.replaceChildren(bare.element);
  assert.equal(bare.validate().problems.some((p) => p.path === '.qty'), false);
  const checked = hydrateForm(bare.element, plan, { checks: loadChecks(ORDER), value: bare.getRaw() });
  assert.equal(checked.validate().problems.some((p) => p.path === '.qty' && p.message === 'Must be greater than 0.'), true);
  // And it is live: what the checks say now shows as it is typed.
  type(control(form, 'Qty'), '0');
  assert.deepEqual(shownErrors(form), ['Must be greater than 0.']);
});

// ---------------------------------------------------------------------------
test('problems found elsewhere are shown on their fields until those are edited', () => {
  const form = renderForm(planForm(ORDER), { value: { customer: { name: 'Ada', vip: false }, size: 'M', qty: 3, due: '2026-06-01', lines: [{ product: 'pen', qty: 2 }], pay: 4 } });
  document.body.replaceChildren(form.element);
  const unplaced = form.setProblems([
    { path: '.qty', message: 'Out of stock.' }, { path: '.lines.0.product', message: 'No such product.' }, { path: '.nowhere', message: 'Lost.' },
  ]);
  assert.deepEqual(unplaced, [{ path: '.nowhere', message: 'Lost.' }]);
  assert.deepEqual(shownErrors(form), ['Out of stock.', 'No such product.']);
  assert.equal(control(form, 'Qty').getAttribute('aria-invalid'), 'true');
  // They are somebody else's verdict: the form's own does not change.
  assert.equal(form.result.valid, true);
  type(control(form, 'Qty'), '4');
  assert.deepEqual(shownErrors(form), ['No such product.']);
  form.setProblems([]);
  assert.deepEqual(shownErrors(form), []);
  // An error of Elo's, as caught, is said the way the field itself would have said it.
  form.setProblems([
    { path: '.qty', kind: 'constraint', message: 'constraint failed' },
    { path: '.customer.name', kind: 'constraint', message: 'constraint failed' },
    { path: '.due', kind: 'schema', message: 'expected Date (YYYY-MM-DD), got "soon"' },
  ]);
  assert.deepEqual(shownErrors(form), ['Must be at most 20 characters long and filled in.', 'Must be greater than 0.', 'expected Date (YYYY-MM-DD), got "soon"']);
  form.setProblems([]);
  // And a server can write them straight into the HTML it sends back.
  const html = renderHtml(planForm(ORDER), { problems: [{ path: '.size', message: 'We are out of that size.' }] });
  assert.match(html, /<p class="elo-error"[^>]*>We are out of that size\.<\/p>/);
  assert.doesNotMatch(html, /<p class="elo-error"[^>]* hidden[^>]*>We are out/);
});

test('without checks a form enforces no constraint and does not pretend to', () => {
  const form = renderForm(planForm(ORDER), { value: { customer: { name: 'Ada', vip: false }, size: 'M', qty: -3, due: '1999-01-01', lines: [], pay: 4 } });
  document.body.replaceChildren(form.element);
  const result = form.validate();
  assert.equal(result.enforced, false);
  assert.equal(result.valid, true);
  assert.equal($(form, '.elo-banner.elo-note'), null);
  // What needs no checking is still there: hints, the drop-down, the picker's bounds.
  assert.equal(control(form, 'Size').tagName, 'SELECT');
  assert.equal(control(form, 'Due').getAttribute('min'), '2026-01-01');
  assert.ok($$(form, '.elo-hint').map((e) => e.textContent).includes('Must be greater than 0.'));
});

test('compiled checks say what the page-compiled ones say, down to which half of a rule failed', () => {
  const value = { customer: { name: '', vip: false }, size: 'M', qty: 0, due: '2025-01-01', wait: 'P40D', lines: [{ product: 'pen', qty: -1 }], pay: { iban: 'x' } };
  const whole = mount(ORDER, { value }).validate();
  const planned = mountPlanned(ORDER, {}, { value }).validate();
  assert.deepEqual(planned.problems, whole.problems);
  assert.ok(whole.problems.some((p) => p.path === '.customer.name' && p.message === 'Must be filled in.'));
  assert.equal(planned.enforced, true);
});

test('the module of checks is one program per group of definitions, not one per field', () => {
  const text = compileChecks(ORDER);
  assert.match(text, /^export default function eloFormChecks\(runtime\)/m);
  assert.equal(text.match(/function pUnwrap/g).length, 1);
  const asModule = compileChecks(ORDER, { format: 'module', luxon: '/vendor/luxon.js' });
  assert.match(asModule, /^import \{ DateTime, Duration, Interval \} from "\/vendor\/luxon\.js";$/m);
  assert.match(asModule, /^export default \{$/m);
});
