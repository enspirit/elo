# Browser sandbox

Runs compiled Elo in a Web Worker, hard-killed on timeout. Input is passed by
`postMessage` (structured clone), which enforces the data-only contract.

```js
import { compile } from '@enspirit/elo';
import { runElo } from './run-elo.js';

const fn = compile("_ * 2", { runtime: { DateTime, Duration } });
const result = await runElo(fn.toString(), 21, { timeoutMs: 500 }); // => 42
```

Caveats:

- Browsers **cannot cap a worker's memory** directly — the timeout is the main
  lever. Keep inputs small; prefer server-side evaluation for untrusted
  expressions.
- If an expression uses dates, make luxon's `DateTime`/`Duration` available
  inside the worker (import a bundle via `importScripts`, or inline them into
  the worker source).
