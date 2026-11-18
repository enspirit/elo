/**
 * The worker that runs a form's checks: `new Worker('…/elo-form.worker.js', { type: 'module' })`,
 * handed to `workerChecks`. It imports the module of checks it is told to and answers questions
 * about it; it does nothing else, and needs nothing else allowed.
 *
 * Serve it with a policy of its own — `default-src 'none'; script-src 'self'` — and the checks
 * can import what they need from your origin and reach nothing over the network.
 */
import { serveChecks } from './remote.js';
import type { WorkerScope } from './remote.js';

export { serveChecks };

const scope = globalThis as unknown as WorkerScope & { WorkerGlobalScope?: unknown; document?: unknown };
// Only where this is the worker's own script: imported anywhere else, it just exports.
if (typeof scope.WorkerGlobalScope !== 'undefined' && typeof scope.document === 'undefined') {
  serveChecks(scope, (url) => import(/* @vite-ignore */ url));
}
