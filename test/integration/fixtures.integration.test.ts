import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Fixture validation tests.
 *
 * Ensures that all .elo fixture files follow the required format:
 * - Every line must be an assert() call (for effective acceptance testing)
 * - Empty lines and comments are allowed
 */

const TEST_DIR = join(__dirname, "../../../test/fixtures");

// Files that are exempt from the assert requirement
// (e.g., testing functions that always throw)
const EXEMPT_FILES = ["fail.elo"];

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

describe("Fixture validation", () => {
  const files = findEloFiles(TEST_DIR);

  for (const filePath of files) {
    const fileName = filePath.split("/").pop()!;
    const displayName = relative(TEST_DIR, filePath);

    if (EXEMPT_FILES.includes(fileName)) {
      continue;
    }

    it(`${displayName} should have assert() on every line`, () => {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines and comments
        if (line === "" || line.startsWith("#")) {
          continue;
        }

        // Every non-empty, non-comment line must start with assert( or assertFails(
        assert.ok(
          line.startsWith("assert(") || line.startsWith("assertFails("),
          `Line ${i + 1} in ${displayName} must be an assert() or assertFails() call, got: "${line.substring(0, 50)}..."`,
        );
      }
    });
  }
});
