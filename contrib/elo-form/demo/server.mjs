// The demo server: every integration mode of elo-form, over real HTTP.
//
//   npm run demo          then open http://localhost:4173
//
// It has no dependency beyond elo-form's own (Elo and Luxon), and it is meant to be read and
// copied from. What each mode needs from a server is one of the routes below, a few lines each.
//
// The schema is demo/order.elo. Edit it and reload: it is read again at every request.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile } from '@enspirit/elo';
import { DateTime, Duration, Interval } from 'luxon';
import { planForm, compileChecks } from '@enspirit/elo-form/plan';
import { renderHtml, readPosted } from '@enspirit/elo-form/render';

const here = (path) => new URL(path, import.meta.url);
const read = (path) => readFileSync(here(path), 'utf8');

// ---------------------------------------------------------------------------
// The four things a server does with a schema
// ---------------------------------------------------------------------------

const schema = () => read('order.elo');
/** The data every form starts from. It breaks two rules, so that each mode shows how it finds out. */
const start = () => JSON.parse(read('order.start.json'));

/** 1. The form, as JSON. Reading a schema parses it and runs nothing of it. */
const plan = () => planForm(schema());

/**
 * 2. Elo's checks, as a JavaScript module for the page to load. `format: 'module'` makes it import
 *    Luxon itself, from the address given: Elo's compiled code needs it when it runs.
 */
const checksModule = () => compileChecks(schema(), { format: 'module', luxon: '/vendor/luxon.js' });

/**
 * 3. The verdict that counts: `raw |> Order`, here, whatever a browser said before.
 *    Null when accepted; otherwise Elo's error as it was thrown, which is what `setProblems` and
 *    the `problems` option take.
 *
 *    This runs the schema in this process. For a schema somebody else wrote, run it wherever you
 *    run untrusted code, under a time limit: Elo does not bound how long an expression takes.
 */
function check(raw) {
  const accept = compile(`${schema()}\n_ |> ${plan().name}`, { runtime: { DateTime, Duration, Interval } });
  try { accept(raw); return null; } catch (e) {
    const path = e.path || '.';
    const text = String(e.message || e);
    return { path, kind: e.kind, label: e.label, message: text.startsWith(`${path}: `) ? text.slice(path.length + 2) : text };
  }
}

/** The options a form is written with, and read back with, and taken over with: the same ones. */
const FORM = { names: true, id: 'order' };

/**
 * 4. The form as HTML, for a browser that runs no script — and what comes back when it is sent.
 *    Returns the HTML to put inside a <form method="get">, and what to say about it.
 */
function htmlForm(posted) {
  if ([...posted.keys()].length === 0) {
    return { html: renderHtml(plan(), { ...FORM, value: start() }), status: 'Not sent yet.' };
  }
  // The fields come back as text under their names. Read them the way the form itself would:
  // a number as a number, an empty optional box as absent, an unticked box as false.
  const { raw } = readPosted(plan(), posted, FORM);
  const refusal = check(raw);
  return {
    // Accepted or refused, the same form goes back, holding what was sent — and what was wrong with it.
    html: renderHtml(plan(), { ...FORM, value: raw, problems: refusal ? [refusal] : [] }),
    status: refusal ? `Refused at ${refusal.path}. The form came back with the problem on its field.` : `Accepted: ${JSON.stringify(raw)}`,
    raw,
  };
}

// ---------------------------------------------------------------------------
// The policy of each page: what its mode needs, and nothing more
// ---------------------------------------------------------------------------

const BASE = "default-src 'none'; style-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
const POLICIES = {
  // Compiling in the page is `new Function`: the one mode that has to open the policy.
  '1-in-page': `${BASE}; script-src 'self' 'unsafe-eval'`,
  '2-plan': `${BASE}; script-src 'self'`,
  '3-checks': `${BASE}; script-src 'self'`,
  // The checks run in a worker, which is started from this origin and from nowhere else.
  '6-worker': `${BASE}; script-src 'self'; worker-src 'self'`,
  // No script-src at all: `default-src 'none'` forbids every script.
  '4-html': BASE,
  '5-hydrate': `${BASE}; script-src 'self'`,
  index: BASE,
};

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

/**
 * The worker's own policy. A worker answers to the headers its script came with, not to the
 * page's: this one may import scripts from here (the checks, Luxon) and reach nothing else —
 * no fetch, no socket. That is what makes a worker more than a second thread.
 */
const WORKER_POLICY = "default-src 'none'; script-src 'self'";

const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** JSON inside a <script type="application/json">: `<` must not be able to close the element. */
const dataBlock = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

/** A page of demo/pages, with the placeholders every page has filled in. */
function page(name, fill = {}) {
  const policy = POLICIES[name.replace(/-checked$/, '')];
  const body = read(`pages/${name.replace(/-checked$/, '')}.html`)
    .replace('<!--NAV-->', () => read('pages/nav.html'))
    .replace('<!--POLICY-->', () => escape(policy.split('; ').join(';\n')))
    .replace('<!--WORKERPOLICY-->', () => escape(WORKER_POLICY.split('; ').join(';\n')))
    .replace('<!--SCHEMA-->', () => escape(schema()))
    .replace(/<!--([A-Z]+)-->/g, (_, key) => fill[key] ?? '');
  return { status: 200, type: 'text/html; charset=utf-8', body, policy };
}

const file = (path, type, policy) => ({ status: 200, type, body: readFileSync(here(path)), policy });
const json = (value, status = 200) => ({ status, type: 'application/json', body: JSON.stringify(value) });

const STATIC = {
  '/lib/elo-form.css': ['../dist/elo-form.css', 'text/css'],
  '/lib/elo-form.render.js': ['../dist/elo-form.render.js', 'text/javascript'],
  '/lib/elo-form.worker.js': ['../dist/elo-form.worker.js', 'text/javascript', WORKER_POLICY],
  '/lib/elo-form.standalone.js': ['../dist/elo-form.standalone.js', 'text/javascript'],
  '/vendor/luxon.js': ['../node_modules/luxon/build/es6/luxon.mjs', 'text/javascript'],
  '/pages/demo.css': ['pages/demo.css', 'text/css'],
  '/pages/1-in-page.js': ['pages/1-in-page.js', 'text/javascript'],
  '/pages/2-plan.js': ['pages/2-plan.js', 'text/javascript'],
  '/pages/3-checks.js': ['pages/3-checks.js', 'text/javascript'],
  '/pages/6-worker.js': ['pages/6-worker.js', 'text/javascript'],
  '/pages/5-hydrate.js': ['pages/5-hydrate.js', 'text/javascript'],
  // The demo's own source, to read in the browser.
  '/source/server.mjs': ['server.mjs', 'text/plain; charset=utf-8'],
  '/source/order.elo': ['order.elo', 'text/plain; charset=utf-8'],
};

async function body(request, limit = 64 * 1024) {
  let text = '';
  for await (const chunk of request) {
    text += chunk;
    if (text.length > limit) throw Object.assign(new Error('too large'), { status: 413 });
  }
  return text;
}

async function route(request) {
  const url = new URL(request.url, 'http://localhost');
  const { pathname } = url;

  // What a page fetches: the plan, the data to start from, the checks.
  if (pathname === '/order/schema.elo') return { status: 200, type: 'text/plain; charset=utf-8', body: schema() };
  if (pathname === '/order/plan.json') return json(plan());
  if (pathname === '/order/start.json') return json(start());
  if (pathname === '/order/checks.js') return { status: 200, type: 'text/javascript', body: checksModule() };

  // What a page sends: the data, for the verdict. 200 and the data when accepted, 422 and Elo's error when not.
  if (pathname === '/order/check' && request.method === 'POST') {
    let raw;
    try { raw = JSON.parse(await body(request)); } catch (e) { return json({ message: 'not JSON' }, e.status ?? 400); }
    const refusal = check(raw);
    return refusal ? json(refusal, 422) : json({ accepted: raw });
  }

  if (pathname === '/') return page('index');
  if (pathname === '/1-in-page' || pathname === '/2-plan' || pathname === '/3-checks' || pathname === '/6-worker') return page(pathname.slice(1));

  // The two pages whose form is written here, as HTML. Sending the form is a GET to the same address.
  if (pathname === '/4-html' || pathname === '/5-hydrate' || pathname === '/5-hydrate-checked') {
    const { html, status, raw } = htmlForm(url.searchParams);
    return page(pathname.slice(1), {
      FORM: html,
      STATUS: escape(status),
      // For the script that takes the form over: what it holds, and whether to load the checks.
      VALUE: dataBlock(raw ?? start()),
      CHECKS: pathname.endsWith('-checked') ? 'yes' : 'no',
    });
  }

  if (STATIC[pathname]) return file(...STATIC[pathname]);
  return { status: 404, type: 'text/plain', body: 'Not found' };
}

export function createDemoServer() {
  return createServer(async (request, response) => {
    let answer;
    try { answer = await route(request); }
    catch (e) { answer = { status: e.status ?? 500, type: 'text/plain; charset=utf-8', body: String(e.message ?? e) }; }
    response.writeHead(answer.status, {
      'content-type': answer.type,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...(answer.policy ? { 'content-security-policy': answer.policy } : {}),
    });
    response.end(answer.body);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4173);
  createDemoServer().listen(port, '127.0.0.1', () => console.log(`elo-form demo: http://localhost:${port}`));
}
