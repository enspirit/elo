import { describe, it } from "bun:test";
import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parse } from "../../src/parser";
import { DateTime, Duration } from "luxon";

/**
 * Unified test for all website examples.
 *
 * This test extracts Elo code examples from all website sources and:
 * 1. Compiles and evaluates each example (not just parses)
 * 2. Uses data-input attribute for input data (defaults to null)
 * 3. Uses data-expected attribute or fn-result span for expected values
 * 4. Verifies results match expected values when provided
 *
 * Sources:
 * - learn.astro, reference.astro, stdlib.astro, index.astro
 * - playground_controller.ts (EXAMPLES + EXAMPLE_INPUTS)
 * - Blog posts (```elo fenced code blocks)
 */

const runtime = { DateTime, Duration };
const webDir = path.join(process.cwd(), "web/src");
const blogDir = path.join(webDir, "content/blog");

// Helper to compile and evaluate an expression
function evaluate<T>(code: string, input: unknown = null): T {
  const fn = compile<(_: unknown) => T>(code, { runtime });
  return fn(input);
}

// Helper to read files
function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(webDir, relativePath), "utf-8");
}

function readBlogFile(filename: string): string {
  return fs.readFileSync(path.join(blogDir, filename), "utf-8");
}

function getBlogFiles(): string[] {
  if (!fs.existsSync(blogDir)) return [];
  return fs.readdirSync(blogDir).filter((f) => f.endsWith(".md"));
}

// Decode HTML entities
function decodeHtml(html: string): string {
  return html
    .replace(/&#123;/g, "{")
    .replace(/&#125;/g, "}")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Strip Astro template wrapper {`...`}
function stripAstroWrapper(code: string): string {
  if (code.startsWith("{`") && code.endsWith("`}")) {
    return code.slice(2, -2);
  }
  return code;
}

// Check if example should be skipped
function shouldSkip(code: string): boolean {
  // Skip exercise templates with ??? placeholders
  if (code.includes("???")) return true;
  // Skip examples that deliberately fail
  if (code.includes("fail(")) return true;
  return false;
}

// Parse expected value from string representation
function parseExpected(expectedStr: string): unknown {
  const trimmed = expectedStr.trim();

  // Handle special values
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;

  // Handle quoted strings
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }

  // Handle arrays
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      // Try JSON parse first
      return JSON.parse(trimmed);
    } catch {
      // Convert single quotes to double quotes for JSON parsing
      const jsonStr = trimmed.replace(/'/g, '"');
      try {
        return JSON.parse(jsonStr);
      } catch {
        // Fall through
      }
    }
  }

  // Handle objects/tuples - convert Elo syntax to JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      // Try JSON parse first
      return JSON.parse(trimmed);
    } catch {
      // Convert Elo object syntax to JSON: {name: 'Alice'} -> {"name": "Alice"}
      const jsonStr = trimmed.replace(/(\w+):/g, '"$1":').replace(/'/g, '"');
      try {
        return JSON.parse(jsonStr);
      } catch {
        // Give up on parsing
      }
    }
  }

  // Handle numbers
  const num = Number(trimmed);
  if (!isNaN(num)) return num;

  // Handle date literals like D2024-01-15
  if (trimmed.startsWith("D") && /^D\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return "DateTime"; // Just check it's a DateTime
  }

  // Handle duration literals like P1D
  if (trimmed.startsWith("P") && /^P\d/.test(trimmed)) {
    return "Duration"; // Just check it's a Duration
  }

  return trimmed;
}

// Compare results, handling special types
function resultsMatch(actual: unknown, expected: unknown): boolean {
  // Special type checks
  if (expected === "DateTime") {
    return DateTime.isDateTime(actual);
  }
  if (expected === "Duration") {
    return Duration.isDuration(actual);
  }

  // For DateTime results, just check it's a DateTime
  if (DateTime.isDateTime(actual)) {
    if (typeof expected === "string" && expected.startsWith("D")) {
      return true; // Accept any DateTime for date literal expectations
    }
  }

  // For Duration results, just check it's a Duration
  if (Duration.isDuration(actual)) {
    if (typeof expected === "string" && expected.startsWith("P")) {
      return true; // Accept any Duration for duration literal expectations
    }
  }

  // Deep equality for objects/arrays
  if (typeof actual === "object" && typeof expected === "object") {
    try {
      assert.deepStrictEqual(actual, expected);
      return true;
    } catch {
      return false;
    }
  }

  return actual === expected;
}

interface Example {
  code: string;
  input: unknown;
  expected: unknown | undefined;
  line: number;
  source: string;
  parseOnly?: boolean; // If true, only parse, don't evaluate
}

/**
 * Extract examples from Astro pages (learn, reference, index).
 * Pattern: <pre class="language-elo">code</pre> or <code class="language-elo">code</code>
 * With optional data-input on parent div and data-expected attribute.
 */
function extractAstroExamples(content: string, source: string): Example[] {
  const examples: Example[] = [];

  // Match pre or code with class="language-elo"
  // We need to also capture the parent context for data-input
  const regex =
    /<(?:pre|code)\s+class="language-elo"[^>]*>([^<]+)<\/(?:pre|code)>/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    let code = match[1];
    const matchIndex = match.index;

    // Calculate line number
    const beforeMatch = content.slice(0, matchIndex);
    const line = (beforeMatch.match(/\n/g) || []).length + 1;

    // Decode HTML entities and strip Astro wrapper
    code = decodeHtml(stripAstroWrapper(code)).trim();

    if (shouldSkip(code)) continue;

    // Look for data-input in the surrounding context
    // First, find the opening tag of the parent div (look backwards for the most recent opening tag with data-input)
    const contextStart = Math.max(0, matchIndex - 300);
    const contextBefore = content.slice(contextStart, matchIndex);

    let input: unknown = null;

    // Find the last data-input attribute in the context before this element
    // This handles the parent div pattern: <div data-input='...'><pre>...</pre></div>
    const inputMatches = [...contextBefore.matchAll(/data-input='([^']+)'/g)];
    if (inputMatches.length > 0) {
      const lastMatch = inputMatches[inputMatches.length - 1];
      try {
        input = JSON.parse(decodeHtml(lastMatch[1]));
      } catch {
        // Try as number
        const num = Number(lastMatch[1]);
        if (!isNaN(num)) {
          input = num;
        }
      }
    }

    // Look for data-expected attribute
    let expected: unknown | undefined;
    const expectedMatch = contextBefore.match(/data-expected='([^']+)'/);
    if (expectedMatch) {
      expected = parseExpected(decodeHtml(expectedMatch[1]));
    }

    examples.push({ code, input, expected, line, source });
  }

  return examples;
}

/**
 * Extract examples from stdlib.astro.
 * Pattern: <code class="language-elo">code</code><span class="fn-result">→ value</span>
 */
function extractStdlibExamples(content: string): Example[] {
  const examples: Example[] = [];

  // Match code with class="language-elo" followed by fn-result span
  const regex =
    /<code\s+class="language-elo">([^<]+)<\/code><span\s+class="fn-result">→\s*([^<]+)<\/span>/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    let code = match[1];
    const expectedStr = match[2].trim();
    const matchIndex = match.index;

    // Calculate line number
    const beforeMatch = content.slice(0, matchIndex);
    const line = (beforeMatch.match(/\n/g) || []).length + 1;

    // Decode HTML entities
    code = decodeHtml(code).trim();

    if (shouldSkip(code)) continue;

    // Look for data-input in surrounding context
    const contextStart = Math.max(0, matchIndex - 300);
    const context = content.slice(contextStart, matchIndex);

    let input: unknown = null;
    const inputMatch = context.match(/data-input='([^']+)'/);
    if (inputMatch) {
      try {
        input = JSON.parse(decodeHtml(inputMatch[1]));
      } catch {
        // Ignore
      }
    }

    const expected = parseExpected(decodeHtml(expectedStr));

    examples.push({ code, input, expected, line, source: "stdlib.astro" });
  }

  return examples;
}

/**
 * Extract examples from playground_controller.ts.
 * Uses EXAMPLES and EXAMPLE_INPUTS constants.
 */
function extractPlaygroundExamples(content: string): Example[] {
  const examples: Example[] = [];

  // Extract EXAMPLES constant
  const examplesMatch = content.match(
    /const EXAMPLES:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\n\};/,
  );
  if (!examplesMatch) return examples;

  // Extract EXAMPLE_INPUTS constant
  const inputsMatch = content.match(
    /const EXAMPLE_INPUTS:\s*Record<string,\s*ExampleInput>\s*=\s*\{([\s\S]*?)\n\};/,
  );
  const inputs = new Map<string, { data: string; format: string }>();

  if (inputsMatch) {
    // Parse each input entry
    const inputRegex =
      /'([^']+)':\s*\{\s*data:\s*`([^`]+)`,\s*format:\s*'([^']+)'\s*\}/g;
    let inputMatch;
    while ((inputMatch = inputRegex.exec(inputsMatch[1])) !== null) {
      inputs.set(inputMatch[1], { data: inputMatch[2], format: inputMatch[3] });
    }
  }

  // Parse each example entry
  const entryRegex = /'([^']+)':\s*`([^`]+)`/g;
  let match;

  while ((match = entryRegex.exec(examplesMatch[1])) !== null) {
    const name = match[1];
    let code = match[2];

    // Strip comment lines
    code = code
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n")
      .trim();

    if (shouldSkip(code)) continue;

    // Get input data if available
    let input: unknown = null;
    const inputConfig = inputs.get(name);
    if (inputConfig) {
      // Skip CSV examples as they need special parsing
      if (inputConfig.format === "csv") {
        continue;
      }
      try {
        if (inputConfig.format === "json") {
          input = JSON.parse(inputConfig.data);
        }
      } catch {
        // Ignore parse errors
      }
    }

    examples.push({
      code,
      input,
      expected: undefined,
      line: 0, // Line not relevant for this source
      source: `playground:${name}`,
    });
  }

  return examples;
}

/**
 * Extract examples from blog posts (```elo fenced code blocks).
 * All blog examples are now self-contained and runnable.
 */
function extractBlogExamples(content: string, filename: string): Example[] {
  const examples: Example[] = [];

  const regex = /```elo\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    let code = match[1].trim();
    const matchIndex = match.index;

    // Calculate line number
    const beforeMatch = content.slice(0, matchIndex);
    const line = (beforeMatch.match(/\n/g) || []).length + 1;

    // Strip comment lines
    code = code
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n")
      .trim();

    if (shouldSkip(code)) continue;

    examples.push({
      code,
      input: null,
      expected: undefined,
      line,
      source: `blog:${filename}`,
    });
  }

  return examples;
}

/**
 * Run a single example test
 */
function testExample(example: Example): void {
  try {
    if (example.parseOnly) {
      // Only parse, don't evaluate
      parse(example.code);
      return;
    }

    const result = evaluate(example.code, example.input);

    // If we have an expected value, verify it
    if (example.expected !== undefined) {
      if (!resultsMatch(result, example.expected)) {
        assert.fail(
          `Result mismatch:\n` +
            `  Code: ${example.code.slice(0, 80)}...\n` +
            `  Input: ${JSON.stringify(example.input)}\n` +
            `  Expected: ${JSON.stringify(example.expected)}\n` +
            `  Actual: ${JSON.stringify(result)}`,
        );
      }
    }
    // Otherwise, just verify it evaluates without error
  } catch (e) {
    const error = e as Error;
    assert.fail(
      `Example failed:\n` +
        `  Source: ${example.source}:${example.line}\n` +
        `  Code: ${example.code}\n` +
        `  Input: ${JSON.stringify(example.input)}\n` +
        `  Error: ${error.message}`,
    );
  }
}

/**
 * Create a short description for a test
 */
function describeExample(example: Example): string {
  const codePreview = example.code.slice(0, 50).replace(/\n/g, " ");
  if (example.source.startsWith("playground:")) {
    return example.source.replace("playground:", "");
  }
  if (example.source.startsWith("blog:")) {
    return `${example.source}:${example.line}`;
  }
  return `line ${example.line}: ${codePreview}...`;
}

// ============================================================================
// Tests
// ============================================================================

describe("Website Examples", () => {
  describe("learn.astro", () => {
    const content = readFile("pages/learn.astro");
    const examples = extractAstroExamples(content, "learn.astro");

    for (const example of examples) {
      it(describeExample(example), () => testExample(example));
    }
  });

  describe("reference.astro", () => {
    const content = readFile("pages/reference.astro");
    const examples = extractAstroExamples(content, "reference.astro");

    for (const example of examples) {
      it(describeExample(example), () => testExample(example));
    }
  });

  describe("stdlib.astro", () => {
    const content = readFile("pages/stdlib.astro");
    const examples = extractStdlibExamples(content);

    for (const example of examples) {
      it(describeExample(example), () => testExample(example));
    }
  });

  describe("index.astro", () => {
    const content = readFile("pages/index.astro");
    const examples = extractAstroExamples(content, "index.astro");

    for (const example of examples) {
      it(describeExample(example), () => testExample(example));
    }
  });

  describe("playground examples", () => {
    const content = readFile("scripts/controllers/playground_controller.ts");
    const examples = extractPlaygroundExamples(content);

    for (const example of examples) {
      it(describeExample(example), () => testExample(example));
    }
  });

  describe("blog posts", () => {
    const blogFiles = getBlogFiles();

    for (const filename of blogFiles) {
      const content = readBlogFile(filename);
      const examples = extractBlogExamples(content, filename);

      if (examples.length === 0) continue;

      describe(filename, () => {
        for (const example of examples) {
          it(describeExample(example), () => testExample(example));
        }
      });
    }
  });
});
