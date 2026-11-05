/**
 * Running one call under a cap.
 *
 * Elo is a *capability* sandbox by construction: a compiled expression cannot
 * do I/O, cannot `eval`, and cannot reach a host global. It is not a *resource*
 * sandbox — `2 ^ 2 ^ 30` is ten characters, and a formula that is quadratic in
 * the length of its input is a legal formula — so a service that takes an
 * input from a caller has to add the resource layer itself. This is that
 * layer, and it is the one in `contrib/sandboxes/node`: a worker thread, a heap
 * ceiling, a wall clock, and a hard kill.
 *
 * One worker per call. The compiled code is compiled *once*, at boot, and only
 * the string crosses the boundary — which is both what makes a call cheap
 * enough to do this way and the only arrangement in which the timeout measures
 * what it says: the time the caller's data spends being computed over.
 */

import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import type { AnswerShape } from './answer';
import type { CallMessage, CallRequest } from './call-worker';

export interface SandboxLimits {
  /** Wall clock for one call, hard-killed past it. */
  timeoutMs: number;
  /** Heap ceiling for one call, in megabytes. */
  maxHeapMb: number;
}

/** What one call came to. */
export type CallOutcome =
  /** The answer, already written as JSON by the worker. */
  | { ok: true; json: string }
  /** Elo refused the input, or the formula refused to answer. */
  | { ok: false; failure: { kind?: string; path?: string; label?: string; message: string } }
  /** The call hit a cap, and was stopped. */
  | { ok: false; cap: 'time' | 'memory'; message: string }
  /** The sandbox itself failed, which is the service's fault and not a cap. */
  | { ok: false; broken: string };

const WORKER = join(__dirname, 'call-worker.js');

export function runCall(
  code: string,
  input: unknown,
  shape: AnswerShape,
  limits: SandboxLimits
): Promise<CallOutcome> {
  const request: CallRequest = { code, input, shape };
  return new Promise<CallOutcome>(resolve => {
    let settled = false;
    const worker = new Worker(WORKER, {
      workerData: request,
      resourceLimits: {
        maxOldGenerationSizeMb: limits.maxHeapMb,
        maxYoungGenerationSizeMb: 16,
      },
    });

    const done = (outcome: CallOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(outcome);
      void worker.terminate();
    };

    const timer = setTimeout(() => {
      done({
        ok: false,
        cap: 'time',
        message: `the call did not finish within its time cap of ${limits.timeoutMs}ms`,
      });
    }, limits.timeoutMs);

    worker.once('message', (message: CallMessage) => {
      done(message.ok
        ? { ok: true, json: message.json }
        : {
          ok: false,
          failure: {
            ...(message.kind ? { kind: message.kind } : {}),
            ...(message.path ? { path: message.path } : {}),
            ...(message.label ? { label: message.label } : {}),
            message: message.message,
          },
        });
    });

    // An error here is the worker dying rather than the formula refusing: a
    // refusal is caught inside and posted as a message. The heap ceiling
    // arrives as an error or as a non-zero exit, depending on where the
    // allocation was — and anything else is the sandbox being broken rather
    // than the caller asking for too much, which is a different status.
    worker.once('error', error => {
      const code = (error as { code?: string }).code;
      done(code === 'ERR_WORKER_OUT_OF_MEMORY'
        ? {
          ok: false,
          cap: 'memory',
          message: `the call went past its memory cap of ${limits.maxHeapMb}MB`,
        }
        : { ok: false, broken: (error as Error).message });
    });
    worker.once('exit', exitCode => {
      if (exitCode !== 0) {
        done({
          ok: false,
          cap: 'memory',
          message: `the call was stopped: it went past its memory cap of ${limits.maxHeapMb}MB`,
        });
      }
    });
  });
}
