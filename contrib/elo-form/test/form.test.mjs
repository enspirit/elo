import test from 'node:test';
import assert from 'node:assert/strict';
import { mount, type, click, tick, $, $$, control } from './setup.mjs';

const texts = (form, selector) => $$(form, selector).map((e) => e.textContent).filter((t) => t);
const shownErrors = (form) => $$(form, '.elo-error').filter((e) => !e.hidden).map((e) => e.textContent);

// ---------------------------------------------------------------------------
test('base types each get their own widget', () => {
  const form = mount(`{
    name: String, count: Int, ratio: Float, active: Bool, born: Date,
    at: Datetime, wait: Duration, nothing: Null, payload: Data, whatever: .
  }`);
  assert.equal(control(form, 'Name').type, 'text');
  assert.equal(control(form, 'Count').getAttribute('inputmode'), 'text');
  assert.equal(control(form, 'Active').type, 'checkbox');
  assert.equal(control(form, 'Born').type, 'date');
  assert.equal(control(form, 'At').type, 'datetime-local');
  assert.equal($$(form, '.elo-kind-duration .elo-duration-part').length, 7);
  assert.equal($$(form, '.elo-kind-duration .elo-duration-part').filter((u) => !u.hidden).length, 3);
  // Data starts on the JSON file; anything starts on text.
  assert.equal($$(form, '.elo-kind-data input[type=radio]').find((r) => r.checked).nextSibling.textContent, 'JSON file');
  assert.equal($$(form, '.elo-kind-any input[type=radio]').find((r) => r.checked).nextSibling.textContent, 'Text');
});

test('what is typed comes out as JSON the schema accepts', () => {
  const form = mount('{ name: String, count: Int, ratio: Float, active: Bool, born: Date, wait: Duration }');
  type(control(form, 'Name'), 'Alice');
  type(control(form, 'Count'), ' 42 ');
  type(control(form, 'Ratio'), '1.5e2');
  tick(control(form, 'Active'));
  type(control(form, 'Born'), '2024-06-15');
  const [days, hours] = $$(form, '.elo-duration-part:not([hidden]) input');
  type(days, '2');
  type(hours, '6');
  const r = form.validate();
  assert.deepEqual(r.raw, { name: 'Alice', count: 42, ratio: 150, active: true, born: '2024-06-15', wait: 'P2DT6H' });
  assert.equal(r.valid, true);
  assert.equal(r.value.born.toISODate(), '2024-06-15');
  assert.equal(r.value.wait.as('hours'), 54);
});

test('a required field left empty is reported, in plain words', () => {
  const form = mount('{ name: String, count: Int }');
  const r = form.validate();
  assert.equal(r.valid, false);
  // An empty text is a String: only the number is missing.
  assert.deepEqual(r.problems, [{ path: '.count', message: 'This field is required.' }]);
  assert.deepEqual(shownErrors(form), ['This field is required.']);
});

test('problems stay quiet until a field has been visited', () => {
  const form = mount('{ count: Int }');
  assert.deepEqual(shownErrors(form), []);
  assert.equal(form.result.valid, false);
  type(control(form, 'Count'), 'abc');
  assert.deepEqual(shownErrors(form), ['Enter a whole number, like 42.']);
  type(control(form, 'Count'), '12');
  assert.deepEqual(shownErrors(form), []);
  assert.equal(form.result.valid, true);
});

// ---------------------------------------------------------------------------
test('optional attributes may be left out', () => {
  const form = mount('{ name: String, nick :? String, age :? Int, vip :? Bool, home :? { city: String } }');
  assert.deepEqual(form.validate().raw, { name: '' });
  assert.equal(form.result.valid, true);
  assert.deepEqual(texts(form, '.elo-optional'), ['optional', 'optional', 'optional', 'optional']);
  // An optional Bool has three answers; an optional tuple a switch.
  assert.equal(control(form, 'Vip').tagName, 'SELECT');
  tick($(form, '.elo-kind-tuple .elo-kind-tuple .elo-checkbox'));
  type(control(form, 'City'), 'Namur');
  assert.deepEqual(form.getRaw(), { name: '', home: { city: 'Namur' } });
});

test('open tuples keep what they are given; typed extras get their own rows', () => {
  const open = mount('{ name: String, ... }', { value: { name: 'A', legacy: 1 } });
  assert.deepEqual(open.getRaw(), { name: 'A', legacy: 1 });

  const closed = mount('{ name: String }', { value: { name: 'A', legacy: 1 } });
  assert.deepEqual(closed.getRaw(), { name: 'A' });

  const typed = mount('{ name: String, ...: Int }');
  click($(typed, '.elo-extras .elo-add'));
  const key = $(typed, '.elo-key');
  type(key, 'name');
  assert.match(shownErrors(typed).join(), /already a field above/);
  type(key, 'score');
  type($(typed, '.elo-row .elo-input-number'), '7');
  assert.deepEqual(typed.validate().raw, { name: '', score: 7 });
  assert.equal(typed.result.valid, true);
});

// ---------------------------------------------------------------------------
test('lists add, remove and reorder', () => {
  const form = mount('{ tags: [String], lines: [{ product: String, qty: Int }] }');
  const [addTag, addLine] = $$(form, '.elo-add');
  assert.equal(addTag.textContent, '+ Add tag');
  assert.equal(addLine.textContent, '+ Add line');
  click(addTag); click(addTag);
  const [a, b] = $$(form, '.elo-item .elo-kind-string input');
  type(a, 'x'); type(b, 'y');
  click($$(form, '.elo-item-actions')[1].children[0]); // move the second one up
  assert.deepEqual(form.getRaw().tags, ['y', 'x']);
  click($$(form, '.elo-item-actions')[0].children[2]); // remove the first
  assert.deepEqual(form.getRaw().tags, ['x']);
  click(addLine);
  assert.equal($(form, '.elo-item legend').textContent, 'Line 1');
  assert.deepEqual(form.validate().problems.map((p) => p.path), ['.lines.0.qty']);
});

// ---------------------------------------------------------------------------
test('T|Null is T that may be left empty', () => {
  const form = mount('{ age: Int|Null, when: Null|Date, home: { city: String }|Null }');
  assert.deepEqual(form.validate().raw, { age: null, when: null, home: null });
  assert.equal(form.result.valid, true);
  assert.equal($$(form, 'input[type=radio]').length, 0);
});

test('Int|Float is one number box, Int|String one text box', () => {
  const form = mount('{ n: Int|Float, id: Int|String, tag: String|Int }');
  assert.equal($$(form, '.elo-kind-union').length, 1); // only String|Int needs a choice
  type(control(form, 'N'), '3');
  type(control(form, 'Id'), '42');
  const r = form.validate();
  assert.deepEqual(r.raw, { n: 3, id: '42', tag: '' });
  assert.deepEqual(r.value, { n: 3, id: 42, tag: '' });
});

test('other unions are a choice, and say which alternative wins', () => {
  const form = mount(`
    Card = { number: String, cvc: Int }
    Payment = Card | { iban: String } | Date
    Payment`);
  assert.deepEqual(texts(form, '.elo-choice span'), ['Card', 'Iban', 'Date']);
  assert.deepEqual(form.getRaw(), { number: '' });
  tick($$(form, 'input[type=radio]')[1]);
  type(control.call(null, form, 'Iban'), 'BE00');
  assert.deepEqual(form.validate().raw, { iban: 'BE00' });
  tick($$(form, 'input[type=radio]')[2]);
  type($(form, 'input[type=date]'), '2024-01-02');
  assert.equal(form.validate().raw, '2024-01-02');

  // String accepts what the Date box produces, and is tried first.
  const shadowed = mount('{ v: String|Date }');
  tick($$(shadowed, 'input[type=radio]')[1]);
  type($(shadowed, 'input[type=date]'), '2024-01-02');
  assert.match($(shadowed, '.elo-kind-union > .elo-note').textContent, /read as “Text”/);
});

test('loading data picks the alternative Elo would', () => {
  const form = mount('{ v: Bool|Int|{ code: String }|[Int] }');
  const picked = () => $$(form, 'input[type=radio]').findIndex((r) => r.checked);
  form.setValue({ v: 'true' }); assert.equal(picked(), 0); assert.deepEqual(form.getRaw(), { v: true });
  form.setValue({ v: 7 }); assert.equal(picked(), 1);
  form.setValue({ v: { code: 'x' } }); assert.equal(picked(), 2);
  form.setValue({ v: [1, 2] }); assert.equal(picked(), 3); assert.deepEqual(form.getRaw(), { v: [1, 2] });
});

// ---------------------------------------------------------------------------
test('constraints are said up front and enforced by Elo', () => {
  const form = mount(`
    Person = {
      name: String(s | length(s) <= 20 and not isEmpty(s)),
      age: Int(a | a >= 18, 'must be under 150': a < 150),
      level: Int(i | positive: i > 0, even: i % 2 == 0),
      code: String(c | startsWith(c, 'X'))
    }`);
  assert.deepEqual(texts(form, '.elo-hint'), [
    'Must be at most 20 characters long and filled in.',
    'Must be at least 18. Must be under 150.',
    'Must be greater than 0. Must be even.',
    "Must satisfy: startsWith(c, 'X')",
  ]);
  assert.equal(control(form, 'Name').getAttribute('maxlength'), '20');
  type(control(form, 'Age'), '12');
  type(control(form, 'Level'), '3');
  type(control(form, 'Code'), 'abc');
  assert.deepEqual(form.validate().problems, [
    { path: '.name', message: 'Must be filled in.' },
    { path: '.age', message: 'Must be at least 18.' },
    { path: '.level', message: 'Must be even.' },
    { path: '.code', message: "Must satisfy: startsWith(c, 'X')" },
  ]);
  type(control(form, 'Age'), '200');
  assert.equal(form.result.problems[1].message, 'Must be under 150.');
});

test('a constraint that lists its values becomes a choice among them', () => {
  const form = mount(`
    Color = String(c | c == 'red' or c == 'green')
    Size = Int(s | contains([1, 2, 3], s))
    { color: Color, size: Size }`);
  assert.deepEqual([...control(form, 'Color').options].map((o) => o.value), ['', 'red', 'green']);
  type(control(form, 'Size'), '2');
  type(control(form, 'Color'), 'green');
  assert.deepEqual(form.validate().raw, { color: 'green', size: 2 });
  assert.equal(form.result.valid, true);
});

test('constraints across fields are reported on the group, once its fields are right', () => {
  const form = mount(`
    Span = { from: Date, to: Date }
    Trip = { span: Span(s | 'the end must come after the start': s.to > s.from) }`);
  type(control(form, 'To'), '2024-01-01');
  assert.deepEqual(form.validate().problems.map((p) => p.path), ['.span.from']);
  type(control(form, 'From'), '2024-02-01');
  assert.deepEqual(form.validate().problems, [{ path: '.span', message: 'The end must come after the start.' }]);
  type(control(form, 'To'), '2024-03-01');
  assert.equal(form.validate().valid, true);
});

test('constraints can use dates and what the schema computes', () => {
  const form = mount('{ due: Date(d | d >= TODAY), stay: Duration(d | d <= P30D) }');
  assert.deepEqual(texts(form, '.elo-hint'), ['Must be today or later.', 'Must be at most 30 days.']);
  assert.ok(control(form, 'Due').getAttribute('min'));
  type(control(form, 'Due'), '2001-01-01');
  type($(form, '.elo-duration-part:not([hidden]) input'), '31');
  assert.deepEqual(form.validate().problems.map((p) => p.message), ['Must be today or later.', 'Must be at most 30 days.']);

  // Dates and durations inside a sentence follow the language of the messages, not of the browser.
  const french = mount('{ due: Date(d | d >= TODAY), stay: Duration(d | d <= P30D) }', { messages: { must: 'Doit {phrase}.', phrases: { locale: 'fr', cmp: { duration: { '<=': 'durer au plus {x}' } } } } });
  assert.match(texts(french, '.elo-hint')[1], /^Doit durer au plus 30\sjours\.$/);
});

// ---------------------------------------------------------------------------
test('anything and Data take simple values or a JSON file', async () => {
  const form = mount('{ a: ., d: Data }');
  type($(form, '.elo-kind-any input[type=text]'), 'hello');
  type($(form, '.elo-kind-data .elo-paste'), '{"k": [1, 2]}');
  assert.deepEqual(form.validate().raw, { a: 'hello', d: { k: [1, 2] } });
  assert.equal(form.result.valid, true);
  // A text for Data is sent quoted, since Data parses strings as JSON.
  tick($$(form, '.elo-kind-data input[type=radio]')[1]);
  type($(form, '.elo-kind-data input[type=text]'), 'plain');
  assert.equal(form.getRaw().d, '"plain"');
  assert.equal(form.validate().value.d, 'plain');
  // "Nothing" is null, which anything includes.
  tick($$(form, '.elo-kind-any input[type=radio]')[0]);
  assert.equal(form.validate().raw.a, null);
  assert.equal(form.result.valid, true);
  // Bad JSON says so.
  tick($$(form, '.elo-kind-data input[type=radio]').at(-1));
  type($(form, '.elo-kind-data .elo-paste'), '{oops');
  assert.match(form.validate().problems[0].message, /not valid JSON/);
});

test('a JSON file can stand in for any part, and is checked against that part', async () => {
  const form = mount('{ name: String, lines: [{ product: String, qty: Int(q | q > 0) }] }', {
    fallback: ({ path }) => path === '.lines',
  });
  assert.equal($$(form, '.elo-kind-array').length, 0);
  const file = $(form, 'input[type=file]');
  const upload = (content) => {
    Object.defineProperty(file, 'files', { value: [new File([content], 'lines.json')], configurable: true });
    file.dispatchEvent(new Event('change', { bubbles: true }));
    return new Promise((r) => setTimeout(r, 20));
  };
  await upload('[{"product": "pen", "qty": 0}]');
  assert.deepEqual(form.validate().problems, [{ path: '.lines', message: 'In 0.qty: Constraint failed.' }]);
  await upload('[{"product": "pen", "qty": "3"}]');
  assert.equal(form.validate().valid, true);
  assert.equal($(form, '.elo-json-status').textContent, 'lines.json: a list of 1 item');
  assert.deepEqual(form.result.value.lines, [{ product: 'pen', qty: 3 }]);
});

test('the whole form can be one JSON file', () => {
  const form = mount('{ name: String }', { fallback: ({ path }) => path === '.' });
  assert.equal($$(form, 'input').filter((i) => i.type !== 'file').length, 0);
  type($(form, '.elo-paste'), '{"name": 3}');
  assert.equal(form.validate().valid, false);
  type($(form, '.elo-paste'), '{"name": "ok"}');
  assert.equal(form.validate().valid, true);
});

test('forms too large or too deep hand the rest to JSON files rather than fail', () => {
  let source = 'T0 = { a: Int, b: Int }\n';
  for (let i = 1; i <= 30; i++) source += `T${i} = { a: T${i - 1}, b: T${i - 1} }\n`;
  const form = mount(source, { maxFields: 200 });
  assert.ok($$(form, '[data-elo-id]').length < 420);
  assert.ok($$(form, 'input[type=file]').length > 0);

  const deep = mount('{ a: { b: { c: { d: Int } } } }', { maxDepth: 2 });
  assert.equal($$(deep, 'input[type=file]').length, 1);
});

// ---------------------------------------------------------------------------
test('a schema can be a bare type, a prelude, or a program', () => {
  assert.equal(mount('Int').schema.name, undefined);
  assert.equal(mount('A = Int\nB = [A]').schema.name, 'B');
  assert.equal(mount('A = Int\nB = [A]', { type: 'A' }).schema.name, 'A');
  assert.equal(mount('let A = { x: Int }, B = Int in _ |> A').schema.name, 'A');
  assert.throws(() => mount('A = Int', { type: 'Nope' }), /Unknown type 'Nope'/);
  assert.throws(() => mount('1 + 1'), /No type definition/);
  assert.throws(() => mount('{ a: Missing }'));
});

test('constraints see the values and types in scope, imports included', () => {
  const sources = {
    'limits.elo': 'Qty = Int(q | q > 0)\n{ max: 10 }',
  };
  const loader = (path) => ({ id: path, source: sources[path.replace(/^\.\//, '') + '.elo'] ?? sources[path.replace(/^\.\//, '')] });
  const form = mount(`
    import { Qty } from './limits'
    import './limits' as limits
    Line = { qty: Qty(q | q <= limits.max) }`, { loader });
  type(control(form, 'Qty'), '11');
  assert.equal(form.validate().valid, false);
  type(control(form, 'Qty'), '10');
  assert.equal(form.validate().valid, true);

  const local = mount('let limit = 5 in let T = { n: Int(i | i < limit) } in _ |> T');
  assert.deepEqual(texts(local, '.elo-hint'), ['Must be less than 5.']);
});

test('a later definition may reuse a name without confusing earlier ones', () => {
  const form = mount('let A = Int(i | i > 0), B = { a: A } in let A = String in _ |> B');
  type(control(form, 'A'), '-1');
  assert.equal(form.validate().valid, false);
  type(control(form, 'A'), '1');
  assert.equal(form.validate().valid, true);
});

// ---------------------------------------------------------------------------
test('labels, messages and names can be supplied', () => {
  const form = mount('{ firstName: String, qty :? Int, lines: [{ qty: Int }] }', {
    labels: { firstName: 'Prénom', '.lines.*.qty': 'Quantité' },
    messages: { optional: 'facultatif', required: 'Ce champ est obligatoire.' },
    name: 'payload',
    title: 'Commande',
  });
  assert.deepEqual(texts(form, '.elo-label-text').slice(0, 3), ['Commande', 'Prénom', 'Qty']);
  assert.deepEqual(texts(form, '.elo-optional'), ['facultatif']);
  click($(form, '.elo-add'));
  assert.ok(texts(form, '.elo-label-text').includes('Quantité'));
  assert.deepEqual(form.validate().problems.map((p) => p.message), ['Ce champ est obligatoire.']);
  assert.equal($(form, 'input[type=hidden]').name, 'payload');
  assert.deepEqual(JSON.parse($(form, 'input[type=hidden]').value), form.getRaw());
});

test('field names pick friendlier inputs', () => {
  const form = mount('{ email: String, website: String, notes: String, bio: String(s | length(s) < 500), emails: [String] }');
  assert.equal(control(form, 'Email').type, 'email');
  assert.equal(control(form, 'Website').type, 'url');
  assert.equal(control(form, 'Notes').tagName, 'TEXTAREA');
  assert.equal(control(form, 'Bio').tagName, 'TEXTAREA');
  click($(form, '.elo-add'));
  assert.equal($(form, '.elo-item input').type, 'email');
});

test('reset empties the form; onChange hears every edit', () => {
  let heard = 0;
  const form = mount('{ name: String, tags: [String] }', { value: { name: 'A', tags: ['x'] }, onChange: () => heard++ });
  type(control(form, 'Name'), 'B');
  assert.equal(heard, 1);
  form.reset();
  assert.deepEqual(form.getRaw(), { name: '', tags: [] });
});

test('datetimes carry an offset unless asked not to', () => {
  const local = mount('{ at: Datetime }', { value: { at: '2024-06-15T10:30:00Z' } });
  assert.match(local.getRaw().at, /^2024-06-15T\d\d:30:00(Z|[+-]\d\d:\d\d)$/);
  assert.equal(local.validate().value.at.toMillis(), Date.UTC(2024, 5, 15, 10, 30));

  const bare = mount('{ at: Datetime }', { datetimeOffset: 'none', value: { at: '2024-06-15T10:30:00' } });
  assert.equal(bare.getRaw().at, '2024-06-15T10:30:00');
});

test('every label says where its words came from', () => {
  const form = mount(`
    Line = { product: String, qty: Int }
    Order = { placedOn: Date, lines: [Line], tags: [String], pay: Line|Date, extra: . }`, {
    title: 'New order',
    labels: { qty: 'Quantity', '.placedOn': 'Order date' },
    value: { lines: [{ product: 'pen', qty: 1 }] },
  });
  const from = Object.fromEntries($$(form, '[data-elo-from]').map((e) => [e.textContent, e.getAttribute('data-elo-from')]));
  assert.deepEqual(from, {
    'New order': 'options.title',
    'Order date': 'options.labels[".placedOn"]',
    Lines: 'attribute lines',
    'Line 1': 'type Line',
    Product: 'attribute product',
    Quantity: 'options.labels.qty',
    Tags: 'attribute tags',
    Pay: 'attribute pay',
    Line: 'type Line',
    Date: 'messages.kinds.date',
    Extra: 'attribute extra',
    Nothing: 'messages.kinds.null',
    Text: 'messages.kinds.string',
    Number: 'messages.kinds.float',
    'Yes / No': 'messages.kinds.bool',
    'JSON file': 'messages.kinds.json',
  });
  click($$(form, '.elo-add')[1]);
  assert.equal($$(form, '.elo-item')[1].querySelector('input').getAttribute('aria-label'), 'Tag 1');
});

// ---------------------------------------------------------------------------
const affix = (input) => {
  const box = input.parentElement;
  if (!box.classList.contains('elo-affixed')) return null;
  const el = box.querySelector('.elo-affix');
  return { text: el.textContent, before: box.firstElementChild === el, el };
};

test('units sit beside the input and in what the form says', () => {
  const form = mount(`
    Percent = Float(p | p >= 0 and p <= 100)
    Money   = Float(m | m >= 0)
    Price   = Money(m | m < 1000)
    {
      discount: Percent, unitPrice: Price, total: Money|Null, shipping: Float,
      width: Int(w | w > 10), weights: [Float(k | k < 50)], sizes: { ...: Int },
      handle: String, plain: Int
    }`, {
    units: {
      Percent: '%',                               // by type name
      Money: { text: '€', label: 'euros' },       // by a type further down the chain, with a spoken form
      shipping: '$',                              // by attribute name; $ goes in front by itself
      '.width': 'cm',                             // by schema path
      weights: 'kg',                              // on a list: its items take it
      sizes: 'mm',                                // on a dictionary: its values take it
      handle: { text: '@', position: 'before' },  // on a text box, placed explicitly
    },
  });
  assert.deepEqual(affix(control(form, 'Discount')).text, '%');
  assert.equal(affix(control(form, 'Unit price')).text, '€');
  assert.equal(affix(control(form, 'Total')).text, '€');
  assert.deepEqual([affix(control(form, 'Shipping')).text, affix(control(form, 'Shipping')).before], ['$', true]);
  assert.deepEqual([affix(control(form, 'Width')).text, affix(control(form, 'Width')).before], ['cm', false]);
  assert.deepEqual([affix(control(form, 'Handle')).text, affix(control(form, 'Handle')).before], ['@', true]);
  assert.equal(affix(control(form, 'Plain')), null);

  // The unit is part of the field's description for screen readers.
  const price = control(form, 'Unit price');
  assert.equal(price.getAttribute('aria-describedby').split(' ')[0], affix(price).el.id);
  assert.equal(affix(price).el.getAttribute('aria-label'), 'euros');

  // Hints speak in the unit: no space before %, a non-breaking one otherwise.
  assert.deepEqual(texts(form, '.elo-hint'), [
    'Must be at least 0% and at most 100%.',
    'Must be at least 0 €. Must be less than 1000 €.',
    'Must be at least 0 €.',
    'Must be greater than 10 cm.',
    'Each weight: Must be less than 50 kg.',
  ]);

  click($$(form, '.elo-add')[0]);
  assert.equal(affix($(form, '.elo-item input')).text, 'kg');
  click($(form, '.elo-extras .elo-add'));
  assert.equal(affix($(form, '.elo-row .elo-input-number')).text, 'mm');

  // Units are display only: the data is the bare number, and errors name the unit.
  type(price, '12.5');
  assert.equal(form.getRaw().unitPrice, 12.5);
  type(price, '1500');
  assert.equal(form.validate().problems.find((p) => p.path === '.unitPrice').message, 'Must be less than 1000 €.');
});

test('units can be computed, and switched off for one place', () => {
  const form = mount('{ amounts: [Float], lengths: [Float], count: Int }', {
    units: (path, key, types) => (key === 'amounts' ? 'EUR' : path === '.lengths' ? 'm' : path === '.lengths.*' ? null : undefined),
    value: { amounts: [1], lengths: [2] },
  });
  const [amount, length] = $$(form, '.elo-item input');
  assert.equal(affix(amount).text, 'EUR');
  assert.equal(affix(length), null);
  assert.equal(affix(control(form, 'Count')), null);
});
