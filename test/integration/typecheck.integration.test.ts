import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { parse } from '../../src/parser';
import { typecheck, typecheckWithType } from '../../src/typecheck';
import { transform } from '../../src/transform';
import { inferType } from '../../src/ir';
import { compileToJavaScript } from '../../src/compilers/javascript';
import { compileToRuby } from '../../src/compilers/ruby';
import { compileToPython } from '../../src/compilers/python';

/**
 * The type checker against the whole fixture corpus.
 *
 * Fixtures are the best corpus Elo has for this: they are almost entirely
 * made of literals (barely any `_`), so the checker is close to fully precise
 * over them. Two properties are asserted:
 *
 *  - **No false positives.** Every fixture line is a program we believe in and
 *    execute in the acceptance suite, so the checker must not object to any of
 *    them. This is the test that caught three real gaps in the type table
 *    (Duration - Duration, min/max on Strings) when the checker was written.
 *
 *  - **No drift from the transform.** The checker and the transform are two
 *    separate walks over the same type table. If they disagree about a type,
 *    the checker would start blessing programs the compilers reject. Comparing
 *    the inferred type of every fixture line keeps them honest.
 */

const TEST_DIR = join(__dirname, '../../../test/fixtures');

function findEloFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...findEloFiles(fullPath));
    } else if (entry.endsWith('.elo')) {
      files.push(fullPath);
    }
  }
  return files;
}

interface FixtureLine {
  fixture: string;
  line: number;
  source: string;
}

function loadFixtureLines(): FixtureLine[] {
  const lines: FixtureLine[] = [];
  for (const eloPath of findEloFiles(TEST_DIR)) {
    const fixture = relative(TEST_DIR, eloPath).replace('.elo', '');
    const content = readFileSync(eloPath, 'utf-8').replace(/\n$/, '');
    content.split('\n').forEach((raw, index) => {
      const source = raw.trim();
      if (!source || source.startsWith('#')) return;
      lines.push({ fixture, line: index + 1, source });
    });
  }
  return lines;
}

const fixtureLines = loadFixtureLines();

describe('Typecheck - the fixture corpus is clean', () => {
  it('finds at least a few hundred lines to check', () => {
    // Guards against the loader silently finding nothing and the suite
    // passing vacuously.
    assert.ok(fixtureLines.length > 500, `only found ${fixtureLines.length} lines`);
  });

  const byFixture = new Map<string, FixtureLine[]>();
  for (const entry of fixtureLines) {
    const existing = byFixture.get(entry.fixture) ?? [];
    existing.push(entry);
    byFixture.set(entry.fixture, existing);
  }

  for (const [fixture, entries] of byFixture) {
    it(`reports nothing in ${fixture}`, () => {
      const problems: string[] = [];
      for (const entry of entries) {
        const diagnostics = typecheck(parse(entry.source), {
          // Fixtures are compiled for every target, SQL included, where a bare
          // name is a column reference.
          allowUndefinedVariables: true,
        });
        for (const diagnostic of diagnostics) {
          problems.push(`line ${entry.line}: ${entry.source}\n    ${diagnostic.code}: ${diagnostic.message}`);
        }
      }
      assert.deepStrictEqual(
        problems,
        [],
        `the checker objects to fixture lines we believe in. Either the type ` +
        `table is missing a signature, or the checker is wrong.`
      );
    });
  }
});

describe('Typecheck - agrees with the transform on every fixture line', () => {
  for (const entry of fixtureLines) {
    it(`${entry.fixture}:${entry.line}`, () => {
      const ast = parse(entry.source);
      const fromChecker = typecheckWithType(ast, { allowUndefinedVariables: true }).type;
      const fromTransform = inferType(
        transform(ast, new Map(), new Set(), { allowUndefinedVariables: true })
      );
      assert.strictEqual(
        fromChecker.kind,
        fromTransform.kind,
        `${entry.source}\n  checker: ${fromChecker.kind}, transform: ${fromTransform.kind}`
      );
    });
  }
});

describe('Typecheck - predicts what the compilers reject', () => {
  /**
   * The compilers reject a bad call late, in `StdLib.emit`, and only for the
   * targets whose bindings happen not to cover it. The checker's job is to
   * make that decision up front, once, for every target. So: anything a
   * compiler refuses must have been reported by the checker first.
   */
  const rejected = [
    'foo(1)',
    "year('hello')",
    "abs('x')",
    'inDays(42)',
    "upper('a', 'b')",
    "substring('abc', 'x', 'y')",
    'startsWith(42, 1)',
  ];

  for (const source of rejected) {
    it(`reports ${source}, which a compiler would refuse`, () => {
      const ast = parse(source);
      assert.ok(typecheck(ast).length > 0, 'the checker should have reported this');

      const refusals = [compileToJavaScript, compileToRuby, compileToPython].filter((compile) => {
        try {
          compile(ast);
          return false;
        } catch {
          return true;
        }
      });
      assert.ok(refusals.length > 0, 'expected at least one compiler to refuse this');
    });
  }

  /**
   * The other half, and the reason the checker is worth having: these compile
   * on some targets and not others today, so "it compiles" does not mean the
   * same thing everywhere. The checker reports all of them uniformly.
   */
  const silentlyAccepted = [
    "'hello' - 5",
    "1 + 'a'",
    "[1, 2] + 'x'",
    "today() + 'str'",
    "-'hello'",
    '!42',
    'upper(42)',
    'length(42)',
  ];

  for (const source of silentlyAccepted) {
    it(`reports ${source}, which some target compiles in silence`, () => {
      assert.ok(typecheck(parse(source)).length > 0);
    });
  }
});
