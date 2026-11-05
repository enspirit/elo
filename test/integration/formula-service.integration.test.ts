import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runInNewContext } from 'node:vm';
import type { Server } from 'node:http';
import { EXAMPLE_CATALOGUE, loadBundle } from '../../contrib/formula-service/src/bundle';
import { serve } from '../../contrib/formula-service/src/server';

/**
 * The REST contract of `contrib/formula-service`, over the catalogue it ships
 * with — the `0234-rest-faas` task's §1 to §5 and §7, the three phases the MVP
 * covers.
 *
 * This is the level the service is testable at: it has no `.elo` of its own to
 * assert on, and what it promises is status codes, headers and body shapes.
 * What runs *inside* it is the catalogue, which the acceptance suite already
 * runs on three targets (test/acceptance/test-formulas.sh).
 */

const JSON_HEADERS = { 'content-type': 'application/json' };

let server: Server;
let base: string;

before(async () => {
  ({ server, url: base } = await serve({ catalogue: EXAMPLE_CATALOGUE, port: 0 }));
});

after(() => {
  server.close();
});

/** A catalogue of our own, to put a formula the thirteen do not have in. */
function temporaryCatalogue(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'elo-catalogue-'));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

function copyBundle(catalogue: string, id: string, as: string): string {
  const target = join(catalogue, ...as.split('/'));
  mkdirSync(join(target, '..'), { recursive: true });
  cpSync(join(EXAMPLE_CATALOGUE, id), target, { recursive: true });
  return target;
}

function writeBundle(catalogue: string, as: string, files: Record<string, string>): string {
  const dir = join(catalogue, ...as.split('/'));
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
}

/**
 * A JSON body, typed loosely on purpose: `fetch` answers `unknown`, which is
 * right and unhelpful here, where every body is checked against a literal.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function bodyOf(response: Response | Promise<Response>): Promise<any> {
  return (await response).json();
}

const get = (path: string, headers: Record<string, string> = {}) =>
  fetch(`${base}${path}`, { headers });

const post = (path: string, body: string, headers: Record<string, string> = JSON_HEADERS) =>
  fetch(`${base}${path}`, { method: 'POST', body, headers });

// ---------------------------------------------------------------------------
// §7 The index
// ---------------------------------------------------------------------------

describe('Formula service - the index', () => {
  it('lists every formula of the catalogue', async () => {
    const response = await get('/');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');

    const body = await bodyOf(response);
    assert.equal(body.formulas.length, 13);
    assert.deepEqual(body.folders, [], 'the shipped catalogue is flat');
    assert.deepEqual(body.formulas.map((f: { id: string }) => f.id).slice(0, 3), ['age', 'bmi', 'card-number']);
  });

  it('says of each formula what a browsable catalogue needs, and no more', async () => {
    const body = await bodyOf(get('/'));
    const iban = body.formulas.find((f: { id: string }) => f.id === 'iban');
    assert.deepEqual(iban, {
      id: 'iban',
      version: '1.0.0',
      title: 'Is this a valid IBAN?',
      tags: ['validation', 'banking'],
      versions: ['1.0.0'],
      links: {
        self: '/iban@1.0.0',
        latest: '/iban',
        call: '/iban@1.0.0/call',
      },
    });
  });

  it('revalidates, because the latest version of a formula may change', async () => {
    const response = await get('/');
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    assert.ok(response.headers.get('etag'), 'no etag on the index');
  });

  it('filters by tag', async () => {
    const body = await bodyOf(get('/?tag=banking'));
    assert.deepEqual(body.formulas.map((f: { id: string }) => f.id), ['iban']);
  });

  it('filters by a substring of the title or the documentation', async () => {
    assert.deepEqual(
      (await bodyOf(get('/?q=IBAN'))).formulas.map((f: { id: string }) => f.id),
      ['iban']
    );
    // The documentation counts too, and `leap` is in two doc comments: the
    // formula about leap years, and the one that prorates a month of one.
    assert.deepEqual(
      (await bodyOf(get('/?q=leap'))).formulas.map((f: { id: string }) => f.id),
      ['leap-year', 'subscription-proration']
    );
  });

  it('pages', async () => {
    const all = await bodyOf(get('/'));
    const page = await bodyOf(get('/?per_page=3&page=2'));
    assert.deepEqual(
      page.formulas.map((f: { id: string }) => f.id),
      all.formulas.slice(3, 6).map((f: { id: string }) => f.id)
    );
  });
});

// ---------------------------------------------------------------------------
// §3 Describing a formula
// ---------------------------------------------------------------------------

describe('Formula service - the descriptor', () => {
  it('is the bundle, flattened', async () => {
    const response = await get('/iban@1.0.0');
    assert.equal(response.status, 200);
    const bundle = loadBundle(join(EXAMPLE_CATALOGUE, 'iban'));
    assert.deepEqual(await bodyOf(response), {
      id: 'iban',
      version: '1.0.0',
      title: 'Is this a valid IBAN?',
      doc: bundle.doc,
      tags: ['validation', 'banking'],
      license: 'MIT',
      deprecated: false,
      fields: [
        {
          path: 'iban',
          label: 'IBAN',
          type: 'String',
          widget: 'text',
          required: true,
          constraints: ['notBlank'],
          placeholder: 'BE68 5390 0754 7034',
        },
      ],
      answers: [
        { path: 'valid', type: 'Bool', required: true },
        { path: 'country', type: 'String', required: false },
        { path: 'formatted', type: 'String', required: false },
      ],
      cases: bundle.cases,
      targets: ['js', 'ruby', 'python'],
      links: {
        self: '/iban@1.0.0',
        latest: '/iban',
        call: '/iban@1.0.0/call',
        form: '/iban@1.0.0/form',
        openapi: '/iban@1.0.0/openapi.json',
      },
    });
  });

  it('describes an answer that is not a record as the one value it is', async () => {
    const body = await bodyOf(get('/leap-year@1.0.0'));
    assert.deepEqual(body.answers, [{ path: 'value', type: 'Bool', required: true }]);
  });

  it('caches a pinned version forever, since a published version never changes', async () => {
    const response = await get('/iban@1.0.0');
    assert.match(response.headers.get('cache-control') ?? '', /immutable/);
    assert.ok(response.headers.get('etag'));
  });

  it('answers the latest version under the unversioned name, and says which it was', async () => {
    const response = await get('/iban');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-location'), '/iban@1.0.0');
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    assert.deepEqual(await bodyOf(response), await bodyOf(get('/iban@1.0.0')));
  });

  it('answers 304 to a client that already has it', async () => {
    const etag = (await get('/iban@1.0.0')).headers.get('etag') as string;
    const response = await get('/iban@1.0.0', { 'if-none-match': etag });
    assert.equal(response.status, 304);
    assert.equal(await response.text(), '');
  });

  it('has nothing under a name or a version it does not serve', async () => {
    assert.equal((await get('/nope')).status, 404);
    assert.equal((await get('/iban@9.9.9')).status, 404);
    assert.equal((await get('/iban@1.0.0/nope')).status, 404);
  });

  it('takes GET and HEAD only', async () => {
    const response = await post('/iban@1.0.0', '{}');
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
  });

  it('answers a HEAD with the headers and no body', async () => {
    const response = await fetch(`${base}/iban@1.0.0`, { method: 'HEAD' });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '');
    assert.ok(response.headers.get('etag'));
  });
});

// ---------------------------------------------------------------------------
// §3 The compiled representations: algorithmic transparency
// ---------------------------------------------------------------------------

describe('Formula service - the program it runs', () => {
  it('serves it as Elo', async () => {
    const response = await get('/iban@1.0.0', { accept: 'application/x-elo' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/x-elo; charset=utf-8');
    const source = await response.text();
    assert.match(source, /import \{ Input, Output \} from '\.\/types'/);
    assert.match(source, /formula\(_ \|> Input\) \|> Output/);
  });

  it('serves it compiled to JavaScript, prelude included — and it runs', async () => {
    const response = await get('/iban@1.0.0', { accept: 'application/javascript' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/javascript; charset=utf-8');
    const code = await response.text();
    assert.match(code, /require\('luxon'\)/, 'the prelude is not there');

    // The strongest form of the claim: the representation is the program that
    // ran, so running it here must answer what /call answers.
    const formula = runInNewContext(code, { require }) as (input: unknown) => unknown;
    const answer = formula({ iban: 'BE68 5390 0754 7034' });
    // Through JSON because the value comes from another realm, where an object
    // has another `Object` and a deep-equal is not reference-equal.
    assert.deepEqual(JSON.parse(JSON.stringify(answer)), {
      valid: true,
      country: 'BE',
      formatted: 'BE68 5390 0754 7034',
    });
  });

  it('serves it compiled to Ruby and to Python', async () => {
    const ruby = await get('/iban@1.0.0', { accept: 'text/x-ruby' });
    assert.equal(ruby.headers.get('content-type'), 'text/x-ruby; charset=utf-8');
    assert.match(await ruby.text(), /require 'date'/);

    const python = await get('/iban@1.0.0', { accept: 'text/x-python' });
    assert.equal(python.headers.get('content-type'), 'text/x-python; charset=utf-8');
    assert.match(await python.text(), /import datetime/);
  });

  it('refuses a representation it does not have', async () => {
    assert.equal((await get('/iban@1.0.0', { accept: 'application/pdf' })).status, 406);
  });

  it('has no HTML page yet, and says so rather than guessing', async () => {
    // Phase 4 of the plan. A browser asking for anything (`*/*`) still gets JSON.
    assert.equal((await get('/iban@1.0.0', { accept: 'text/html' })).status, 406);
    assert.equal((await get('/iban@1.0.0', { accept: 'text/html,*/*;q=0.8' })).status, 200);
    assert.equal((await get('/iban@1.0.0/form')).status, 404);
  });
});

// ---------------------------------------------------------------------------
// §1 The five files of the bundle, each a sub-resource
// ---------------------------------------------------------------------------

describe('Formula service - the files of a bundle', () => {
  it('serves each one verbatim, so a client may resolve the imports itself', async () => {
    for (const file of ['types.elo', 'formula.elo', 'fields.elo', 'cases.elo']) {
      const response = await get(`/iban@1.0.0/${file}`);
      assert.equal(response.status, 200, file);
      assert.equal(response.headers.get('content-type'), 'application/x-elo; charset=utf-8', file);
      assert.equal(await response.text(), readFileSync(join(EXAMPLE_CATALOGUE, 'iban', file), 'utf-8'), file);
    }
  });

  it('serves the manifest as JSON', async () => {
    const response = await get('/iban@1.0.0/bundle.json');
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.deepEqual(await bodyOf(response), { bundle: 1, version: '1.0.0', license: 'MIT', tags: ['validation', 'banking'] });
  });

  it('serves them under the alias too, naming the version that answered', async () => {
    const response = await get('/iban/types.elo');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-location'), '/iban@1.0.0/types.elo');
  });

  it('has no file a bundle does not have', async () => {
    assert.equal((await get('/iban@1.0.0/service.elo')).status, 404);
  });
});

// ---------------------------------------------------------------------------
// §4 Calling it
// ---------------------------------------------------------------------------

describe('Formula service - POST /call', () => {
  it('answers the formula output and nothing else', async () => {
    const response = await post('/iban@1.0.0/call', JSON.stringify({ iban: 'BE68 5390 0754 7034' }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.deepEqual(await bodyOf(response), {
      valid: true,
      country: 'BE',
      formatted: 'BE68 5390 0754 7034',
    });
  });

  it('answers a scalar when the formula answers one', async () => {
    const response = await post('/leap-year@1.0.0/call', JSON.stringify({ year: 2024 }));
    assert.equal(await bodyOf(response), true);
  });

  it('writes a declared Date as a date, not as a moment in the server timezone', async () => {
    const body = await bodyOf(post(
      '/payment-due-date@1.0.0/call',
      JSON.stringify({ invoiceDate: '2026-01-10', terms: 'NET15', today: '2026-01-10' })
    ));
    assert.deepEqual(body, { dueDate: '2026-01-25', daysLeft: 15, overdue: false, dueThisWeek: false });
  });

  it('coerces what the type declares, which is how a JSON string becomes a Date', async () => {
    const body = await bodyOf(post(
      '/age@1.0.0/call',
      JSON.stringify({ birthDate: '1990-03-15', on: '2026-11-05' })
    ));
    assert.deepEqual(body, { years: 36, isAdult: true, birthdayToday: false });
  });

  it('says which version answered, and that the answer is not to be stored', async () => {
    const response = await post('/age/call', JSON.stringify({ birthDate: '1990-03-15', on: '2026-11-05' }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-location'), '/age@1.0.0/call');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });

  it('answers every case of every formula what the case says', async () => {
    // The documentation of the API is its test suite: a case input is a request
    // body by construction, so this is the whole catalogue over HTTP.
    const index = await bodyOf(get('/'));
    for (const entry of index.formulas as { id: string; version: string }[]) {
      const descriptor = await bodyOf(get(`/${entry.id}@${entry.version}`));
      for (const testCase of descriptor.cases as { name: string; input: unknown }[]) {
        const response = await post(`/${entry.id}@${entry.version}/call`, JSON.stringify(testCase.input));
        assert.equal(response.status, 200, `${entry.id}: ${testCase.name} answered ${response.status}`);
      }
    }
  });
});

describe('Formula service - when a call fails', () => {
  const callLeapYear = (input: unknown) => post('/leap-year@1.0.0/call', JSON.stringify(input));

  it('maps a value that does not fit the type onto the field that carried it', async () => {
    const response = await callLeapYear({ year: 'not a year' });
    assert.equal(response.status, 422);
    const body = await bodyOf(response);
    assert.equal(body.kind, 'schema');
    assert.equal(body.path, '.year');
    assert.equal(body.field, 'year', 'the key of fields.elo, so a form can put the message on it');
    assert.ok(body.message.length > 0);
  });

  it('maps a missing field to its own kind', async () => {
    const body = await bodyOf(callLeapYear({}));
    assert.equal(body.kind, 'missing');
    assert.equal(body.field, 'year');
  });

  it('names the constraint that refused a value', async () => {
    const response = await callLeapYear({ year: 1500 });
    assert.equal(response.status, 422);
    const body = await bodyOf(response);
    assert.equal(body.kind, 'constraint');
    assert.equal(body.label, 'gregorian');
    assert.equal(body.field, 'year');
  });

  it('refuses an attribute the input does not declare', async () => {
    const response = await callLeapYear({ year: 2024, extra: true });
    assert.equal(response.status, 422);
    assert.equal((await bodyOf(response)).kind, 'schema');
  });

  it('answers 400 to a body it cannot parse', async () => {
    assert.equal((await post('/leap-year@1.0.0/call', '{ nope')).status, 400);
  });

  it('answers 415 to a content type it cannot read', async () => {
    const csv = await post('/leap-year@1.0.0/call', 'year\n2024\n', { 'content-type': 'text/csv' });
    assert.equal(csv.status, 415);
    assert.match((await bodyOf(csv)).message, /text\/csv/);
    assert.equal((await post('/leap-year@1.0.0/call', '2024', { 'content-type': 'application/xml' })).status, 415);
  });

  it('answers 413 to a body past the cap', async () => {
    const huge = JSON.stringify({ year: 2024, padding: 'x'.repeat(200_000) });
    assert.equal((await post('/leap-year@1.0.0/call', huge)).status, 413);
  });

  it('answers 406 to an accept it cannot satisfy', async () => {
    const response = await post('/leap-year@1.0.0/call', JSON.stringify({ year: 2024 }), {
      ...JSON_HEADERS,
      accept: 'text/csv',
    });
    assert.equal(response.status, 406);
  });

  it('has no call for a formula it does not serve', async () => {
    assert.equal((await post('/nope/call', '{}')).status, 404);
    assert.equal((await post('/leap-year@2.0.0/call', '{}')).status, 404);
  });

  it('takes POST and GET only', async () => {
    const response = await fetch(`${base}/leap-year@1.0.0/call`, { method: 'DELETE' });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, POST');
  });
});

// ---------------------------------------------------------------------------
// §4 A computed result has a URL
// ---------------------------------------------------------------------------

describe('Formula service - GET /call', () => {
  it('reads the query as the input, which the declared type coerces', async () => {
    const response = await get('/age@1.0.0/call?birthDate=1990-03-15&on=2026-11-05');
    assert.equal(response.status, 200);
    assert.deepEqual(await bodyOf(response), { years: 36, isAdult: true, birthdayToday: false });
  });

  it('answers the same thing as the POST, linkably', async () => {
    const response = await get('/leap-year/call?year=2024');
    assert.equal(await bodyOf(response), true);
    assert.equal(response.headers.get('content-location'), '/leap-year@1.0.0/call?year=2024');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });

  it('refuses a value the type refuses, as the POST does', async () => {
    const response = await get('/leap-year@1.0.0/call?year=1500');
    assert.equal(response.status, 422);
    assert.equal((await bodyOf(response)).label, 'gregorian');
  });

  it('answers 414 past a sane URL length, so the client uses POST', async () => {
    const response = await get(`/leap-year@1.0.0/call?year=${'2'.repeat(4000)}`);
    assert.equal(response.status, 414);
  });
});

// ---------------------------------------------------------------------------
// §1 A formula's id is its path; §7 a folder is a folder
// ---------------------------------------------------------------------------

describe('Formula service - a catalogue of folders', () => {
  const catalogue = temporaryCatalogue();
  let folded: Server;
  let foldedBase: string;

  before(async () => {
    copyBundle(catalogue.dir, 'leap-year', 'leap-year');
    copyBundle(catalogue.dir, 'vat-number-be', 'tax/be/vat');
    writeBundle(catalogue.dir, 'nested', {
      'types.elo': 'Input = {\n  customer: {\n    name: String,\n    age: Int\n  }\n}\n\nOutput = String\n',
      'formula.elo': '# Who is this?\n#\n# A formula over a nested input, which a query reaches by dotted path.\n\n'
        + "let\n  who = fn( input ~> input.customer.name + ' (' + String(input.customer.age) + ')' )\nin\n  { formula: who }\n",
      'fields.elo': "{\n  fields: [\n    {\n      path: 'customer.name',\n      label: 'Name',\n      type: 'String',\n"
        + "      widget: 'text',\n      required: true\n    },\n    {\n      path: 'customer.age',\n      label: 'Age',\n"
        + "      type: 'Int',\n      widget: 'number',\n      required: true\n    }\n  ]\n}\n",
      'cases.elo': "{\n  cases: [\n    {\n      name: 'a customer',\n      input: {customer: {name: 'Alice', age: 30}},\n"
        + "      expect: 'Alice (30)'\n    }\n  ]\n}\n",
      'bundle.json': '{\n  "bundle": 1,\n  "version": "1.0.0"\n}\n',
    });
    ({ server: folded, url: foldedBase } = await serve({ catalogue: catalogue.dir, port: 0 }));
  });

  after(() => {
    folded.close();
    catalogue.cleanup();
  });

  it('identifies a formula by its path, however deep it is', async () => {
    const body = await bodyOf(fetch(`${foldedBase}/`));
    assert.deepEqual(body.formulas.map((f: { id: string }) => f.id), ['leap-year', 'nested', 'tax/be/vat']);
    assert.deepEqual(body.folders, ['tax']);
  });

  it('indexes a folder', async () => {
    const body = await bodyOf(fetch(`${foldedBase}/tax/`));
    assert.deepEqual(body.formulas.map((f: { id: string }) => f.id), ['tax/be/vat']);
    assert.deepEqual(body.folders, ['tax/be']);
  });

  it('serves a nested formula and calls it', async () => {
    assert.equal((await fetch(`${foldedBase}/tax/be/vat@1.0.0`)).status, 200);
    const response = await fetch(`${foldedBase}/tax/be/vat@1.0.0/call`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ number: '0123456749' }),
    });
    assert.equal(response.status, 200);
    assert.equal((await bodyOf(response)).valid, true);
  });

  it('reads a dotted query parameter as the nested field it names', async () => {
    const response = await fetch(`${foldedBase}/nested@1.0.0/call?customer.name=Alice&customer.age=30`);
    assert.equal(response.status, 200);
    assert.equal(await bodyOf(response), 'Alice (30)');
  });

  it('has no formula where a folder is', async () => {
    assert.equal((await fetch(`${foldedBase}/tax@1.0.0`)).status, 404);
  });
});

// ---------------------------------------------------------------------------
// §10 The caps, which Elo's own sandbox does not bound
// ---------------------------------------------------------------------------

describe('Formula service - the caps', () => {
  const catalogue = temporaryCatalogue();
  let capped: Server;
  let cappedBase: string;
  let tight: Server;
  let tightBase: string;

  before(async () => {
    // A formula that keeps what it computes, rather than summing it away: the
    // outer list holds every inner one, so the heap is what gives out first.
    writeBundle(catalogue.dir, 'grow', {
      'types.elo': 'Input = {\n  xs: [Int]\n}\n\nOutput = Int\n',
      'formula.elo': '# How much memory can a legal formula hold at once?\n#\n'
        + '# A list of lists, each as long as the input: quadratic in space, and\n'
        + '# nothing in the language says it may not be.\n\nlet\n  grow = fn( input ~>\n'
        + '    count(map(input.xs, fn( x ~> map(input.xs, fn( y ~> y + x )) )))\n  )\nin\n  { formula: grow }\n',
      'fields.elo': "{\n  fields: [\n    {\n      path: 'xs',\n      label: 'Numbers',\n      type: 'Int',\n"
        + "      widget: 'number',\n      required: true,\n      repeated: true\n    }\n  ]\n}\n",
      'cases.elo': "{\n  cases: [\n    {\n      name: 'two numbers',\n      input: {xs: [1, 2]},\n"
        + '      expect: 2\n    }\n  ]\n}\n',
      'bundle.json': '{\n  "bundle": 1,\n  "version": "1.0.0"\n}\n',
    });
    writeBundle(catalogue.dir, 'cross', {
      'types.elo': 'Input = {\n  xs: [Int]\n}\n\nOutput = Int\n',
      'formula.elo': '# How expensive can a legal formula be?\n#\n'
        + '# Quadratic in the length of its input, which is all it takes: arithmetic\n'
        + '# alone is a denial-of-service vector.\n\nlet\n  cross = fn( input ~>\n'
        + '    sum(map(input.xs, fn( x ~> sum(map(input.xs, fn( y ~> x * y ))) )))\n  )\nin\n  { formula: cross }\n',
      'fields.elo': "{\n  fields: [\n    {\n      path: 'xs',\n      label: 'Numbers',\n      type: 'Int',\n"
        + "      widget: 'number',\n      required: true,\n      repeated: true\n    }\n  ]\n}\n",
      'cases.elo': "{\n  cases: [\n    {\n      name: 'three numbers',\n      input: {xs: [1, 2, 3]},\n"
        + '      expect: 36\n    }\n  ]\n}\n',
      'bundle.json': '{\n  "bundle": 1,\n  "version": "1.0.0"\n}\n',
    });
    ({ server: capped, url: cappedBase } = await serve({
      catalogue: catalogue.dir,
      port: 0,
      timeoutMs: 100,
    }));
    // Time enough to run out of memory in: the two caps have to be tested one
    // at a time, or whichever is tighter is the only one ever seen.
    ({ server: tight, url: tightBase } = await serve({
      catalogue: catalogue.dir,
      port: 0,
      timeoutMs: 20_000,
      maxHeapMb: 32,
    }));
  });

  after(() => {
    capped.close();
    tight.close();
    catalogue.cleanup();
  });

  it('answers a cheap call', async () => {
    const response = await fetch(`${cappedBase}/cross@1.0.0/call`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ xs: [1, 2, 3] }),
    });
    assert.equal(await bodyOf(response), 36);
  });

  it('kills a call that spends more time than it may, and says which cap', async () => {
    const xs = Array.from({ length: 4000 }, (_, i) => i + 1);
    const response = await fetch(`${cappedBase}/cross@1.0.0/call`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ xs }),
    });
    assert.equal(response.status, 503);
    assert.ok(response.headers.get('retry-after'), 'no Retry-After');
    assert.match((await bodyOf(response)).message, /time/);
  });

  it('stops a call that holds more memory than it may', async () => {
    const xs = Array.from({ length: 4000 }, (_, i) => i + 1);
    const response = await fetch(`${tightBase}/grow@1.0.0/call`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ xs }),
    });
    assert.equal(response.status, 503, 'sixteen million numbers fit in a 32MB heap?');
    assert.equal((await bodyOf(response)).cap, 'memory');
  });

  it('is still serving afterwards, so one caller cannot take the service down', async () => {
    const response = await fetch(`${cappedBase}/cross@1.0.0/call`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ xs: [2, 3] }),
    });
    assert.equal(await bodyOf(response), 25);
  });
});

// ---------------------------------------------------------------------------
// §11 It refuses to start on an invalid bundle
// ---------------------------------------------------------------------------

describe('Formula service - refusing to start', () => {
  it('refuses a bundle whose form disagrees with its type', async () => {
    const catalogue = temporaryCatalogue();
    try {
      const dir = copyBundle(catalogue.dir, 'leap-year', 'leap-year');
      const fields = join(dir, 'fields.elo');
      writeFileSync(fields, readFileSync(fields, 'utf-8').replace("type: 'Int'", "type: 'String'"));
      await assert.rejects(
        serve({ catalogue: catalogue.dir, port: 0 }),
        /leap-year: fields\.elo says type/
      );
    } finally {
      catalogue.cleanup();
    }
  });

  it('refuses a bundle whose cases do not pass', async () => {
    const catalogue = temporaryCatalogue();
    try {
      const dir = copyBundle(catalogue.dir, 'leap-year', 'leap-year');
      const cases = join(dir, 'cases.elo');
      writeFileSync(cases, readFileSync(cases, 'utf-8').replace('expect: true', 'expect: false'));
      await assert.rejects(
        serve({ catalogue: catalogue.dir, port: 0 }),
        /leap-year: case 'divisible by 4' answers/
      );
    } finally {
      catalogue.cleanup();
    }
  });
});
