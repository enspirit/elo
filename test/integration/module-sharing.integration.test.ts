import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from '../../src/parser';
import { loadProgram, scopeProgram } from '../../src/modules';
import { nodeLoader } from '../../src/node-loader';
import { compileToJavaScript } from '../../src/compilers/javascript';
import { compileToRuby } from '../../src/compilers/ruby';
import { compileToSQL } from '../../src/compilers/sql';
import { compileToPython } from '../../src/compilers/python';

/**
 * What a shared module costs in the emission.
 *
 * `reference/imports-sharing.elo` reaches one helper three ways — through each
 * side of a diamond, and directly. The value it computes is what the
 * acceptance suite checks; what is checked here is that the helper is **in the
 * emitted code once**, on every target. Inlining it per importer gives the same
 * answer, so only the output says whether a module is shared.
 *
 * The helper holds a label, `'shared-helper'`, and counting it counts copies.
 */

const FIXTURE = join(__dirname, '../../../test/fixtures/reference/imports-sharing.elo');

const LABEL = 'shared-helper';

const TARGETS = {
  js: compileToJavaScript,
  ruby: compileToRuby,
  sql: compileToSQL,
  python: compileToPython,
} as const;

function copies(code: string): number {
  return code.split(LABEL).length - 1;
}

describe('a module imported by two others is emitted once', () => {
  const source = readFileSync(FIXTURE, 'utf-8');
  const program = loadProgram(source, { loader: nodeLoader(), file: FIXTURE });
  const lines = program.body.split('\n')
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => line.trim() !== '' && !line.trim().startsWith('#'));

  it('finds the fixture and its lines', () => {
    // Guards against a renamed fixture turning the whole suite into a no-op.
    assert.ok(lines.length >= 5, `expected assertions in ${FIXTURE}, found ${lines.length}`);
  });

  for (const [target, compileTo] of Object.entries(TARGETS)) {
    for (const { line, number } of lines) {
      it(`${target}, line ${number}`, () => {
        const code = compileTo(scopeProgram(program, parse(line)));
        // A line that writes the label itself carries one of its own.
        assert.strictEqual(copies(code), 1 + copies(line));
      });
    }
  }
});
