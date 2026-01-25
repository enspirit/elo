import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join, relative, dirname, basename } from "path";
import { parse } from "../../src/parser";
import { compileToJavaScript } from "../../src/compilers/javascript";

/**
 * Compiler tests using test fixtures from test/ directory.
 *
 * Fixtures are organized in subdirectories:
 * - reference/ - Language constructs (from docs)
 * - stdlib/ - Standard library functions by type
 * - others/ - Edge cases and integration tests
 *
 * Each test suite has:
 * - <name>.elo - Elo expressions, one per line
 * - <name>.expected.js - Expected JavaScript compilation (optional)
 *
 * JS-only fork: Ruby/SQL fixtures are ignored.
 */

const TEST_DIR = join(__dirname, "../../../test/fixtures");

/**
 * Recursively find all .elo files in directory and subdirectories
 */
function findEloFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findEloFiles(fullPath));
    } else if (entry.endsWith(".elo")) {
      files.push(fullPath);
    }
  }

  return files;
}

interface TestSuite {
  name: string;
  elo: string[];
  expectedJS: string[] | null;
}

function tryReadFile(path: string): string[] | null {
  if (existsSync(path)) {
    const content = readFileSync(path, "utf-8");
    // Remove trailing newline before splitting to match source line count
    return content.replace(/\n$/, "").split("\n");
  }
  return null;
}

function loadTestSuites(): TestSuite[] {
  const suites: TestSuite[] = [];

  // Find all .elo files recursively
  const eloFiles = findEloFiles(TEST_DIR);

  for (const eloPath of eloFiles) {
    const dir = dirname(eloPath);
    const baseName = basename(eloPath, ".elo");
    // Use relative path for display name (e.g., "reference/arithmetic")
    const name = relative(TEST_DIR, eloPath).replace(".elo", "");

    // Read all related files (expected files are optional)
    const jsPath = join(dir, `${baseName}.expected.js`);

    const eloContent = readFileSync(eloPath, "utf-8");
    // Remove trailing newline before splitting to match generated fixture line counts
    const elo = eloContent.replace(/\n$/, "").split("\n");
    const expectedJS = tryReadFile(jsPath);

    suites.push({
      name,
      elo,
      expectedJS,
    });
  }

  return suites;
}

const testSuites = loadTestSuites();

// Validate fixture file completeness - ensure expected files have the same number of lines as elo files
// Note: JavaScript is skipped because IIFE-wrapped output can be multi-line for a single expression
describe("Fixture file completeness", () => {
  for (const suite of testSuites) {
    const eloLineCount = suite.elo.length;

    // Skip JavaScript line count check - IIFE wrapping makes output multi-line
    if (suite.expectedJS) {
      it(`${suite.name}.expected.js should exist`, () => {
        assert.ok(
          suite.expectedJS!.length > 0,
          `${suite.name}.expected.js should not be empty`,
        );
      });
    }

    // JS-only fork: no Ruby/SQL fixture validation
  }
});

for (const suite of testSuites) {
  describe(`Compiler - ${suite.name}`, () => {
    for (let i = 0; i < suite.elo.length; i++) {
      const expr = suite.elo[i].trim();

      // Skip empty lines and comment lines
      if (!expr || expr.startsWith("#")) continue;

      const lineNum = i + 1;

      it(`should compile line ${lineNum}: ${expr}`, () => {
        const ast = parse(expr);

        // Test JavaScript compilation (if expected file exists)
        // Fixtures are generated with --execute, so we use { execute: true }
        if (suite.expectedJS) {
          const actualJS = compileToJavaScript(ast, { execute: true });
          const expectedJS = suite.expectedJS[i].trim();
          assert.strictEqual(
            actualJS,
            expectedJS,
            `JavaScript compilation mismatch on line ${lineNum}`,
          );
        }
      });
    }
  });
}
