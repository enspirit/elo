import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DateTime, Duration, Interval } from 'luxon';
import { compile, loadProgram, hasNoExpression, readProgram } from '../../src/index';
import { nodeLoader } from '../../src/node';

/**
 * What a host that embeds Elo can reach.
 *
 * `compile()` is the entry point, and a feature it cannot reach is a feature
 * the CLIs have and embedders do not. Imports were such a feature: `compile()`
 * refused them with no way to say what to read from, so a host either did
 * without or reassembled the tail of `compile()` — the dependency-injection
 * list included — out of the library's internals.
 *
 * The filesystem loader lives behind a second entry point, `@enspirit/elo/node`:
 * the main one is bundled into a browser by the playground, where there are no
 * files to read.
 */

const runtime = { DateTime, Duration, Interval };

const FIXTURES = join(__dirname, '../../../test/fixtures/reference');

describe('compile - a source that imports', () => {
  it('compiles and runs the diamond, given a loader', () => {
    const file = join(FIXTURES, 'modules/diamond-a.elo');
    const run = compile<(input: unknown) => { a: string; label: string }>(
      readFileSync(file, 'utf-8'),
      { runtime, loader: nodeLoader(), file }
    );
    assert.deepStrictEqual(run(null), { a: 'helper', label: 'shared-helper' });
  });

  it('resolves a path against the working directory with no file', () => {
    const run = compile<(input: unknown) => unknown>(
      "import './test/fixtures/reference/modules/shared-helper' as s\ns.name",
      { runtime, loader: nodeLoader() }
    );
    assert.strictEqual(run(null), 'helper');
  });

  it('brings in a module type as well as a module value', () => {
    const file = join(FIXTURES, 'imports.elo');
    const run = compile<(input: unknown) => unknown>(
      "import { Age } from './modules/types'\n'30' |> Age",
      { runtime, loader: nodeLoader(), file }
    );
    assert.strictEqual(run(null), 30);
  });

  it('refuses an import when the host offers no loader', () => {
    assert.throws(
      () => compile("import './shared' as s\ns.twice(1)", { runtime }),
      /Cannot import '\.\/shared': this host has no module loader/
    );
  });

  it('says which module it could not read', () => {
    const file = join(FIXTURES, 'imports.elo');
    assert.throws(
      () => compile("import { x } from './modules/nope'\nx", { runtime, loader: nodeLoader(), file }),
      /Cannot import '\.\/modules\/nope': no module at .*modules\/nope\.elo/
    );
  });
});

describe('readProgram - one expression per line', () => {
  /**
   * The reading `--lines` serves, and the convention Elo's own corpus is
   * written in. A host that wants to run such a file has to split it, and
   * finding expression boundaries is a parser's job.
   */
  it('runs a file of per-line assertions, imports included', () => {
    const file = join(FIXTURES, 'imports-sharing.elo');
    const source = readFileSync(file, 'utf-8');
    const program = loadProgram(source, { loader: nodeLoader(), file });
    const lines = readProgram(program.body, true);

    let ran = 0;
    for (const line of lines) {
      if (hasNoExpression(line)) continue;
      const run = compile<(input: unknown) => unknown>(line, { runtime, scope: program, file });
      assert.strictEqual(run(null), true, line.trim());
      ran++;
    }
    // Counted from the fixture rather than written here: what this guards is
    // that the loop did not silently skip lines, and a fixture the corpus
    // keeps growing should not have to come back and edit a number.
    const expected = source.split('\n').filter((l) => l.startsWith('assert')).length;
    assert.ok(expected > 0, 'the fixture has assertions to run');
    assert.strictEqual(ran, expected, 'every assertion of the fixture ran');
  });

  it('keeps one entry per line of the source, blanks included', () => {
    // One line of source gives one line of emitted code, which is what the
    // fixture corpus is checked against.
    const body = "1 + 1\n\n# a comment\n2 + 2\n";
    assert.deepStrictEqual(readProgram(body, true), ['1 + 1', '', '', '2 + 2', '']);
  });

  it('reads the whole source as one expression without it', () => {
    const body = '{\n  a: 1\n}';
    assert.deepStrictEqual(readProgram(body), [body]);
  });

  it('reads nothing out of a source that holds no expression', () => {
    assert.deepStrictEqual(readProgram('\n# types only\n'), []);
  });
});
