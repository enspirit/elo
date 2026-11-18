// What a hostile schema, hostile data or a careless option can and cannot do to a form.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount, type, $$, resolveSchema, planSchema } from './setup.mjs';

const timed = (fn) => { const start = performance.now(); const out = fn(); return [performance.now() - start, out]; };

test('schema text only ever becomes text: no markup, no handlers, no links', () => {
  const form = mount(`T = { a: String(s | '<img src=x onerror=alert(1)> bad': s == '<b>x</b>' or s == '"><svg onload=alert(1)>'), b: [Int(i | '<script>alert(1)</script> no': i > 0)] }`,
    { value: { a: '<i>loaded</i>', b: [0] }, labels: { a: '<u>label</u>' }, units: { b: '<s>u</s>' }, title: '<h1>t</h1>' });
  form.validate();
  const tags = new Set($$(form, '*').map((el) => el.tagName.toLowerCase()));
  for (const tag of ['img', 'svg', 'script', 'b', 'i', 'u', 's', 'h1', 'a', 'iframe']) assert.ok(!tags.has(tag), `<${tag}> was created`);
  for (const el of [form.element, ...$$(form, '*')]) {
    for (const { name } of el.attributes) assert.ok(!/^on|^(href|src|style|action|formaction|srcdoc)$/.test(name), `${el.tagName} has ${name}`);
  }
  assert.match(form.element.textContent, /<img src=x onerror=alert\(1\)> bad/);
});

test('a host property name is not a type', () => {
  for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.throws(() => mount('A = Int', { type: name }), /Unknown type/);
  }
});

test('text taken from the schema or typed in is shown as it is, `$` included', () => {
  const form = mount("T = String(s | s == '$&' or s == '$1')");
  assert.deepEqual($$(form, '.elo-hint').map((e) => e.textContent), ['Must be one of: $&, $1.']);

  const open = mount('{ a: Int, ...: Int }', { value: { a: 1, x: 1, y: 2 } });
  for (const key of $$(open, '.elo-key')) type(key, "$&$'");
  assert.deepEqual(open.validate().problems.map((p) => p.message), ["The name “$&$'” is used twice."]);
});

test('messages loaded from JSON cannot swap prototypes', () => {
  const form = mount('{ a: Int }', { messages: JSON.parse('{"__proto__": {"required": "pwned"}, "phrases": {"__proto__": {"and": "pwned"}}}') });
  assert.equal({}.required, undefined);
  assert.deepEqual(form.validate().problems.map((p) => p.message), ['This field is required.']);
});

test('a long number is refused quickly', () => {
  const form = mount('Float');
  const [ms] = timed(() => form.setValue('1'.repeat(30000) + 'x'));
  assert.equal(form.result.valid, false);
  assert.ok(ms < 500, `took ${Math.round(ms)}ms`);
});

test('a long attribute name is labelled quickly', () => {
  const [ms] = timed(() => mount(`{ a${'A'.repeat(30000)}: Int }`));
  assert.ok(ms < 500, `took ${Math.round(ms)}ms`);
});

test('a union that doubles at every definition stays small', () => {
  let source = 'A0 = Int|String(s | true)\n';
  for (let i = 1; i < 40; i++) source += `A${i} = A${i - 1}|A${i - 1}\n`;
  const [ms, form] = timed(() => mount(source));
  assert.ok($$(form, 'input').length < 200, `${$$(form, 'input').length} inputs`);
  assert.ok(ms < 1000, `took ${Math.round(ms)}ms`);
  form.setValue('x');
  assert.equal(form.result.valid, true);
});

test('reading many definitions costs what they weigh', () => {
  let source = '';
  for (let i = 0; i < 20000; i++) source += `A${i} = Int(i | i > ${i})\n`;
  const [ms, model] = timed(() => planSchema(resolveSchema(source + '{ a: A7, b: A19999 }')));
  assert.deepEqual(model.props.map((p) => p.model.alias), ['A7', 'A19999']);
  assert.ok(ms < 1000, `took ${Math.round(ms)}ms`);
});

test('a definition sees the ones before it, and only those', () => {
  // The second Qty is built on the first; Line was written before it and keeps the first.
  const form = mount('let Qty = Int(q | q > 0) in let Line = { qty: Qty } in let Qty = Qty(q | q < 10) in let Order = { line: Line, more: Qty } in _ |> Order',
    { value: { line: { qty: 50 }, more: 50 } });
  assert.deepEqual(form.validate().problems.map((p) => p.path), ['.more']);
});

test('a constraint shown as source is written back as it was: backslashes and quotes included', () => {
  const form = mount(String.raw`String(s | startsWith(s, 'a\\b\'c'))`);
  assert.deepEqual($$(form, '.elo-hint').map((e) => e.textContent), [String.raw`Must satisfy: startsWith(s, 'a\\b\'c')`]);
});
