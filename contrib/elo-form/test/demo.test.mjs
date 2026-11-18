// The demo server is documentation people copy from: these cases fail when it stops doing what
// its pages say it does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDemoServer } from '../demo/server.mjs';

const server = createDemoServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

const get = (path) => fetch(base + path);
const GOOD = { customer: 'Ada', size: 'M', qty: 3, due: '2999-01-01', express: false };
const shown = (html) => [...html.matchAll(/<p class="elo-error" id="[^"]*" aria-live="polite">([^<]+)<\/p>/g)].map((m) => m[1]);

test('every page answers, each with the policy its mode needs and no more', async () => {
  const policies = {};
  for (const path of ['/', '/1-in-page', '/2-plan', '/3-checks', '/4-html', '/5-hydrate', '/5-hydrate-checked']) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    policies[path] = response.headers.get('content-security-policy');
    assert.match(policies[path], /^default-src 'none'/, path);
    // Nothing a policy would have to make room for: no inline script, no inline style.
    assert.doesNotMatch(html, /<script(?![^>]*\b(src|type="application\/json"))[^>]*>/, `${path} has an inline script`);
    assert.doesNotMatch(html, /<style|\sstyle="/, `${path} has an inline style`);
    assert.doesNotMatch(html, /<!--[A-Z]+-->/, `${path} has a placeholder left in it`);
  }
  assert.match(policies['/1-in-page'], /script-src 'self' 'unsafe-eval'/);
  for (const path of ['/2-plan', '/3-checks', '/5-hydrate']) {
    assert.match(policies[path], /script-src 'self'(;|$)/, path);
    assert.doesNotMatch(policies[path], /unsafe/, path);
  }
  assert.doesNotMatch(policies['/4-html'], /script-src/);
});

test('every file a page asks for is served', async () => {
  for (const name of ['index', '1-in-page', '2-plan', '3-checks', '4-html', '5-hydrate', 'nav']) {
    const html = readFileSync(new URL(`../demo/pages/${name}.html`, import.meta.url), 'utf8');
    for (const [, path] of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      assert.equal((await get(path)).status, 200, `${name}.html asks for ${path}`);
    }
  }
  for (const name of ['1-in-page', '2-plan', '3-checks', '5-hydrate']) {
    const js = readFileSync(new URL(`../demo/pages/${name}.js`, import.meta.url), 'utf8');
    for (const [, path] of js.matchAll(/(?:from |import\(|fetch\()'(\/[^']*)'/g)) {
      const response = await fetch(base + path, path === '/order/check' ? { method: 'POST', body: '{}' } : {});
      assert.notEqual(response.status, 404, `${name}.js asks for ${path}`);
    }
  }
});

test('the plan and the checks are what a page can use, and agree with each other', async () => {
  const plan = await (await get('/order/plan.json')).json();
  assert.equal(plan.name, 'Order');
  const checks = await (await get('/order/checks.js')).text();
  assert.match(checks, /^import \{ DateTime, Duration, Interval \} from "\/vendor\/luxon\.js";$/m);
  const ids = [...checks.matchAll(/nodes: (\{.*\})/g)].flatMap((m) => Object.keys(JSON.parse(m[1])));
  assert.ok(ids.includes(String(plan.root.id)));
});

test('the server gives the verdict that counts, as Elo threw it', async () => {
  const post = (raw) => fetch(`${base}/order/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(raw) });
  const ok = await post(GOOD);
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { accepted: GOOD });
  const refused = await post({ ...GOOD, qty: -5 });
  assert.equal(refused.status, 422);
  assert.deepEqual(await refused.json(), { path: '.qty', kind: 'constraint', message: 'constraint failed' });
  const labelled = await (await post({ ...GOOD, customer: '' })).json();
  assert.equal(labelled.label, 'please say who it is for');
  // An email is optional, but one that is given has to look like one.
  assert.equal((await post({ ...GOOD, email: 'ada@example.org' })).status, 200);
  assert.deepEqual(await (await post({ ...GOOD, email: 'ada@example' })).json(), {
    path: '.email', kind: 'constraint', label: 'must look like an email address, such as ada@example.org', message: 'must look like an email address, such as ada@example.org',
  });
  assert.equal((await fetch(`${base}/order/check`, { method: 'POST', body: 'not json' })).status, 400);
  assert.equal((await fetch(`${base}/order/check`, { method: 'POST', body: 'x'.repeat(70000) })).status, 413);
});

test('with no script at all: the form is sent, refused on its field, corrected, accepted', async () => {
  const first = await (await get('/4-html')).text();
  assert.match(first, /Not sent yet\./);
  assert.match(first, /<input class="elo-input elo-input-number"[^>]*name="qty"[^>]*value="-5">/);
  // What a browser posts for the form as it stands.
  const query = (o) => new URLSearchParams(Object.entries(o).flatMap(([k, v]) => (k === 'express' ? [[k, 'false'], ...(v ? [[k, 'true']] : [])] : [[k, String(v)]])));
  const refused = await (await get(`/4-html?${query({ ...GOOD, email: '', qty: -5, express: true })}`)).text();
  assert.match(refused, /Refused at \.qty\./);
  assert.deepEqual(shown(refused), ['Must be greater than 0.']);
  // It came back holding what was sent, the ticked box included.
  assert.match(refused, /name="qty"[^>]*value="-5"/);
  assert.match(refused, /<input type="checkbox"[^>]*name="express"[^>]*checked>/);
  const accepted = await (await get(`/4-html?${query({ ...GOOD, email: '' })}`)).text();
  assert.deepEqual(shown(accepted), []);
  assert.ok(accepted.includes(`Accepted: ${JSON.stringify(GOOD).replace(/"/g, '&quot;')}`));
  // The author's own sentence is what a refused email says; an empty one is simply not given.
  const email = await (await get(`/4-html?${query({ ...GOOD, email: 'nope' })}`)).text();
  assert.deepEqual(shown(email), ['Must look like an email address, such as ada@example.org.']);
  assert.match(email, /<input class="elo-input" type="email"[^>]*name="email"[^>]*value="nope">/);
  // A number that is not one goes to Elo as typed, and is refused in Elo's words.
  const typo = await (await get(`/4-html?${query({ ...GOOD, qty: 'many' })}`)).text();
  assert.match(typo, /Refused at \.qty\./);
});

test('the page that is taken over carries what the script starts from', async () => {
  const plain = await (await get('/5-hydrate')).text();
  const checked = await (await get('/5-hydrate-checked?customer=Grace&size=L&qty=2&due=2999-01-01&express=false')).text();
  assert.match(plain, /data-checks="no"/);
  assert.match(checked, /data-checks="yes"/);
  const value = JSON.parse(/<script type="application\/json" id="value">(.*?)<\/script>/.exec(checked)[1]);
  assert.deepEqual(value, { customer: 'Grace', size: 'L', qty: 2, due: '2999-01-01', express: false });
});
