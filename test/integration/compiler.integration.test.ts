import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse } from '../../src/parser';
import { compileToJavaScript } from '../../src/compilers/javascript';
import { compileToRuby } from '../../src/compilers/ruby';
import { compileToSQL } from '../../src/compilers/sql';

/**
 * Compiler tests using test fixtures from test/ directory.
 *
 * Each test suite has:
 * - <name>.elo - Elo expressions, one per line
 * - <name>.expected.js - Expected JavaScript compilation (optional)
 * - <name>.expected.ruby - Expected Ruby compilation (optional)
 * - <name>.expected.sql - Expected SQL compilation (optional)
 *
 * If an expected file is missing, that language will be skipped for this fixture.
 * This allows testing language-specific features (e.g., lambdas are not supported in SQL).
 */

const TEST_DIR = join(__dirname, '../../../test/fixtures');

interface TestSuite {
  name: string;
  elo: string[];
  expectedJS: string[] | null;
  expectedRuby: string[] | null;
  expectedSQL: string[] | null;
}

function tryReadFile(path: string): string[] | null {
  if (existsSync(path)) {
    return readFileSync(path, 'utf-8').split('\n');
  }
  return null;
}

function loadTestSuites(): TestSuite[] {
  const suites: TestSuite[] = [];

  // Find all .elo files
  const files = readdirSync(TEST_DIR);
  const eloFiles = files.filter(f => f.endsWith('.elo'));

  for (const eloFile of eloFiles) {
    const name = eloFile.replace('.elo', '');

    // Read all related files (expected files are optional)
    const eloPath = join(TEST_DIR, `${name}.elo`);
    const jsPath = join(TEST_DIR, `${name}.expected.js`);
    const rubyPath = join(TEST_DIR, `${name}.expected.ruby`);
    const sqlPath = join(TEST_DIR, `${name}.expected.sql`);

    const elo = readFileSync(eloPath, 'utf-8').split('\n');
    const expectedJS = tryReadFile(jsPath);
    const expectedRuby = tryReadFile(rubyPath);
    const expectedSQL = tryReadFile(sqlPath);

    suites.push({
      name,
      elo,
      expectedJS,
      expectedRuby,
      expectedSQL
    });
  }

  return suites;
}

const testSuites = loadTestSuites();

// Validate fixture file completeness - ensure expected files have the same number of lines as elo files
// Note: JavaScript is skipped because IIFE-wrapped output can be multi-line for a single expression
describe('Fixture file completeness', () => {
  for (const suite of testSuites) {
    const eloLineCount = suite.elo.length;

    // Skip JavaScript line count check - IIFE wrapping makes output multi-line
    if (suite.expectedJS) {
      it(`${suite.name}.expected.js should exist`, () => {
        assert.ok(suite.expectedJS!.length > 0, `${suite.name}.expected.js should not be empty`);
      });
    }

    if (suite.expectedRuby) {
      it(`${suite.name}.expected.ruby should have same line count as .elo`, () => {
        assert.strictEqual(
          suite.expectedRuby!.length,
          eloLineCount,
          `${suite.name}.expected.ruby has ${suite.expectedRuby!.length} lines but ${suite.name}.elo has ${eloLineCount} lines`
        );
      });
    }

    if (suite.expectedSQL) {
      it(`${suite.name}.expected.sql should have same line count as .elo`, () => {
        assert.strictEqual(
          suite.expectedSQL!.length,
          eloLineCount,
          `${suite.name}.expected.sql has ${suite.expectedSQL!.length} lines but ${suite.name}.elo has ${eloLineCount} lines`
        );
      });
    }
  }
});

for (const suite of testSuites) {
  describe(`Compiler - ${suite.name}`, () => {
    for (let i = 0; i < suite.elo.length; i++) {
      const expr = suite.elo[i].trim();

      // Skip empty lines
      if (!expr) continue;

      const lineNum = i + 1;

      it(`should compile line ${lineNum}: ${expr}`, () => {
        const ast = parse(expr);

        // Test JavaScript compilation (if expected file exists)
        if (suite.expectedJS) {
          const actualJS = compileToJavaScript(ast);
          const expectedJS = suite.expectedJS[i].trim();
          assert.strictEqual(
            actualJS,
            expectedJS,
            `JavaScript compilation mismatch on line ${lineNum}`
          );
        }

        // Test Ruby compilation (if expected file exists)
        if (suite.expectedRuby) {
          const actualRuby = compileToRuby(ast);
          const expectedRuby = suite.expectedRuby[i].trim();
          assert.strictEqual(
            actualRuby,
            expectedRuby,
            `Ruby compilation mismatch on line ${lineNum}`
          );
        }

        // Test SQL compilation (if expected file exists)
        if (suite.expectedSQL) {
          const actualSQL = compileToSQL(ast);
          const expectedSQL = suite.expectedSQL[i].trim();
          assert.strictEqual(
            actualSQL,
            expectedSQL,
            `SQL compilation mismatch on line ${lineNum}`
          );
        }
      });
    }
  });
}
