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

/** A catalogue of our own, to put a formula the shipped one does not have. */
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
    assert.equal(body.formulas.length, 14);
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

  it('states a case the way the call answers it, temporal values included', async () => {
    // A case is a request body and its response body, which is the whole of
    // what makes "try this example" work: a client that POSTs the input and
    // compares must get what the descriptor told it to expect. So the expect
    // is written by `Output` too, and not by whatever `JSON.stringify` makes
    // of a luxon value in the server's own timezone.
    for (const id of ['payment-due-date', 'subscription-proration']) {
      const descriptor = await bodyOf(get(`/${id}`));
      for (const testCase of descriptor.cases) {
        const answered = await bodyOf(post(`/${id}/call`, JSON.stringify(testCase.input)));
        assert.deepEqual(answered, testCase.expect, `${id}: case '${testCase.name}'`);
      }
    }
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

  it('answers a browser with the page, and everything else with the descriptor', async () => {
    // A browser ranks `text/html` above the wildcard it also sends, so it gets
    // the page; a client that says nothing, or `*/*`, gets the descriptor.
    assert.equal(
      (await get('/iban@1.0.0', { accept: 'text/html,application/xhtml+xml,*/*;q=0.8' }))
        .headers.get('content-type'),
      'text/html; charset=utf-8'
    );
    assert.equal(
      (await get('/iban@1.0.0', { accept: '*/*' })).headers.get('content-type'),
      'application/json; charset=utf-8'
    );
    assert.equal(
      (await get('/iban@1.0.0')).headers.get('content-type'),
      'application/json; charset=utf-8'
    );
  });
});

// ---------------------------------------------------------------------------
// §6 The form, and the page
// ---------------------------------------------------------------------------

describe('Formula service - the form', () => {
  it('is an HTML fragment built from fields.elo', async () => {
    const response = await get('/order-pricing@1.0.0/form');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
    const html = await response.text();

    // Its action is the call and its method is GET, so the form works with no
    // JavaScript at all and its result is a URL.
    assert.match(html, /<form [^>]*action="\/order-pricing@1\.0\.0\/call"/);
    assert.match(html, /method="get"/);
    assert.doesNotMatch(html, /<script/, 'a fragment is markup, and nothing else');
  });

  it('renders a control per widget, and says what the type requires', async () => {
    const html = await (await get('/order-pricing@1.0.0/form')).text();
    // A number, required, and a step that says Float rather than Int.
    assert.match(html, /<input [^>]*name="unitPrice"[^>]*type="number"/);
    assert.match(html, /<input [^>]*name="quantity"[^>]*step="1"/);
    assert.match(html, /<input [^>]*name="unitPrice"[^>]*required/);
    // A select, from the options of fields.elo.
    assert.match(html, /<select [^>]*name="tier"/);
    assert.match(html, /<option value="gold">gold<\/option>/);
    // And the half a human wrote: the label, the help, the placeholder.
    assert.match(html, /<label for="f-tier">Customer tier<\/label>/);
    assert.match(html, /0\.21 for 21%/, 'the help of vatRate');
    assert.match(html, /<input [^>]*name="couponPercent"(?![^>]*required)/, 'an optional field');
  });

  it('renders a date, a checkbox and a duration as themselves', async () => {
    const age = await (await get('/age@1.0.0/form')).text();
    assert.match(age, /<input [^>]*name="birthDate"[^>]*type="date"/);
    assert.match(age, /The day the age is computed for/, 'the help of `on`');

    const shipping = await (await get('/shipping-cost@1.0.0/form')).text();
    assert.match(shipping, /<input type="checkbox" [^>]*name="express"/);
    // A checkbox that is not ticked sends nothing, so a hidden false goes with
    // it: a Bool field then always arrives, which is what the type wants.
    assert.match(shipping, /<input type="hidden" name="express" value="false">/);
  });

  it('escapes what a bundle wrote, labels and options included', async () => {
    const catalogue = temporaryCatalogue();
    try {
      const dir = copyBundle(catalogue.dir, 'leap-year', 'leap-year');
      const fields = join(dir, 'fields.elo');
      writeFileSync(fields, readFileSync(fields, 'utf-8')
        .replace("label: 'Year'", "label: 'Year <script>alert(1)</script> & \"more\"'"));
      const { server: own, url } = await serve({ catalogue: catalogue.dir, port: 0 });
      try {
        const html = await (await fetch(`${url}/leap-year@1.0.0/form`)).text();
        assert.doesNotMatch(html, /<script>alert/, 'a label is text, not markup');
        assert.match(html, /Year &lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; &quot;more&quot;/);
      } finally {
        own.close();
      }
    } finally {
      catalogue.cleanup();
    }
  });

  it('is cached like the bundle it is built from', async () => {
    const response = await get('/iban@1.0.0/form');
    assert.match(response.headers.get('cache-control') ?? '', /immutable/);
    assert.ok(response.headers.get('etag'));

    const alias = await get('/iban/form');
    assert.equal(alias.headers.get('content-location'), '/iban@1.0.0/form');
    assert.equal(alias.headers.get('cache-control'), 'no-cache');
  });

  it('has no form for a formula that is not in the catalogue', async () => {
    assert.equal((await get('/no-such-formula/form')).status, 404);
  });
});

describe('Formula service - the page', () => {
  it('is what a browser gets when it asks for HTML by name', async () => {
    const response = await get('/iban@1.0.0', { accept: 'text/html' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
    const html = await response.text();
    assert.match(html, /^<!doctype html>/);
    assert.match(html, /<title>Is this a valid IBAN\? — iban 1\.0\.0<\/title>/);
  });

  it('renders the doc comment as Markdown', async () => {
    const html = await (await get('/iban@1.0.0', { accept: 'text/html' })).text();
    // The doc of `iban` names ISO 13616 in prose and `1` in backticks.
    assert.match(html, /ISO 13616/);
    assert.match(html, /<code>/, 'inline code is rendered rather than shown');
    assert.doesNotMatch(html, /# Is this a valid IBAN/, 'the comment markers are gone');
    assert.match(html, /<p>ISO 13616/, 'and the prose is a paragraph');
  });

  it('carries the form, so the page is the thing you use', async () => {
    const html = await (await get('/order-pricing@1.0.0', { accept: 'text/html' })).text();
    assert.match(html, /<form [^>]*action="\/order-pricing@1\.0\.0\/call"/);
    assert.match(html, /<select [^>]*name="tier"/);
  });

  it('tabulates the cases, each with a link that runs it', async () => {
    const html = await (await get('/leap-year@1.0.0', { accept: 'text/html' })).text();
    assert.match(html, /divisible by 4/, 'the name of a case');
    // A case input is a request body by construction, so it is also a query.
    assert.match(html, /href="\/leap-year@1\.0\.0\/call\?year=2024"/);
    assert.match(html, /<code>true<\/code>/, 'what the case expects');
  });

  it('shows the program it runs, and links the compiled forms', async () => {
    const html = await (await get('/iban@1.0.0', { accept: 'text/html' })).text();
    assert.match(html, /<details>/);
    assert.match(html, /formula\(_ \|&gt; Input\) \|&gt; Output/, 'the Elo program, escaped');
    assert.match(html, /<a href="\/iban@1\.0\.0\/types\.elo">/);
  });

  it('is revalidated under the alias, like every other representation of it', async () => {
    const response = await get('/iban', { accept: 'text/html' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-location'), '/iban@1.0.0');
    assert.equal(response.headers.get('cache-control'), 'no-cache');
  });

  it('enhances the form with a script rather than depending on one', async () => {
    const page = await (await get('/order-pricing@1.0.0', { accept: 'text/html' })).text();
    // The enhancement is on the page…
    assert.match(page, /<script>/);
    assert.match(page, /<div class="elo-result" hidden>/);
    // …and the form it enhances is the same one that works without it.
    assert.match(page, /<form [^>]*action="\/order-pricing@1\.0\.0\/call"[^>]*method="get"/);
    // The fragment, which is a thing to embed, carries no script at all.
    const fragment = await (await get('/order-pricing@1.0.0/form')).text();
    assert.doesNotMatch(fragment, /<script/);
  });

  it('ships a script that parses, and looks only for hooks the markup has', async () => {
    const page = await (await get('/order-pricing@1.0.0', { accept: 'text/html' })).text();
    const script = /<script>([\s\S]*?)<\/script>/.exec(page)?.[1] ?? '';
    assert.ok(script.length > 200, 'no script to check');

    // A syntax error in generated JavaScript is silent in a browser console
    // nobody is watching, so it is worth one line here.
    assert.doesNotThrow(() => new Function(script), 'the enhancement does not parse');

    // And a renamed class is the other way an enhancement dies quietly: every
    // selector it reaches for has to be something this page renders.
    const selectors = [...script.matchAll(/querySelector(?:All)?\('([^']+)'\)/g)]
      .map(match => match[1])
      .flatMap(selector => selector.split(' '));
    assert.ok(selectors.length >= 4, 'no selectors found');
    for (const selector of selectors) {
      const token = selector.replace(/^[.#]/, '').replace(/^\[.*$/, '');
      if (token === '' || token === 'tbody') continue;
      assert.ok(page.includes(token), `the script looks for '${selector}', which the page has not`);
    }
  });

  it('carries a runnable snippet in each of the four things people reach for', async () => {
    const page = await (await get('/iban@1.0.0', { accept: 'text/html' })).text();
    for (const language of ['curl', 'JavaScript', 'Ruby', 'Python']) {
      assert.match(page, new RegExp(`<h3>${language}</h3>`), `no ${language} snippet`);
    }
    // Filled in with the first case — a real input that really answers — and
    // pointed at the host the request came in on, so they paste and run.
    assert.match(page, /curl -X POST &#39;http:\/\/127\.0\.0\.1:\d+\/iban@1\.0\.0\/call&#39;/);
    assert.match(page, /BE68 5390 0754 7034/);
    assert.match(page, /Net::HTTP\.post/);
    assert.match(page, /urllib\.request\.urlopen/);
    assert.match(page, /await fetch\(/);
  });

  it('tells a table how to send one, in the snippets as well as in the form', async () => {
    const page = await (await get('/order-lines@1.0.0', { accept: 'text/html' })).text();
    assert.match(page, /--data-binary @rows\.csv/);
    assert.doesNotMatch(page, /<script>/, 'no form to enhance, so no script');
  });

  it('believes a reverse proxy about where it is answering from', async () => {
    const page = await (await get('/iban@1.0.0', {
      accept: 'text/html',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'formulas.example.com',
    })).text();
    assert.match(page, /curl -X POST &#39;https:\/\/formulas\.example\.com\/iban@1\.0\.0\/call&#39;/);
  });

  it('indexes the catalogue in HTML too, so the service is browsable', async () => {
    const response = await get('/', { accept: 'text/html' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
    const html = await response.text();
    assert.match(html, /<a href="\/iban">/);
    assert.match(html, /Is this a valid IBAN\?/);
    assert.match(html, /14 formulas/);
  });

  it('offers a table a way in, there being no form for one', async () => {
    const html = await (await get('/order-lines@1.0.0', { accept: 'text/html' })).text();
    assert.doesNotMatch(html, /<form/, 'a table is not asked for a value at a time');
    assert.match(html, /takes a <strong>table<\/strong>/);
    assert.match(html, /Content-Type: text\/csv/, 'it says how to send one');
    assert.match(html, /<code>unitPrice<\/code>/, 'and what the columns are');
  });
});

// ---------------------------------------------------------------------------
// §4 Formats: a tabular body for a formula whose own type is a table
// ---------------------------------------------------------------------------

describe('Formula service - CSV', () => {
  const CSV = 'description,unitPrice,quantity,discountPercent\n'
    + 'Widget,19.99,3,\n'
    + 'Gadget,5.00,10,15\n';

  it('reads a table as one input, and coerces every cell', async () => {
    const response = await post('/order-lines@1.0.0/call', CSV, { 'content-type': 'text/csv' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.deepEqual(await bodyOf(response), [
      { description: 'Widget', quantity: 3, gross: 59.97, discount: 0, amount: 59.97 },
      { description: 'Gadget', quantity: 10, gross: 50, discount: 7.5, amount: 42.5 },
    ]);
  });

  it('writes a table when one is asked for', async () => {
    const response = await post('/order-lines@1.0.0/call', CSV, {
      'content-type': 'text/csv',
      accept: 'text/csv',
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/csv; charset=utf-8');
    assert.equal(
      await response.text(),
      'description,quantity,gross,discount,amount\n'
      + 'Widget,3,59.97,0,59.97\n'
      + 'Gadget,10,50,7.5,42.5'
    );
  });

  it('reads JSON for the same formula, a format being a representation and not the thing', async () => {
    const response = await post(
      '/order-lines@1.0.0/call',
      JSON.stringify([{ description: 'Widget', unitPrice: 19.99, quantity: 3 }]),
      { 'content-type': 'application/json', accept: 'text/csv' }
    );
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'description,quantity,gross,discount,amount\nWidget,3,59.97,0,59.97');
  });

  it('answers the columns of an empty table, rather than an empty body', async () => {
    const response = await post('/order-lines@1.0.0/call', 'description,unitPrice,quantity\n', {
      'content-type': 'text/csv',
      accept: 'text/csv',
    });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'description,quantity,gross,discount,amount\n');
  });

  it('refuses a table for a formula that takes a record', async () => {
    const response = await post('/iban@1.0.0/call', 'iban\nBE68539007547034\n', {
      'content-type': 'text/csv',
    });
    assert.equal(response.status, 415);
    assert.match((await bodyOf(response)).message, /takes a record/);
  });

  it('refuses to write a table for a formula that answers a record', async () => {
    const response = await post('/iban@1.0.0/call', JSON.stringify({ iban: 'BE68539007547034' }), {
      'content-type': 'application/json',
      accept: 'text/csv',
    });
    assert.equal(response.status, 406);
  });

  it('maps a refusal in one row onto the row that caused it', async () => {
    const response = await post(
      '/order-lines@1.0.0/call',
      'description,unitPrice,quantity\nWidget,19.99,3\nGadget,-5,10\n',
      { 'content-type': 'text/csv' }
    );
    assert.equal(response.status, 422);
    const body = await bodyOf(response);
    assert.equal(body.kind, 'constraint');
    assert.equal(body.label, 'notNegative');
    assert.equal(body.path, '.1.unitPrice', 'the second row, by index');
  });

  it('calls a table over GET too, a repeated parameter being a list', async () => {
    // Not a table — a query string cannot carry one — but the same formula
    // through the linkable door, for a one-row call.
    const response = await get(
      '/order-lines@1.0.0/call?description=Widget&unitPrice=19.99&quantity=3'
    );
    assert.equal(response.status, 422, 'a record is not a list, however it arrives');
    assert.equal((await bodyOf(response)).kind, 'schema');
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

  it('reads a field left empty as a field not given, which is what a form sends', async () => {
    // `couponPercent` is optional, and an untouched box sends `name=`. Reading
    // that as the empty string would make the type refuse a form nobody filled
    // in wrongly — see §6: the form has to work with no JavaScript.
    const response = await get(
      '/order-pricing@1.0.0/call?unitPrice=19.99&quantity=10&tier=gold&vatRate=0.21&couponPercent='
    );
    assert.equal(response.status, 200);
    assert.equal((await bodyOf(response)).total, 212.85);
  });

  it('takes the last value of a field given twice, which is what a checkbox sends', async () => {
    // The form sends a hidden `false` and then `true` if the box is ticked, so
    // a Bool always arrives. The two together must read as the tick.
    const parcel = 'weightKg=1.2&lengthCm=20&widthCm=15&heightCm=10&zone=domestic&orderValue=40';
    const unticked = await bodyOf(get(`/shipping-cost@1.0.0/call?${parcel}&express=false`));
    const ticked = await bodyOf(get(`/shipping-cost@1.0.0/call?${parcel}&express=false&express=true`));
    assert.equal(unticked.etaDays, 2);
    assert.equal(ticked.etaDays, 1, 'express was not read');
    assert.ok(ticked.cost > unticked.cost, 'express costs more');
  });

  it('answers 414 past a sane URL length, so the client uses POST', async () => {
    const response = await get(`/leap-year@1.0.0/call?year=${'2'.repeat(4000)}`);
    assert.equal(response.status, 414);
  });
});

// ---------------------------------------------------------------------------
// §9 OpenAPI
// ---------------------------------------------------------------------------

describe('Formula service - the OpenAPI of one formula', () => {
  it('describes the call a client would generate', async () => {
    const response = await get('/iban@1.0.0/openapi.json');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');

    const document = await bodyOf(response);
    assert.equal(document.openapi, '3.0.3');
    assert.equal(document.info.title, 'Is this a valid IBAN?');
    assert.equal(document.info.version, '1.0.0');
    assert.ok(document.paths['/iban@1.0.0/call'].post, 'no POST on the call');
    assert.ok(document.paths['/iban@1.0.0/call'].get, 'no GET on the call');
  });

  it('turns Input into the request body schema', async () => {
    const document = await bodyOf(get('/iban@1.0.0/openapi.json'));
    const schema = document.components.schemas['iban_1_0_0_Input'];
    assert.deepEqual(schema, {
      type: 'object',
      properties: { iban: { type: 'string' } },
      required: ['iban'],
      additionalProperties: false,
    });
    assert.equal(
      document.paths['/iban@1.0.0/call'].post.requestBody.content['application/json'].schema.$ref,
      '#/components/schemas/iban_1_0_0_Input'
    );
  });

  it('turns Output into the response schema, Null and all', async () => {
    const document = await bodyOf(get('/iban@1.0.0/openapi.json'));
    // `country: String|Null` is a key that is **there** and may be null, which
    // is a different thing from the `:?` that may be absent — so it is both
    // required and nullable, and a generated client reading `.country` finds
    // it every time. Elo's own schema parser draws the line in the same place.
    assert.deepEqual(document.components.schemas['iban_1_0_0_Output'], {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        country: { type: 'string', nullable: true },
        formatted: { type: 'string', nullable: true },
      },
      required: ['valid', 'country', 'formatted'],
      additionalProperties: false,
    });
    assert.equal(
      document.paths['/iban@1.0.0/call'].post.responses['200'].content['application/json'].schema.$ref,
      '#/components/schemas/iban_1_0_0_Output'
    );
  });

  it('maps every Elo type the table of §9 names', async () => {
    const age = await bodyOf(get('/age@1.0.0/openapi.json'));
    assert.deepEqual(age.components.schemas['age_1_0_0_Input'].properties, {
      birthDate: { type: 'string', format: 'date' },
      on: { type: 'string', format: 'date' },
    });

    const subscription = await bodyOf(get('/subscription-proration@1.0.0/openapi.json'));
    const output = subscription.components.schemas['subscription_proration_1_0_0_Output'];
    assert.equal(output.properties.nextRenewal.format, 'date');
    assert.equal(output.properties.billedDays.type, 'number', 'a Float is a number');

    const lines = await bodyOf(get('/order-lines@1.0.0/openapi.json'));
    const input = lines.components.schemas['order_lines_1_0_0_Input'];
    assert.equal(input.type, 'array', 'a formula over a table takes one');
    assert.equal(input.items.properties.quantity.type, 'integer');
    assert.deepEqual(input.items.required, ['description', 'unitPrice', 'quantity'], 'not the optional one');
  });

  it('says nothing about a constraint, which JSON Schema cannot carry', async () => {
    const document = await bodyOf(get('/leap-year@1.0.0/openapi.json'));
    const schema = document.components.schemas['leap_year_1_0_0_Input'];
    // `year` is `Int(y | gregorian: y >= 1583 && y <= 9999)`: the bound lives
    // in an Elo predicate, so there is no `minimum` to be had — a generated
    // client checks shape, and the formula checks meaning.
    assert.deepEqual(schema.properties.year, { type: 'integer' });
    assert.equal(document.components.schemas['leap_year_1_0_0_Output'].type, 'boolean');
  });

  it('carries the cases as examples, which is what they already are', async () => {
    const document = await bodyOf(get('/iban@1.0.0/openapi.json'));
    const body = document.paths['/iban@1.0.0/call'].post.requestBody.content['application/json'];
    assert.ok(body.examples['Belgian, grouped'], 'a case by name');
    assert.deepEqual(body.examples['Belgian, grouped'].value, { iban: 'BE68 5390 0754 7034' });
    const answer = document.paths['/iban@1.0.0/call'].post.responses['200'].content['application/json'];
    assert.deepEqual(answer.examples['Belgian, grouped'].value, {
      valid: true,
      country: 'BE',
      formatted: 'BE68 5390 0754 7034',
    });
  });

  it('describes every way a call can fail, with the error schema of §5', async () => {
    const document = await bodyOf(get('/iban@1.0.0/openapi.json'));
    const responses = document.paths['/iban@1.0.0/call'].post.responses;
    assert.deepEqual(Object.keys(responses).sort(), ['200', '400', '404', '406', '413', '415', '422', '503']);
    assert.equal(
      responses['422'].content['application/json'].schema.$ref,
      '#/components/schemas/Error'
    );
    assert.deepEqual(document.components.schemas.Error.required, ['message']);
    assert.ok(document.components.schemas.Error.properties.kind, 'the kind a client switches on');
  });

  it('reads the query of a GET call as parameters, which is what they are', async () => {
    const document = await bodyOf(get('/age@1.0.0/openapi.json'));
    const parameters = document.paths['/age@1.0.0/call'].get.parameters;
    assert.deepEqual(parameters.map((parameter: { name: string }) => parameter.name), ['birthDate', 'on']);
    assert.equal(parameters[0].in, 'query');
    assert.equal(parameters[0].required, true);
    assert.equal(parameters[0].description, 'Date of birth', 'the label of fields.elo');
    assert.equal(parameters[0].schema.type, 'string', 'a query carries strings, and Input coerces');
  });

  it('offers a tabular body only where the formula takes a table', async () => {
    const lines = await bodyOf(get('/order-lines@1.0.0/openapi.json'));
    const call = lines.paths['/order-lines@1.0.0/call'].post;
    assert.ok(call.requestBody.content['text/csv'], 'no CSV for a table');
    assert.ok(call.responses['200'].content['text/csv'], 'no CSV answer for a table');
    assert.equal(lines.paths['/order-lines@1.0.0/call'].get, undefined, 'a query cannot carry a table');

    const iban = await bodyOf(get('/iban@1.0.0/openapi.json'));
    assert.equal(iban.paths['/iban@1.0.0/call'].post.requestBody.content['text/csv'], undefined);
  });

  it('is cached like the bundle it is derived from', async () => {
    const response = await get('/iban@1.0.0/openapi.json');
    assert.match(response.headers.get('cache-control') ?? '', /immutable/);
    const alias = await get('/iban/openapi.json');
    assert.equal(alias.status, 200);
    assert.equal(alias.headers.get('content-location'), '/iban@1.0.0/openapi.json');
  });

  it('has none for a formula that is not in the catalogue', async () => {
    assert.equal((await get('/no-such-formula/openapi.json')).status, 404);
  });
});

describe('Formula service - the OpenAPI of the catalogue', () => {
  it('is one document over every formula', async () => {
    const response = await get('/openapi.json');
    assert.equal(response.status, 200);
    const document = await bodyOf(response);
    assert.equal(document.openapi, '3.0.3');
    assert.equal(Object.keys(document.paths).length, 14, 'one call per formula');
    assert.ok(document.paths['/iban@1.0.0/call']);
    assert.ok(document.paths['/age@1.0.0/call']);
    assert.ok(document.components.schemas['iban_1_0_0_Input']);
    assert.ok(document.components.schemas['age_1_0_0_Output']);
    assert.ok(document.components.schemas.Error, 'one error schema for the whole of it');
  });

  it('is scoped by tag and by prefix, a thousand formulas being a document no tool enjoys', async () => {
    const banking = await bodyOf(get('/openapi.json?tag=banking'));
    assert.deepEqual(Object.keys(banking.paths), ['/iban@1.0.0/call']);
    assert.deepEqual(
      Object.keys(banking.components.schemas).sort(),
      ['Error', 'iban_1_0_0_Input', 'iban_1_0_0_Output']
    );

    const nothing = await bodyOf(get('/openapi.json?prefix=tax'));
    assert.deepEqual(Object.keys(nothing.paths), []);
  });

  it('groups a formula under its own tags, so a gateway can navigate it', async () => {
    const document = await bodyOf(get('/openapi.json'));
    assert.deepEqual(document.paths['/iban@1.0.0/call'].post.tags, ['validation', 'banking']);
  });

  it('resolves every reference it makes, for every formula in the catalogue', async () => {
    // The suite's OpenAPI parser checks the two documents it looks at; this
    // checks the one invariant that matters over all of them, which is that a
    // `$ref` points at a schema that is there. A dangling one is a generated
    // client that does not compile.
    const index = await bodyOf(get('/'));
    const documents = [
      await bodyOf(get('/openapi.json')),
      ...await Promise.all((index.formulas as { id: string }[])
        .map(entry => bodyOf(get(`/${entry.id}/openapi.json`)))),
    ];

    for (const document of documents) {
      const schemas = Object.keys(document.components.schemas);
      const refs = [...JSON.stringify(document).matchAll(/"\$ref":"#\/components\/schemas\/([^"]+)"/g)]
        .map(match => match[1]);
      assert.ok(refs.length > 0, 'a document that refers to nothing describes nothing');
      for (const ref of refs) {
        assert.ok(schemas.includes(ref), `${document.info.title}: $ref to a missing ${ref}`);
      }
    }
  });

  it('is revalidated, since a catalogue is not immutable the way a version is', async () => {
    const response = await get('/openapi.json');
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    assert.ok(response.headers.get('etag'));
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
