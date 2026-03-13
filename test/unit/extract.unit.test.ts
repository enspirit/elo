import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseExtractTemplate, buildExtractPattern, escapeRegex } from '../../src/extract';

describe('parseExtractTemplate', () => {
  it('parses a simple template with one field', () => {
    const result = parseExtractTemplate('Hello {{name}}!');
    assert.deepStrictEqual(result.literals, ['Hello ', '!']);
    assert.deepStrictEqual(result.fields, ['name']);
  });

  it('parses a template with multiple fields', () => {
    const result = parseExtractTemplate('From: {{name}} <{{email}}>');
    assert.deepStrictEqual(result.literals, ['From: ', ' <', '>']);
    assert.deepStrictEqual(result.fields, ['name', 'email']);
  });

  it('parses a template with no trailing literal', () => {
    const result = parseExtractTemplate('Name: {{name}}');
    assert.deepStrictEqual(result.literals, ['Name: ', '']);
    assert.deepStrictEqual(result.fields, ['name']);
  });

  it('parses a template with leading literal only', () => {
    const result = parseExtractTemplate('{{first}} {{last}}');
    assert.deepStrictEqual(result.literals, ['', ' ', '']);
    assert.deepStrictEqual(result.fields, ['first', 'last']);
  });

  it('allows underscores in field names', () => {
    const result = parseExtractTemplate('{{first_name}} {{last_name}}');
    assert.deepStrictEqual(result.fields, ['first_name', 'last_name']);
  });

  it('throws on unclosed placeholder', () => {
    assert.throws(
      () => parseExtractTemplate('Hello {{name'),
      /Unclosed '\{\{'/
    );
  });

  it('throws on empty field name', () => {
    assert.throws(
      () => parseExtractTemplate('Hello {{}}!'),
      /Invalid field name/
    );
  });

  it('throws on invalid field name', () => {
    assert.throws(
      () => parseExtractTemplate('Hello {{123}}!'),
      /Invalid field name/
    );
  });

  it('throws on duplicate field names', () => {
    assert.throws(
      () => parseExtractTemplate('{{a}} and {{a}}'),
      /Duplicate field name '\{\{a\}\}'/
    );
  });

  it('throws on adjacent placeholders', () => {
    assert.throws(
      () => parseExtractTemplate('{{a}}{{b}}'),
      /Adjacent placeholders/
    );
  });

  it('throws on no placeholders', () => {
    assert.throws(
      () => parseExtractTemplate('just a string'),
      /at least one/
    );
  });
});

describe('escapeRegex', () => {
  it('escapes special regex characters', () => {
    assert.strictEqual(escapeRegex('hello.world'), 'hello\\.world');
    assert.strictEqual(escapeRegex('a+b'), 'a\\+b');
    assert.strictEqual(escapeRegex('(test)'), '\\(test\\)');
    assert.strictEqual(escapeRegex('$100'), '\\$100');
  });

  it('leaves normal characters unchanged', () => {
    assert.strictEqual(escapeRegex('hello world'), 'hello world');
  });

  it('escapes newline characters', () => {
    assert.strictEqual(escapeRegex('line1\nline2'), 'line1\\nline2');
  });

  it('escapes tab characters', () => {
    assert.strictEqual(escapeRegex('col1\tcol2'), 'col1\\tcol2');
  });

  it('escapes carriage return characters', () => {
    assert.strictEqual(escapeRegex('line1\rline2'), 'line1\\rline2');
  });
});

describe('buildExtractPattern', () => {
  it('builds a lazy pattern for fields with trailing literal', () => {
    const template = parseExtractTemplate('From: {{name}} <{{email}}>');
    assert.strictEqual(buildExtractPattern(template), 'From: (.*?) <(.*?)>');
  });

  it('uses greedy match for last field without trailing literal', () => {
    const template = parseExtractTemplate('Name: {{name}}');
    assert.strictEqual(buildExtractPattern(template), 'Name: (.*)$');
  });

  it('escapes special characters in literals', () => {
    const template = parseExtractTemplate('price: ${{amount}} (USD)');
    assert.strictEqual(buildExtractPattern(template), 'price: \\$(.*?) \\(USD\\)');
  });

  it('handles template with only a placeholder', () => {
    const template = parseExtractTemplate('{{value}}');
    assert.strictEqual(buildExtractPattern(template), '(.*)$');
  });

  it('escapes newlines in literal parts', () => {
    const template = parseExtractTemplate('Name: {{name}}\nEmail: {{email}}');
    assert.strictEqual(buildExtractPattern(template), 'Name: (.*?)\\nEmail: (.*)$');
  });
});
