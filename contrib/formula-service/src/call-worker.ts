/**
 * The worker half of the call sandbox: it evaluates one compiled formula over
 * one input and posts back the answer, as JSON.
 *
 * It is `contrib/sandboxes/node/elo-worker.js` with the two things a web
 * service needs added:
 *
 * - **The answer comes back as JSON, written here.** `postMessage` structure-
 *   clones, and a luxon `DateTime` does not survive that as a `DateTime` — so
 *   the value is written where it is produced, by the shape `Output` gave
 *   (`./answer`).
 * - **A refusal comes back with its kind.** An `Error` crossing the worker
 *   boundary keeps its message and loses every own property, and `kind`,
 *   `path` and `label` are exactly what the HTTP status is mapped from. So a
 *   refusal is caught here and posted as data.
 *
 * Nothing in here loads the compiler: the code arrives as a string, already
 * compiled, and the only thing required is luxon.
 */

import { parentPort, workerData } from 'node:worker_threads';
import { DateTime, Duration, Interval } from 'luxon';
import { toJson, type AnswerShape } from './answer';

/** What the worker is asked to do: a compiled program, an input, a shape. */
export interface CallRequest {
  code: string;
  input: unknown;
  shape: AnswerShape;
}

/** What it answers. A cap is not in here: the parent sees that one. */
export type CallMessage =
  | { ok: true; json: string }
  | { ok: false; kind?: string; path?: string; label?: string; message: string };

const { code, input, shape } = workerData as CallRequest;

// The emitted helpers name DateTime, Duration and Interval as free names —
// `kMul` does, so even a multiplication needs them — and they are bound as
// parameters rather than left to an indirect `eval`, which would evaluate in
// global scope where they are not visible.
const formula = new Function('DateTime', 'Duration', 'Interval', `return (${code});`)(
  DateTime, Duration, Interval
) as (value: unknown) => unknown;

let message: CallMessage;
try {
  message = { ok: true, json: JSON.stringify(toJson(formula(input), shape)) ?? 'null' };
} catch (error) {
  const failure = error as { kind?: string; path?: string; label?: string; message?: string };
  message = {
    ok: false,
    ...(failure.kind ? { kind: failure.kind } : {}),
    ...(failure.path ? { path: failure.path } : {}),
    ...(failure.label ? { label: failure.label } : {}),
    message: failure.message ?? String(error),
  };
}
parentPort?.postMessage(message);
