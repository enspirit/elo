/**
 * Checks that run in a worker: the page asks, the worker answers.
 *
 * Compiled checks are the schema's constraints as JavaScript. In a worker they have no document,
 * and — served under a policy of their own — no network either; one that never answers is
 * terminated. The widgets still ask synchronously: an answer not yet known is `pending`, taken as
 * accepted for now, and the form is told when it arrives.
 *
 * Both ends of the conversation are in this file, so that they cannot disagree about it.
 */
import { checkerFrom } from './plan.js';
import type { Check, Checker, CompiledChecks } from './plan.js';

type Ask =
  | [input: number, op: 'check', id: number, value: unknown]
  | [input: number, op: 'passes', rule: number, part: number | null, value: unknown];
/** A refusal, `true` for accepted, or for `passes`: true, false, or null when it cannot be told. */
type Answer = Extract<Check, { ok: false }> | boolean | null;

type ToWorker = { load: string } | { n: number; inputs: unknown[]; asks: Ask[] };
type ToPage =
  | { ready: { nodes: string[]; rules: string[] } }
  | { failed: string }
  | { n: number; answers: Answer[] };

// ---------------------------------------------------------------------------
// In the worker
// ---------------------------------------------------------------------------

/** What a worker's global scope offers, as far as this needs it. */
export interface WorkerScope {
  onmessage: ((event: { data: any }) => void) | null;
  postMessage(message: unknown): void;
}

/**
 * Answer the page's questions from a module of checks. `load` fetches that module: in a worker,
 * `(url) => import(url)`.
 */
export function serveChecks(scope: WorkerScope, load: (url: string) => Promise<{ default: CompiledChecks }>): void {
  let checker: Checker | undefined;
  const say = (message: ToPage) => scope.postMessage(message);
  scope.onmessage = ({ data }: { data: ToWorker }) => {
    if ('load' in data) {
      load(data.load).then((module) => {
        checker = checkerFrom(module.default);
        say({ ready: { nodes: Object.keys(module.default.nodes), rules: Object.keys(module.default.rules) } });
      }, (e) => say({ failed: String(e?.message ?? e) }));
      return;
    }
    if (!checker) return;
    const answers = data.asks.map((ask): Answer => {
      const input = data.inputs[ask[0]];
      if (ask[1] === 'check') {
        const r = checker!.check(ask[2], ask[3], input);
        // What Elo made of the value stays here: Luxon's dates do not cross to the page.
        return r.ok ? true : r;
      }
      return checker!.passes(ask[2], ask[3] ?? undefined, ask[4], input) ?? null;
    });
    say({ n: data.n, answers });
  };
}

// ---------------------------------------------------------------------------
// In the page
// ---------------------------------------------------------------------------

/** What the page needs of a `Worker`. */
export interface WorkerLike {
  onmessage: ((event: { data: any }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
}

export interface WorkerChecksOptions {
  /** Where the module written by `compileChecks(…, { format: 'module' })` is served. */
  checks: string;
  /**
   * How long one round of questions may take, in milliseconds, before the worker is terminated
   * and the form goes on unchecked (`enforced: false`). Default 2000.
   */
  timeout?: number;
  /** How long loading the checks may take. Default 10000. */
  loadTimeout?: number;
}

/** How many distinct form values are remembered: the current one, and a few a choice tried. */
const KEPT = 6;

/**
 * A checker whose checks run in `worker`: `new Worker('/lib/elo-form.worker.js', { type: 'module' })`.
 * Resolves once the checks are loaded there; rejects if they cannot be.
 */
export function workerChecks(worker: WorkerLike, options: WorkerChecksOptions): Promise<Checker> {
  const timeout = options.timeout ?? 2000;
  let nodes = new Set<string>();
  let rules = new Set<string>();
  let alive = true;

  /** By form value (as JSON text), what is known about it. Insertion order is age. */
  const known = new Map<string, Map<string, Answer>>();
  let lastInput: unknown = known;
  let lastText = '';
  const textOf = (input: unknown) => {
    if (input !== lastInput) { lastInput = input; lastText = JSON.stringify(input) ?? 'undefined'; }
    return lastText;
  };

  let queue: { text: string; input: unknown; key: string; ask: (i: number) => Ask }[] = [];
  const asked = new Set<string>();
  const flying = new Map<number, { text: string; key: string }[]>();
  let n = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  let waiters: (() => void)[] = [];

  const idle = () => queue.length === 0 && flying.size === 0;
  const announce = () => {
    for (const fn of [...listeners]) fn();
    if (idle()) { const all = waiters; waiters = []; for (const done of all) done(); }
  };
  const watch = () => {
    clearTimeout(timer);
    timer = flying.size ? setTimeout(die, timeout) : undefined;
  };
  /** The worker is gone: nothing is checked here from now on, and the form says so. */
  function die() {
    if (!alive) return;
    alive = false;
    clearTimeout(timer);
    worker.terminate();
    known.clear(); asked.clear(); flying.clear(); queue = [];
    announce();
  }

  const flush = () => {
    if (!alive || !queue.length) return;
    const inputs: unknown[] = [];
    const at = new Map<string, number>();
    const asks = queue.map((q) => {
      if (!at.has(q.text)) { at.set(q.text, inputs.length); inputs.push(q.input); }
      return q.ask(at.get(q.text)!);
    });
    flying.set(++n, queue.map(({ text, key }) => ({ text, key })));
    queue = [];
    try { worker.postMessage({ n, inputs, asks } satisfies ToWorker); watch(); } catch { die(); }
  };

  const lookup = (input: unknown, key: string, ask: (i: number) => Ask): Answer | undefined => {
    const text = textOf(input);
    const answer = known.get(text)?.get(key);
    if (answer !== undefined) return answer;
    const id = `${text}\n${key}`;
    if (!asked.has(id)) {
      asked.add(id);
      if (!queue.length) queueMicrotask(flush);
      queue.push({ text, input, key, ask });
    }
    return undefined;
  };

  const receive = (data: Extract<ToPage, { n: number }>) => {
    const sent = flying.get(data.n);
    if (!sent) return;
    flying.delete(data.n);
    sent.forEach(({ text, key }, i) => {
      asked.delete(`${text}\n${key}`);
      if (!known.has(text)) {
        known.set(text, new Map());
        if (known.size > KEPT) known.delete(known.keys().next().value!);
      }
      known.get(text)!.set(key, data.answers[i] ?? null);
    });
    watch();
    announce();
  };

  const checker: Checker = {
    get enforced() { return alive; },
    has: (id) => alive && id !== undefined && nodes.has(String(id)),
    check(id, value, input) {
      if (!this.has(id)) return { ok: true, value };
      const a = lookup(input, `c${id}:${JSON.stringify(value)}`, (i) => [i, 'check', id, value]);
      if (a === undefined) return { ok: true, value, pending: true };
      return a === true || a === null || a === false ? { ok: true, value } : a;
    },
    passes(rule, part, value, input) {
      const name = part === undefined ? String(rule) : `${rule}.${part}`;
      if (!alive || !rules.has(name)) return undefined;
      const a = lookup(input, `p${name}:${JSON.stringify(value)}`, (i) => [i, 'passes', rule, part ?? null, value]);
      return typeof a === 'boolean' ? a : undefined;
    },
    pending: () => alive && !idle(),
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    settled: () => (idle() ? Promise.resolve() : new Promise((done) => { waiters.push(done); })),
  };

  return new Promise((resolve, reject) => {
    const fail = (why: string) => { die(); reject(new Error(`The checks could not be loaded: ${why}`)); };
    const loading = setTimeout(() => fail('no answer'), options.loadTimeout ?? 10000);
    worker.onerror = (e: any) => { clearTimeout(loading); fail(String(e?.message ?? 'the worker failed')); };
    worker.onmessage = ({ data }: { data: ToPage }) => {
      if ('ready' in data) {
        clearTimeout(loading);
        nodes = new Set(data.ready.nodes);
        rules = new Set(data.ready.rules);
        worker.onerror = die;
        resolve(checker);
      } else if ('failed' in data) {
        clearTimeout(loading);
        fail(data.failed);
      } else receive(data);
    };
    worker.postMessage({ load: options.checks } satisfies ToWorker);
  });
}
