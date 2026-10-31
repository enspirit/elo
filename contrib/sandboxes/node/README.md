# Node.js sandbox

Runs compiled Elo in a `worker_threads` worker: a V8 heap cap
(`resourceLimits.maxOldGenerationSizeMb`), execution off the main event loop,
and a hard `worker.terminate()` on timeout.

```js
const { compile } = require('@enspirit/elo');
const { DateTime, Duration } = require('luxon');
const { runElo } = require('./run-elo');

const fn = compile("_ * 2", { runtime: { DateTime, Duration } });
const result = await runElo(fn.toString(), 21, { timeoutMs: 1000, maxHeapMb: 64 });
// => 42
```

- `elo-worker.js` requires `luxon` (an Elo runtime dependency); install it where
  the worker runs.
- Compile in your trusted process; only the compiled *output* runs in the worker.
- Why not `vm` + its `timeout`? It interrupts synchronous CPU-bound work but does
  **not** cap memory, runs on the main event loop, and is not an isolation
  boundary. Use a worker for untrusted expressions.

Smoke test: `node smoke-test.js`.
