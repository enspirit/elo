'use strict';
// Node.js resource sandbox for compiled Elo.
//
// Compile in your trusted process (require('@enspirit/elo').compile), then run
// only the *output* here. The worker thread gives you all three resource
// levers at once: a V8 heap cap (resourceLimits), execution off your main event
// loop, and a hard kill on timeout.
//
//   const { compile } = require('@enspirit/elo');
//   const { DateTime, Duration } = require('luxon');
//   const fn = compile(expression, { runtime: { DateTime, Duration } });
//   const result = await runElo(fn.toString(), input, { timeoutMs: 1000, maxHeapMb: 64 });

const path = require('path');
const { Worker } = require('worker_threads');

function runElo(code, input, options) {
  const { timeoutMs = 1000, maxHeapMb = 64 } = options || {};
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn) => { if (!settled) { settled = true; clearTimeout(timer); fn(); } };

    const worker = new Worker(path.join(__dirname, 'elo-worker.js'), {
      workerData: { code, input },
      resourceLimits: { maxOldGenerationSizeMb: maxHeapMb, maxYoungGenerationSizeMb: 16 },
    });

    const timer = setTimeout(() => {
      done(() => reject(new Error(`Elo: evaluation timed out after ${timeoutMs}ms`)));
      worker.terminate();
    }, timeoutMs);

    worker.once('message', (value) => { done(() => resolve(value)); worker.terminate(); });
    worker.once('error', (err) => done(() => reject(err)));
    worker.once('exit', (exitCode) => {
      // A non-zero exit that reaches us before a message means the worker died —
      // most often the heap cap (out of memory).
      if (exitCode !== 0) done(() => reject(new Error(`Elo: worker exited (${exitCode}) — likely out of memory`)));
    });
  });
}

module.exports = { runElo };
