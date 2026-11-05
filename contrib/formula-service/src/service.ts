/**
 * The HTTP contract over a catalogue of formula bundles.
 *
 * The URL space mirrors the catalogue's directory space, and that is
 * load-bearing rather than cosmetic: the program the service runs is
 *
 *     import { Input, Output } from './types'
 *     import { formula } from './formula'
 *
 *     formula(_ |> Input) |> Output
 *
 * and `./types` resolves, relative to `/foo/bar/age/`, to a URL this API
 * serves. A client can fetch the program and resolve its imports over HTTP,
 * knowing nothing about the bundle layout beyond what the source says.
 *
 *     GET  /                       the index, and /foo/bar/ for a folder of it
 *     GET  /{id}                   the latest version, named in Content-Location
 *     GET  /{id}@{version}         that version: descriptor, or Elo, or compiled
 *     GET  /{id}@{version}/*.elo   the files of the bundle, verbatim
 *     POST /{id}@{version}/call    one input, one answer
 *     GET  /{id}@{version}/call    the same, linkable and therefore cacheable
 *
 * What is deliberately not here: the HTML page and the form, the formats past
 * JSON, and `openapi.json` — phases 4 to 6 of the plan. Each answers 404 or
 * 406 rather than something approximate.
 *
 * On the trust boundary: bundles are trusted content, compiled at boot; the
 * caller's **input** is the only untrusted thing, and it is plain data handed
 * to a compiled expression that cannot do I/O, cannot `eval` and cannot reach
 * a host global. There is no `POST /eval`, and adding one would replace that
 * sentence with a different threat model. What the capability sandbox does not
 * bound is time and memory, which is `./sandbox`.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadServedCatalogue, type ServedCatalogue, type ServedFormula } from './catalogue';
import { cataloguePage, formFragment, formulaPage } from './html';
import { runCall } from './sandbox';
import type { FieldDescriptor } from './bundle';

export interface ServiceOptions {
  /** The catalogue directory: every bundle under it is served. */
  catalogue: string;
  /** Wall clock for one call. */
  timeoutMs?: number;
  /** Heap ceiling for one call, in megabytes. */
  maxHeapMb?: number;
  /** Past this, a request body is `413`. */
  maxBodyBytes?: number;
  /** Past this, a request target is `414` and the client is to use POST. */
  maxUrlLength?: number;
}

export interface Service {
  catalogue: ServedCatalogue;
  handler: (request: IncomingMessage, response: ServerResponse) => void;
}

const DEFAULTS = {
  timeoutMs: 1000,
  maxHeapMb: 64,
  maxBodyBytes: 64 * 1024,
  maxUrlLength: 2048,
};

/**
 * The representations of §3 and §6, by `Accept`.
 *
 * The order is the order of preference, so a client that says `*​/*` — a
 * browser asking for anything, a `curl` saying nothing — gets the descriptor.
 * HTML is answered when it is asked for by name, which is what a browser
 * following a link does.
 */
const REPRESENTATIONS: Record<string, { key: string; type: string }> = {
  'application/json': { key: 'descriptor', type: 'application/json' },
  'text/html': { key: 'page', type: 'text/html' },
  'application/x-elo': { key: 'elo', type: 'application/x-elo' },
  'application/javascript': { key: 'js', type: 'application/javascript' },
  'text/x-ruby': { key: 'ruby', type: 'text/x-ruby' },
  'text/x-python': { key: 'python', type: 'text/x-python' },
};

/** The sub-resources of a formula. Anything else after the id is not one. */
const SUB_RESOURCES = new Set([
  'call', 'form', 'openapi.json', 'types.elo', 'formula.elo', 'fields.elo', 'cases.elo', 'bundle.json',
]);

export function createService(options: ServiceOptions): Service {
  const limits = { ...DEFAULTS, ...options };
  const catalogue = loadServedCatalogue(options.catalogue);

  const handler = (request: IncomingMessage, response: ServerResponse): void => {
    void dispatch(request, response).catch(error => {
      // A failure here is the service's own, never the caller's input: an input
      // that Elo refuses is a 422 decided below.
      send(request, response, 500, { message: `the service failed: ${(error as Error).message}` });
    });
  };

  async function dispatch(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const target = request.url ?? '/';
    if (target.length > limits.maxUrlLength) {
      return send(request, response, 414, {
        message: `the request target is longer than ${limits.maxUrlLength} characters; POST the input instead`,
      });
    }

    const url = new URL(target, 'http://formulas.invalid');
    const pathname = decodeURIComponent(url.pathname);

    // A trailing slash is a folder of the catalogue, and `/` is its root.
    if (pathname.endsWith('/')) {
      return index(request, response, pathname.slice(1, -1), url.searchParams);
    }

    const segments = pathname.slice(1).split('/');
    const last = segments[segments.length - 1];
    const sub = SUB_RESOURCES.has(last) ? segments.pop() : undefined;
    const reference = segments.join('/');

    const found = resolveReference(catalogue, reference);
    if (!found) return notFound(request, response);
    const { formula, pinned } = found;

    switch (sub) {
      case undefined:
        return describe(request, response, formula, pinned);
      case 'call':
        return call(request, response, formula, pinned, url);
      case 'form':
        return form(request, response, formula, pinned);
      case 'types.elo':
      case 'formula.elo':
      case 'fields.elo':
      case 'cases.elo':
      case 'bundle.json':
        return file(request, response, formula, pinned, sub);
      default:
        // `openapi.json`: named in the descriptor's links, and not served yet.
        // A 404 is the honest answer; see phase 6.
        return notFound(request, response);
    }
  }

  // -------------------------------------------------------------------------
  // §7 The index
  // -------------------------------------------------------------------------

  function index(
    request: IncomingMessage,
    response: ServerResponse,
    prefix: string,
    query: URLSearchParams
  ): void {
    if (!isReadMethod(request)) return methodNotAllowed(request, response, 'GET, HEAD');

    const under = prefix === ''
      ? catalogue.formulas
      : catalogue.formulas.filter(formula => formula.id.startsWith(`${prefix}/`));
    if (prefix !== '' && under.length === 0) return notFound(request, response);

    const tag = query.get('tag');
    const term = query.get('q')?.toLowerCase();
    const matching = under.filter(formula =>
      (!tag || formula.descriptor.tags.includes(tag))
      && (!term
        || formula.descriptor.title.toLowerCase().includes(term)
        || formula.descriptor.doc.toLowerCase().includes(term)));

    const perPage = positive(query.get('per_page'), matching.length);
    const page = positive(query.get('page'), 1);
    const shown = matching.slice((page - 1) * perPage, page * perPage);

    // A folder is a direct child that is not a formula — so an index is one
    // page of formulas and the folders it is worth descending into.
    const folders = [...new Set(
      under
        .map(formula => formula.id.slice(prefix === '' ? 0 : prefix.length + 1))
        .filter(rest => rest.includes('/'))
        .map(rest => (prefix === '' ? '' : `${prefix}/`) + rest.split('/')[0])
    )].sort();

    // `no-cache` rather than `no-store`: the index names the latest version of
    // every formula, and which version that is may change.
    header(response, 'Cache-Control', 'no-cache');
    header(response, 'ETag', catalogue.etag);
    if (noneMatch(request, catalogue.etag)) return notModified(response);

    const chosen = negotiate(request, ['application/json', 'text/html']);
    if (!chosen) return notAcceptable(request, response, ['application/json', 'text/html']);
    const entries = shown.map(formula => formula.entry);
    if (chosen === 'text/html') {
      return sendText(request, response, 200, 'text/html', cataloguePage(entries, folders, prefix));
    }
    send(request, response, 200, { formulas: entries, folders });
  }

  // -------------------------------------------------------------------------
  // §6 The form
  // -------------------------------------------------------------------------

  /**
   * The `<form>` of a formula, as an HTML fragment — a thing to embed, which
   * is why it is its own resource and not only part of the page.
   *
   * It is built from `fields.elo`, so a host that wants its own page can read
   * that file instead and render it however it likes; this is the reference
   * rendering, and the one the page of §3 uses.
   */
  function form(
    request: IncomingMessage,
    response: ServerResponse,
    formula: ServedFormula,
    pinned: boolean
  ): void {
    if (!isReadMethod(request)) return methodNotAllowed(request, response, 'GET, HEAD');
    if (!negotiate(request, ['text/html'])) return notAcceptable(request, response, ['text/html']);
    cacheable(request, response, formula, pinned, pinned ? undefined : `${formula.descriptor.links.self}/form`);
    if (noneMatch(request, formula.etag)) return notModified(response);
    sendText(request, response, 200, 'text/html', `${formFragment(formula)}\n`);
  }

  // -------------------------------------------------------------------------
  // §3 Describing a formula
  // -------------------------------------------------------------------------

  function describe(
    request: IncomingMessage,
    response: ServerResponse,
    formula: ServedFormula,
    pinned: boolean
  ): void {
    if (!isReadMethod(request)) return methodNotAllowed(request, response, 'GET, HEAD');

    // Only what this formula has: a target it does not compile to is not
    // offered, rather than offered and then refused.
    const offers = Object.keys(REPRESENTATIONS).filter(media => {
      const { key } = REPRESENTATIONS[media];
      return key === 'descriptor' || key === 'page' || formula.representations[key] !== undefined;
    });
    const chosen = negotiate(request, offers);
    if (!chosen) return notAcceptable(request, response, offers);
    const { key, type } = REPRESENTATIONS[chosen];

    cacheable(request, response, formula, pinned, pinned ? undefined : formula.descriptor.links.self);
    if (noneMatch(request, formula.etag)) return notModified(response);
    if (key === 'descriptor') return send(request, response, 200, formula.descriptor);
    if (key === 'page') return sendText(request, response, 200, type, formulaPage(formula));
    return sendText(request, response, 200, type, formula.representations[key]);
  }

  // -------------------------------------------------------------------------
  // §1 The files of the bundle
  // -------------------------------------------------------------------------

  function file(
    request: IncomingMessage,
    response: ServerResponse,
    formula: ServedFormula,
    pinned: boolean,
    name: string
  ): void {
    if (!isReadMethod(request)) return methodNotAllowed(request, response, 'GET, HEAD');
    cacheable(request, response, formula, pinned, pinned ? undefined : `${formula.descriptor.links.self}/${name}`);
    if (noneMatch(request, formula.etag)) return notModified(response);
    const type = name.endsWith('.json') ? 'application/json' : 'application/x-elo';
    sendText(request, response, 200, type, formula.files[name]);
  }

  // -------------------------------------------------------------------------
  // §4 Calling it, §5 and what a refusal comes to
  // -------------------------------------------------------------------------

  async function call(
    request: IncomingMessage,
    response: ServerResponse,
    formula: ServedFormula,
    pinned: boolean,
    url: URL
  ): Promise<void> {
    if (request.method !== 'POST' && !isReadMethod(request)) {
      return methodNotAllowed(request, response, 'GET, POST');
    }
    if (!negotiate(request, ['application/json'])) {
      return notAcceptable(request, response, ['application/json']);
    }

    let input: unknown;
    if (request.method === 'POST') {
      // The body is read before anything is decided about it, even when the
      // content type is already wrong: answering while the caller is still
      // sending leaves unread data on the socket, and closing on that is a
      // reset the client sees instead of the status.
      const body = await read(request, limits.maxBodyBytes);
      if (body === undefined) {
        return send(request, response, 413, {
          message: `the request body is longer than ${limits.maxBodyBytes} bytes`,
        });
      }
      const type = (request.headers['content-type'] ?? 'application/json').split(';')[0].trim();
      if (type !== 'application/json' && type !== '') {
        return send(request, response, 415, {
          message: `this call reads application/json, not ${type}`
            + (type === 'text/csv' ? ': a tabular body only means something for a formula whose Input is a list' : ''),
        });
      }
      try {
        input = body.trim() === '' ? null : JSON.parse(body);
      } catch (error) {
        return send(request, response, 400, { message: `the body is not JSON: ${(error as Error).message}` });
      }
    } else {
      input = inputFromQuery(url.searchParams, formula.descriptor.fields);
    }

    // Every answer is `no-store` until a deployment says otherwise. Whether an
    // answer may be cached is a question about the formula's purity, which the
    // language has not finished deciding and this component cannot see; the
    // default goes this way round because the other one means a cache serving
    // last year's answer because nobody thought to forbid it.
    header(response, 'Cache-Control', 'no-store');
    if (!pinned) {
      const query = url.search ?? '';
      header(response, 'Content-Location', `${formula.descriptor.links.call}${query}`);
    }

    const outcome = await runCall(formula.code, input, formula.shape, {
      timeoutMs: limits.timeoutMs,
      maxHeapMb: limits.maxHeapMb,
    });

    if (outcome.ok) {
      return sendText(request, response, 200, 'application/json', outcome.json);
    }
    if ('cap' in outcome) {
      header(response, 'Retry-After', '1');
      return send(request, response, 503, { cap: outcome.cap, message: outcome.message });
    }
    if ('broken' in outcome) {
      return send(request, response, 500, { message: `the service failed to run the call: ${outcome.broken}` });
    }

    const failure = outcome.failure;
    return send(request, response, 422, {
      ...(failure.kind ? { kind: failure.kind } : {}),
      ...(failure.path ? { path: failure.path, field: failure.path.replace(/^\./, '') } : {}),
      ...(failure.label ? { label: failure.label } : {}),
      message: failure.message,
    });
  }

  return { catalogue, handler };
}

// ---------------------------------------------------------------------------
// The URL space
// ---------------------------------------------------------------------------

/**
 * A reference is `foo/bar/age` or `foo/bar/age@1.2.0`: an id, optionally
 * pinned to a version. The unpinned form is an alias for the latest, answered
 * directly rather than redirected — a redirect would cost every client a round
 * trip — with `Content-Location` naming what it resolved to.
 */
export function resolveReference(
  catalogue: ServedCatalogue,
  reference: string
): { formula: ServedFormula; pinned: boolean } | undefined {
  if (reference === '') return undefined;
  const at = reference.lastIndexOf('@');
  const id = at === -1 ? reference : reference.slice(0, at);
  const version = at === -1 ? undefined : reference.slice(at + 1);
  const formula = catalogue.byId.get(id);
  if (!formula) return undefined;
  if (version === undefined) return { formula, pinned: false };
  return formula.version === version ? { formula, pinned: true } : undefined;
}

/**
 * The query string as an input value.
 *
 * A `GET` call reads every parameter as a string and hands it to `Input`,
 * whose coercion is what turns `'1990-03-15'` into a `Date`. A dotted name is
 * the path it names (`customer.name`), and a field the form declares repeated
 * is a list however many times it was given — which is the one thing a query
 * string cannot say for itself, and `fields.elo` can.
 */
export function inputFromQuery(query: URLSearchParams, fields: FieldDescriptor[]): unknown {
  const repeated = new Set(fields.filter(field => field.repeated).map(field => field.path));
  const input: Record<string, unknown> = {};
  for (const path of new Set(query.keys())) {
    // Two rules, and both of them are what an HTML form needs to work with no
    // JavaScript (§6). An **empty** value is a box left alone, so it counts as
    // not given — an optional field then stays optional, where `''` would be a
    // value its type has to refuse. And the **last** value of a field given
    // twice wins, which is what makes a checkbox possible: unticked it sends
    // the hidden `false` alone, ticked it sends `true` after it.
    const values = query.getAll(path).filter(value => value !== '');
    if (values.length === 0) continue;
    const value = repeated.has(path) ? values : values[values.length - 1];
    const keys = path.split('.');
    let holder = input;
    for (const key of keys.slice(0, -1)) {
      if (typeof holder[key] !== 'object' || holder[key] === null) holder[key] = {};
      holder = holder[key] as Record<string, unknown>;
    }
    holder[keys[keys.length - 1]] = value;
  }
  return input;
}

// ---------------------------------------------------------------------------
// Content negotiation, caching, and the shapes of an answer
// ---------------------------------------------------------------------------

/**
 * The best of what we have, by `Accept`.
 *
 * No header, or a wildcard range, means the first thing offered — the
 * descriptor, for a formula. One that asks for something else gets nothing,
 * which the caller turns into a 406: guessing would serve HTML to a client
 * that said it reads none.
 */
export function negotiate(request: IncomingMessage, offers: string[]): string | undefined {
  const accept = request.headers.accept;
  if (!accept || accept.trim() === '') return offers[0];

  const ranked = accept.split(',')
    .map(part => {
      const [media, ...parameters] = part.split(';').map(bit => bit.trim());
      const quality = parameters
        .map(parameter => /^q=([0-9.]+)$/.exec(parameter))
        .find(match => match !== null);
      return { media: media.toLowerCase(), q: quality ? Number(quality[1]) : 1 };
    })
    .filter(entry => entry.q > 0)
    .sort((left, right) => right.q - left.q);

  for (const { media } of ranked) {
    if (media === '*/*') return offers[0];
    const found = offers.find(offer =>
      offer === media || (media.endsWith('/*') && offer.startsWith(media.slice(0, -1))));
    if (found) return found;
  }
  return undefined;
}

/**
 * The caching of a representation, which follows from a version being
 * immutable: a pinned one may be kept forever, an alias has to be revalidated
 * because which version it names may change.
 */
function cacheable(
  request: IncomingMessage,
  response: ServerResponse,
  formula: ServedFormula,
  pinned: boolean,
  contentLocation?: string
): void {
  header(response, 'ETag', formula.etag);
  header(response, 'Cache-Control', pinned ? 'public, max-age=31536000, immutable' : 'no-cache');
  if (contentLocation) header(response, 'Content-Location', contentLocation);
}

function noneMatch(request: IncomingMessage, etag: string): boolean {
  const given = request.headers['if-none-match'];
  if (!given) return false;
  return given.split(',').map(part => part.trim()).some(part => part === etag || part === '*');
}

/**
 * How much of a body we are willing to read, or nothing if it is more.
 *
 * Past the cap nothing is kept, and the rest is drained rather than refused
 * mid-flight: a `413` the caller can read is worth more than a socket reset,
 * and the kept bytes — the thing that costs memory — are capped either way.
 * Past ten times the cap the caller is not making a request in good faith, and
 * the socket goes.
 */
function read(request: IncomingMessage, cap: number): Promise<string | undefined> {
  return new Promise(resolve => {
    const chunks: Buffer[] = [];
    let size = 0;
    let over = false;
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > cap) {
        over = true;
        chunks.length = 0;
      } else {
        chunks.push(chunk);
      }
      if (size > cap * 10) {
        resolve(undefined);
        request.destroy();
      }
    });
    request.on('end', () => resolve(over ? undefined : Buffer.concat(chunks).toString('utf-8')));
    request.on('error', () => resolve(undefined));
  });
}

function isReadMethod(request: IncomingMessage): boolean {
  return request.method === 'GET' || request.method === 'HEAD';
}

function header(response: ServerResponse, name: string, value: string): void {
  if (!response.headersSent) response.setHeader(name, value);
}

function send(request: IncomingMessage, response: ServerResponse, status: number, body: unknown): void {
  sendText(request, response, status, 'application/json', JSON.stringify(body));
}

function sendText(
  request: IncomingMessage,
  response: ServerResponse,
  status: number,
  type: string,
  body: string
): void {
  // Nothing to say twice: a second answer to one request is a bug upstream of
  // here, and throwing about the headers would hide whatever that bug was.
  if (response.headersSent || response.writableEnded) return;
  response.statusCode = status;
  response.setHeader('Content-Type', `${type}; charset=utf-8`);
  const payload = Buffer.from(body, 'utf-8');
  response.setHeader('Content-Length', String(payload.length));
  // A HEAD carries the headers of the GET and none of its body.
  response.end(request.method === 'HEAD' ? undefined : payload);
}

function notModified(response: ServerResponse): void {
  response.statusCode = 304;
  response.end();
}

function notFound(request: IncomingMessage, response: ServerResponse): void {
  send(request, response, 404, { message: 'no such formula, version or file' });
}

function methodNotAllowed(request: IncomingMessage, response: ServerResponse, allow: string): void {
  header(response, 'Allow', allow);
  send(request, response, 405, { message: `this resource takes ${allow}` });
}

function notAcceptable(request: IncomingMessage, response: ServerResponse, offers: readonly string[]): void {
  send(request, response, 406, { message: `nothing to serve for that Accept; this resource has ${offers.join(', ')}` });
}

function positive(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
