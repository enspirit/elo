import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { splitProgramHeader } from '../../src/parser';

/**
 * Fixture validation tests.
 *
 * Ensures that all .elo fixture files follow the required format:
 * - Every line must be an assert() call (for effective acceptance testing)
 * - Empty lines, comments and the file's type prelude are allowed
 */

const TEST_DIR = join(__dirname, '../../../test/fixtures');

// Files that are exempt from the assert requirement
// (e.g., testing functions that always throw)
const EXEMPT_FILES = ['fail.elo'];

/**
 * Recursively find all .elo files in directory and subdirectories
 */
/**
 * A `.elo` file under a `modules/` directory is a module a fixture imports,
 * not a fixture: it holds the types and the value its importer brings in, and
 * none of the corpus-wide rules — an assert on every line, an expected file
 * per target — are about it. Its code is still covered, inlined into the
 * fixture that imports it.
 */
const MODULES_DIR = 'modules';

function findEloFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === MODULES_DIR) continue;
      files.push(...findEloFiles(fullPath));
    } else if (entry.endsWith('.elo')) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('Fixture validation', () => {
  const files = findEloFiles(TEST_DIR);

  for (const filePath of files) {
    const fileName = filePath.split(/[/\\]/).pop()!;
    const displayName = relative(TEST_DIR, filePath);

    if (EXEMPT_FILES.includes(fileName)) {
      continue;
    }

    it(`${displayName} should have assert() on every line`, () => {
      const content = readFileSync(filePath, 'utf-8');
      // A header declares imports and types rather than asserting anything, so
      // the requirement is on what follows it. splitProgramHeader blanks the
      // header out and keeps every other line where it was.
      const lines = splitProgramHeader(content).body.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines and comments
        if (line === '' || line.startsWith('#')) {
          continue;
        }

        // Every non-empty, non-comment line must start with assert( or assertFails(
        assert.ok(
          line.startsWith('assert(') || line.startsWith('assertFails('),
          `Line ${i + 1} in ${displayName} must be an assert() or assertFails() call, got: "${line.substring(0, 50)}..."`
        );
      }
    });
  }
});
