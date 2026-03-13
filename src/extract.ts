/**
 * Extract template parsing for Elo's extract() function
 *
 * Parses mustache-style templates like 'From: {{name}} <{{email}}>'
 * into literal parts and field names for pattern matching.
 */

/**
 * Parsed extract template
 */
export interface ExtractTemplate {
  literals: string[];  // Literal parts between (and around) placeholders
  fields: string[];    // Field names from {{name}} placeholders
}

/**
 * Parse an extract template string into literals and field names.
 * Throws on invalid templates.
 *
 * For 'From: {{name}} <{{email}}>':
 *   literals = ['From: ', ' <', '>']
 *   fields = ['name', 'email']
 */
export function parseExtractTemplate(template: string): ExtractTemplate {
  const literals: string[] = [];
  const fields: string[] = [];
  let pos = 0;

  while (pos < template.length) {
    const start = template.indexOf('{{', pos);
    if (start === -1) {
      // Rest is literal
      literals.push(template.slice(pos));
      break;
    }

    // Add literal before {{
    literals.push(template.slice(pos, start));

    const end = template.indexOf('}}', start + 2);
    if (end === -1) {
      throw new Error("Unclosed '{{' in extract template");
    }

    const field = template.slice(start + 2, end);
    if (!field || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
      throw new Error(`Invalid field name '${field}' in extract template`);
    }

    if (fields.includes(field)) {
      throw new Error(`Duplicate field name '{{${field}}}' in extract template`);
    }

    fields.push(field);
    pos = end + 2;
  }

  // If we ended exactly after }}, add empty trailing literal
  if (literals.length === fields.length) {
    literals.push('');
  }

  if (fields.length === 0) {
    throw new Error("Extract template must contain at least one '{{field}}' placeholder");
  }

  // Check for adjacent placeholders (literals between fields must be non-empty)
  for (let i = 1; i < literals.length - 1; i++) {
    if (literals[i] === '') {
      throw new Error(
        `Adjacent placeholders '{{${fields[i-1]}}}{{${fields[i]}}}' in extract template. ` +
        `Add a literal separator between them.`
      );
    }
  }

  return { literals, fields };
}

/**
 * Escape a string for use in a regular expression.
 * Also converts control characters (\n, \t, \r) to their escape sequences
 * so the pattern is safe for embedding in regex literals.
 */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r');
}

/**
 * Build a regex pattern string from an extract template.
 * Uses lazy (.*?) matching between literal separators.
 * The last capture group uses greedy (.*) if there's no trailing literal.
 */
export function buildExtractPattern(template: ExtractTemplate): string {
  let pattern = '';
  const lastIdx = template.fields.length - 1;
  for (let i = 0; i <= lastIdx; i++) {
    pattern += escapeRegex(template.literals[i]);
    if (i === lastIdx && template.literals[i + 1] === '') {
      // Last placeholder with no trailing literal: greedy match anchored to end
      pattern += '(.*)$';
    } else {
      pattern += '(.*?)';
    }
  }
  // Add trailing literal
  pattern += escapeRegex(template.literals[template.literals.length - 1]);
  return pattern;
}
