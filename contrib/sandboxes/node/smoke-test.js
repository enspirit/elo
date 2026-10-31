'use strict';
// Smoke test for the Node sandbox. Run: node contrib/sandboxes/node/smoke-test.js
// Uses hand-written compiled-shape strings so it has no dependency on the Elo
// build; in real use, `code` is the output of Elo's compile().
const assert = require('assert');
const { runElo } = require('./run-elo');

(async () => {
  // 1. Happy path.
  const r = await runElo('(function(_) { return _ * 2; })', 21, { timeoutMs: 1000 });
  assert.strictEqual(r, 42, 'happy path should return 42');

  // 2. Timeout: a runaway synchronous computation is hard-killed.
  await assert.rejects(
    runElo('(function(_) { while (true) {} })', null, { timeoutMs: 200 }),
    /timed out/,
    'infinite loop should time out'
  );

  // 3. Memory: an allocation past the heap cap kills the worker (OOM / exit).
  await assert.rejects(
    runElo('(function(_) { const a = []; while (true) { a.push(new Array(100000).fill(0)); } })',
           null, { timeoutMs: 5000, maxHeapMb: 32 }),
    /out of memory|timed out/,
    'unbounded allocation should be contained'
  );

  console.log('node sandbox: OK');
})().catch((e) => { console.error('node sandbox FAILED:', e); process.exit(1); });
