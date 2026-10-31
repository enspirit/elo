// Browser resource sandbox for compiled Elo.
//
// Runs the compiled function in a Web Worker and hard-kills it on timeout. The
// input is passed by postMessage (structured clone), which also enforces the
// data-only contract. Browsers cannot cap a worker's memory directly, so the
// timeout is the main lever — keep inputs small and prefer server-side
// evaluation for untrusted expressions.
//
//   import { compile } from '@enspirit/elo';
//   const fn = compile(expression, { runtime: { DateTime, Duration } });
//   const result = await runElo(fn.toString(), input, { timeoutMs: 500 });
//
// If an expression uses dates, make luxon's DateTime/Duration available inside
// the worker (importScripts a bundle, or inline them into the worker source).
export function runElo(code, input, { timeoutMs = 500 } = {}) {
  const workerSource = `
    self.onmessage = (e) => {
      const fn = (0, eval)(e.data.code);
      self.postMessage(fn(e.data.input));
    };
  `;
  const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
  const worker = new Worker(url);

  return new Promise((resolve, reject) => {
    const done = (fn) => { clearTimeout(timer); worker.terminate(); URL.revokeObjectURL(url); fn(); };
    const timer = setTimeout(() => done(() => reject(new Error(`Elo: evaluation timed out after ${timeoutMs}ms`))), timeoutMs);
    worker.onmessage = (e) => done(() => resolve(e.data));
    worker.onerror = (e) => done(() => reject(e.error || new Error(e.message)));
    worker.postMessage({ code, input });
  });
}
