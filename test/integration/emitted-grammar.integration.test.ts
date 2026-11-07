import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from '../../src/parser';
import { loadProgram, scopeProgram } from '../../src/modules';
import type { LoadedProgram } from '../../src/modules';
import { nodeLoader } from '../../src/node-loader';
import { typecheckWithAnnotations } from '../../src/typecheck';
import { compileToJavaScript } from '../../src/compilers/javascript';
import { checkEmittedJavaScript, describeViolations } from '../support/emitted-js-grammar';

/**
 * The grammar gate, applied to every emission the compiler can produce — not
 * only to the committed `.expected.js`.
 *
 * This matters because **the emitter is chosen by the compile mode**, and the
 * committed fixtures record exactly one mode. The typed `at()` sandbox escape
 * of 1.2.3 is the case in point: it lived in the `at([Int], Int)` emitter,
 * which is only reached when the checker's annotations are fed back into
 * codegen — that is, under `--optimize`, which no `.expected.js` file holds.
 * A gate over the committed fixtures alone would have been green throughout.
 *
 * So every fixture line is compiled four ways here and all four are gated:
 *
 *  - plain, and plain with `--execute` (what the fixtures record);
 *  - annotated, and annotated with `--execute` (what `--optimize` emits).
 *
 * `--strip-guards` only removes nodes, so it cannot produce a construct the
 * other four do not; it is left out deliberately rather than forgotten.
 */

const FIXTURES = join(__dirname, '../../../test/fixtures');

/**
 * A `.elo` file under a `modules/` directory is a module a fixture imports,
 * not a fixture; its code is covered inlined into the fixture that imports it.
 */
const MODULES_DIR = 'modules';

function findEloFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== MODULES_DIR) files.push(...findEloFiles(full));
    } else if (entry.endsWith('.elo')) files.push(full);
  }
  return files.sort();
}

function programOf(path: string): {
  scope: LoadedProgram;
  expressions: Array<{ line: number; source: string }>;
} {
  const scope = loadProgram(readFileSync(path, 'utf-8'), { loader: nodeLoader(), file: path });
  const expressions = scope.body
    .split('\n')
    .map((source, i) => ({ line: i + 1, source }))
    .filter(({ source }) => {
      const trimmed = source.trim();
      return trimmed !== '' && !trimmed.startsWith('#');
    });
  return { scope, expressions };
}

describe('Every JavaScript emission stays inside the allowed grammar', () => {
  const files = findEloFiles(FIXTURES);

  it('finds the corpus', () => {
    assert.ok(files.length > 100, `only ${files.length} .elo fixtures found`);
  });

  for (const path of files) {
    const name = relative(FIXTURES, path);

    it(`${name}, plain and annotated`, () => {
      const { scope, expressions } = programOf(path);

      for (const { line, source } of expressions) {
        const ast = scopeProgram(scope, parse(source));
        const { types } = typecheckWithAnnotations(ast);

        const modes: Array<[string, () => string]> = [
          ['plain', () => compileToJavaScript(ast)],
          ['plain --execute', () => compileToJavaScript(ast, { execute: true })],
          ['--optimize', () => compileToJavaScript(ast, { types })],
          ['--optimize --execute', () => compileToJavaScript(ast, { execute: true, types })],
        ];

        for (const [mode, compile] of modes) {
          let code: string;
          try {
            code = compile();
          } catch {
            // A refusal is not this test's business: `optimize-equivalence`
            // already pins that annotating never changes whether a program
            // compiles. There is simply no emission to gate.
            continue;
          }
          const violations = checkEmittedJavaScript(code);
          assert.deepStrictEqual(
            violations,
            [],
            describeViolations(`${name}:${line} (${mode})`, code, violations)
          );
        }
      }
    });
  }
});
