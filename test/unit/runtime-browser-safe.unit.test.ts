import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

/**
 * The runtime module is bundled into the browser (the playground compiles Elo
 * in-page). It must not touch Node-only globals at import time. Regression for
 * `MAX_STRING_LENGTH` reading `process.env` unguarded, which threw
 * "ReferenceError: process is not defined" on import in the browser.
 *
 * We evaluate the compiled module in a context that deliberately has no
 * `process`, and assert it loads and still exposes a sane default.
 */
describe('runtime - browser safety (no process global)', () => {
  it('loads without a process global and keeps the default limit', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/runtime.js'),
      'utf-8'
    );
    const moduleObj: { exports: Record<string, unknown> } = { exports: {} };
    // Context intentionally omits `process` to mimic the browser. `require` is
    // provided for any CommonJS interop; `process` is NOT.
    const sandbox = { module: moduleObj, exports: moduleObj.exports, require, console };

    assert.doesNotThrow(
      () => vm.runInNewContext(src, sandbox),
      'importing runtime must not reference a bare `process`'
    );
    assert.strictEqual(
      moduleObj.exports.MAX_STRING_LENGTH,
      moduleObj.exports.DEFAULT_MAX_STRING_LENGTH,
      'with no process/env, MAX_STRING_LENGTH falls back to the default'
    );
    assert.strictEqual(typeof moduleObj.exports.MAX_STRING_LENGTH, 'number');
  });
});
