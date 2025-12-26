/**
 * Simple syntax highlighter for Elo code
 *
 * Tokenizes Elo source and wraps tokens in spans with appropriate classes.
 */

// Token categories for highlighting
type HighlightCategory =
  | 'keyword'      // let, in, if, then, else, fn, and, or, not, assert
  | 'boolean'      // true, false
  | 'temporal'     // TODAY, NOW, SOW, EOW, etc.
  | 'number'       // 42, 3.14
  | 'string'       // 'hello'
  | 'date'         // D2024-01-15
  | 'datetime'     // T2024-01-15T10:30:00
  | 'duration'     // P1D, PT2H30M
  | 'operator'     // +, -, *, /, ==, ~>, .., etc.
  | 'punctuation'  // (, ), {, }, ,
  | 'function'     // function names like abs, round
  | 'variable'     // identifiers
  | 'property';    // after dot

interface Token {
  category: HighlightCategory;
  text: string;
}

const KEYWORDS = new Set(['let', 'in', 'if', 'then', 'else', 'fn', 'and', 'or', 'not', 'assert']);
const BOOLEANS = new Set(['true', 'false']);
const TEMPORAL_KEYWORDS = new Set([
  'NOW', 'TODAY', 'TOMORROW', 'YESTERDAY',
  'SOD', 'EOD', 'SOW', 'EOW', 'SOM', 'EOM', 'SOQ', 'EOQ', 'SOY', 'EOY'
]);
const STDLIB_FUNCTIONS = new Set([
  'abs', 'round', 'floor', 'ceil',
  'year', 'month', 'day', 'hour', 'minute',
  'length', 'upper', 'lower', 'trim', 'concat', 'substring', 'indexOf',
  'replace', 'replaceAll', 'startsWith', 'endsWith', 'contains', 'isEmpty',
  'padStart', 'padEnd', 'typeOf', 'isVal', 'orVal'
]);

/**
 * Tokenize Elo source code for syntax highlighting
 */
function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  const peek = (offset = 0) => source[pos + offset] || '';
  const advance = () => source[pos++] || '';
  const match = (pattern: RegExp) => {
    const rest = source.slice(pos);
    const m = rest.match(pattern);
    return m && m.index === 0 ? m[0] : null;
  };

  while (pos < source.length) {
    const ch = peek();

    // Whitespace - preserve it
    const ws = match(/^\s+/);
    if (ws) {
      tokens.push({ category: 'variable', text: ws }); // Use variable (unstyled) for whitespace
      pos += ws.length;
      continue;
    }

    // Comments
    if (ch === '#') {
      let comment = '';
      while (pos < source.length && peek() !== '\n') {
        comment += advance();
      }
      tokens.push({ category: 'variable', text: comment });
      continue;
    }

    // String literals
    if (ch === "'") {
      let str = advance(); // opening quote
      while (pos < source.length && peek() !== "'") {
        if (peek() === '\\') str += advance(); // escape
        str += advance();
      }
      if (peek() === "'") str += advance(); // closing quote
      tokens.push({ category: 'string', text: str });
      continue;
    }

    // Date literal (D followed by date)
    const dateMatch = match(/^D\d{4}-\d{2}-\d{2}(?!T)/);
    if (dateMatch) {
      tokens.push({ category: 'date', text: dateMatch });
      pos += dateMatch.length;
      continue;
    }

    // DateTime literal (D or T followed by datetime)
    const datetimeMatch = match(/^[DT]\d{4}-\d{2}-\d{2}T[\d:]+Z?/);
    if (datetimeMatch) {
      tokens.push({ category: 'datetime', text: datetimeMatch });
      pos += datetimeMatch.length;
      continue;
    }

    // Duration literal (P followed by duration spec)
    const durationMatch = match(/^P(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?/);
    if (durationMatch && durationMatch.length > 1) {
      tokens.push({ category: 'duration', text: durationMatch });
      pos += durationMatch.length;
      continue;
    }

    // Numbers
    const numMatch = match(/^\d+(\.\d+)?/);
    if (numMatch) {
      tokens.push({ category: 'number', text: numMatch });
      pos += numMatch.length;
      continue;
    }

    // Identifiers and keywords
    const idMatch = match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (idMatch) {
      let category: HighlightCategory = 'variable';
      if (KEYWORDS.has(idMatch)) {
        category = 'keyword';
      } else if (BOOLEANS.has(idMatch)) {
        category = 'boolean';
      } else if (TEMPORAL_KEYWORDS.has(idMatch)) {
        category = 'temporal';
      } else if (STDLIB_FUNCTIONS.has(idMatch)) {
        category = 'function';
      }
      tokens.push({ category, text: idMatch });
      pos += idMatch.length;
      continue;
    }

    // Multi-character operators
    const ops = ['~>', '...',  '..', '<=', '>=', '==', '!=', '&&', '||'];
    let foundOp = false;
    for (const op of ops) {
      if (source.slice(pos, pos + op.length) === op) {
        tokens.push({ category: 'operator', text: op });
        pos += op.length;
        foundOp = true;
        break;
      }
    }
    if (foundOp) continue;

    // Single-character operators
    if ('+-*/%^<>=!|'.includes(ch)) {
      tokens.push({ category: 'operator', text: advance() });
      continue;
    }

    // Punctuation
    if ('(){},:'.includes(ch)) {
      tokens.push({ category: 'punctuation', text: advance() });
      continue;
    }

    // Dot - could be property access or part of range
    if (ch === '.') {
      tokens.push({ category: 'operator', text: advance() });
      // Check if next is an identifier (property access)
      const propMatch = match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
      if (propMatch) {
        tokens.push({ category: 'property', text: propMatch });
        pos += propMatch.length;
      }
      continue;
    }

    // Unknown character - just pass through
    tokens.push({ category: 'variable', text: advance() });
  }

  return tokens;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Highlight Elo source code, returning HTML with span-wrapped tokens
 */
export function highlight(source: string): string {
  const tokens = tokenize(source);
  return tokens.map(token => {
    const escaped = escapeHtml(token.text);
    // Don't wrap whitespace or plain variables
    if (token.category === 'variable' && /^\s*$/.test(token.text)) {
      return escaped;
    }
    if (token.category === 'variable') {
      return `<span class="hl-var">${escaped}</span>`;
    }
    return `<span class="hl-${token.category}">${escaped}</span>`;
  }).join('');
}

/**
 * Highlight all elements matching a selector
 */
export function highlightAll(selector: string): void {
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    const code = el.textContent || '';
    el.innerHTML = highlight(code);
  });
}

// =============================================================================
// JavaScript/TypeScript Highlighter
// =============================================================================

type JSCategory =
  | 'keyword'
  | 'boolean'
  | 'number'
  | 'string'
  | 'comment'
  | 'operator'
  | 'punctuation'
  | 'function'
  | 'variable'
  | 'property'
  | 'type';

interface JSToken {
  category: JSCategory;
  text: string;
}

const JS_KEYWORDS = new Set([
  'import', 'export', 'from', 'default', 'const', 'let', 'var',
  'function', 'return', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally',
  'throw', 'new', 'class', 'extends', 'static', 'async', 'await',
  'typeof', 'instanceof', 'in', 'of', 'void', 'delete', 'this', 'super'
]);

const JS_TYPES = new Set([
  'string', 'number', 'boolean', 'undefined', 'null', 'object',
  'Array', 'Object', 'String', 'Number', 'Boolean', 'Function',
  'Promise', 'Map', 'Set', 'Date', 'RegExp', 'Error'
]);

const JS_BOOLEANS = new Set(['true', 'false', 'null', 'undefined']);

/**
 * Tokenize JavaScript/TypeScript source code
 */
function tokenizeJS(source: string): JSToken[] {
  const tokens: JSToken[] = [];
  let pos = 0;

  const peek = (offset = 0) => source[pos + offset] || '';
  const advance = () => source[pos++] || '';
  const match = (pattern: RegExp) => {
    const rest = source.slice(pos);
    const m = rest.match(pattern);
    return m && m.index === 0 ? m[0] : null;
  };

  while (pos < source.length) {
    const ch = peek();

    // Whitespace
    const ws = match(/^\s+/);
    if (ws) {
      tokens.push({ category: 'variable', text: ws });
      pos += ws.length;
      continue;
    }

    // Single-line comment
    if (ch === '/' && peek(1) === '/') {
      let comment = '';
      while (pos < source.length && peek() !== '\n') {
        comment += advance();
      }
      tokens.push({ category: 'comment', text: comment });
      continue;
    }

    // Multi-line comment
    if (ch === '/' && peek(1) === '*') {
      let comment = advance() + advance(); // /*
      while (pos < source.length && !(peek() === '*' && peek(1) === '/')) {
        comment += advance();
      }
      if (pos < source.length) {
        comment += advance() + advance(); // */
      }
      tokens.push({ category: 'comment', text: comment });
      continue;
    }

    // String literals (single, double, backtick)
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      let str = advance();
      while (pos < source.length && peek() !== quote) {
        if (peek() === '\\') str += advance();
        str += advance();
      }
      if (peek() === quote) str += advance();
      tokens.push({ category: 'string', text: str });
      continue;
    }

    // Numbers
    const numMatch = match(/^\d+(\.\d+)?([eE][+-]?\d+)?/);
    if (numMatch) {
      tokens.push({ category: 'number', text: numMatch });
      pos += numMatch.length;
      continue;
    }

    // Identifiers and keywords
    const idMatch = match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
    if (idMatch) {
      let category: JSCategory = 'variable';
      if (JS_KEYWORDS.has(idMatch)) {
        category = 'keyword';
      } else if (JS_BOOLEANS.has(idMatch)) {
        category = 'boolean';
      } else if (JS_TYPES.has(idMatch)) {
        category = 'type';
      } else if (peek() === '(') {
        category = 'function';
      }
      tokens.push({ category, text: idMatch });
      pos += idMatch.length;
      continue;
    }

    // Arrow function
    if (ch === '=' && peek(1) === '>') {
      tokens.push({ category: 'operator', text: '=>' });
      pos += 2;
      continue;
    }

    // Multi-character operators
    const ops = ['===', '!==', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '...'];
    let foundOp = false;
    for (const op of ops) {
      if (source.slice(pos, pos + op.length) === op) {
        tokens.push({ category: 'operator', text: op });
        pos += op.length;
        foundOp = true;
        break;
      }
    }
    if (foundOp) continue;

    // Single-character operators
    if ('+-*/%<>=!&|?:'.includes(ch)) {
      tokens.push({ category: 'operator', text: advance() });
      continue;
    }

    // Punctuation
    if ('(){}[],.;'.includes(ch)) {
      tokens.push({ category: 'punctuation', text: advance() });
      continue;
    }

    // Property access
    if (ch === '.') {
      tokens.push({ category: 'punctuation', text: advance() });
      const propMatch = match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
      if (propMatch) {
        tokens.push({ category: 'property', text: propMatch });
        pos += propMatch.length;
      }
      continue;
    }

    // Type annotations (simplified)
    if (ch === '<') {
      let depth = 1;
      let typeAnnotation = advance();
      while (pos < source.length && depth > 0) {
        const c = advance();
        typeAnnotation += c;
        if (c === '<') depth++;
        if (c === '>') depth--;
      }
      tokens.push({ category: 'type', text: typeAnnotation });
      continue;
    }

    // Unknown
    tokens.push({ category: 'variable', text: advance() });
  }

  return tokens;
}

/**
 * Highlight JavaScript/TypeScript source code
 */
export function highlightJS(source: string): string {
  const tokens = tokenizeJS(source);
  return tokens.map(token => {
    const escaped = escapeHtml(token.text);
    if (token.category === 'variable' && /^\s*$/.test(token.text)) {
      return escaped;
    }
    if (token.category === 'variable') {
      return `<span class="hl-js-var">${escaped}</span>`;
    }
    return `<span class="hl-js-${token.category}">${escaped}</span>`;
  }).join('');
}

/**
 * Highlight all JS/TS code blocks matching a selector
 */
export function highlightAllJS(selector: string): void {
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    const code = el.textContent || '';
    el.innerHTML = highlightJS(code);
  });
}
