import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse } from '../../src/parser';

/**
 * This test ensures that all code examples on the website actually compile.
 * It extracts example-code blocks from .astro pages and tries to parse them.
 */

const webDir = path.join(process.cwd(), 'web/src');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(webDir, relativePath), 'utf-8');
}

/**
 * Extract example code blocks from an Astro page.
 * Matches content inside <pre class="example-code">...</pre> or <code class="example-code">...</code>
 */
function extractExamples(content: string): { code: string; line: number }[] {
  const examples: { code: string; line: number }[] = [];

  // Match both <pre class="example-code"> and <code class="example-code">
  const regex = /<(?:pre|code)[^>]*class="example-code"[^>]*>([^<]+)<\/(?:pre|code)>/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const code = match[1];
    // Calculate line number by counting newlines before this match
    const beforeMatch = content.slice(0, match.index);
    const line = (beforeMatch.match(/\n/g) || []).length + 1;

    // Decode HTML entities
    const decoded = code
      .replace(/&#123;/g, '{')
      .replace(/&#125;/g, '}')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    examples.push({ code: decoded, line });
  }

  return examples;
}

/**
 * Check if an example should be skipped (e.g., contains ??? placeholders)
 */
function shouldSkip(code: string): boolean {
  // Skip exercise templates with ??? placeholders
  if (code.includes('???')) return true;
  return false;
}

describe('Website Example Validation', () => {

  describe('learn.astro examples', () => {
    const learnContent = readFile('pages/learn.astro');
    const examples = extractExamples(learnContent);

    for (const { code, line } of examples) {
      if (shouldSkip(code)) continue;

      it(`line ${line}: ${code.slice(0, 50).replace(/\n/g, ' ')}...`, () => {
        try {
          parse(code);
        } catch (e) {
          const error = e as Error;
          assert.fail(
            `Example at line ${line} failed to parse:\n` +
            `Code: ${code}\n` +
            `Error: ${error.message}`
          );
        }
      });
    }
  });

  describe('docs.astro examples', () => {
    const docsContent = readFile('pages/docs.astro');
    const examples = extractExamples(docsContent);

    for (const { code, line } of examples) {
      if (shouldSkip(code)) continue;

      it(`line ${line}: ${code.slice(0, 50).replace(/\n/g, ' ')}...`, () => {
        try {
          parse(code);
        } catch (e) {
          const error = e as Error;
          assert.fail(
            `Example at line ${line} failed to parse:\n` +
            `Code: ${code}\n` +
            `Error: ${error.message}`
          );
        }
      });
    }
  });

  describe('stdlib.astro examples', () => {
    const stdlibContent = readFile('pages/stdlib.astro');
    const examples = extractExamples(stdlibContent);

    for (const { code, line } of examples) {
      if (shouldSkip(code)) continue;

      it(`line ${line}: ${code.slice(0, 50).replace(/\n/g, ' ')}...`, () => {
        try {
          parse(code);
        } catch (e) {
          const error = e as Error;
          assert.fail(
            `Example at line ${line} failed to parse:\n` +
            `Code: ${code}\n` +
            `Error: ${error.message}`
          );
        }
      });
    }
  });

  describe('index.astro examples', () => {
    const indexContent = readFile('pages/index.astro');
    const examples = extractExamples(indexContent);

    for (const { code, line } of examples) {
      if (shouldSkip(code)) continue;

      it(`line ${line}: ${code.slice(0, 50).replace(/\n/g, ' ')}...`, () => {
        try {
          parse(code);
        } catch (e) {
          const error = e as Error;
          assert.fail(
            `Example at line ${line} failed to parse:\n` +
            `Code: ${code}\n` +
            `Error: ${error.message}`
          );
        }
      });
    }
  });
});
