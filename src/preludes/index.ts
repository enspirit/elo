/**
 * Prelude content for all target languages.
 * This is the single source of truth for preludes used by both CLI and web.
 *
 * Note: JavaScript prelude only contains library requires.
 * Runtime helpers (kAdd, kSub, etc.) are now embedded directly in the
 * compiled output as needed, wrapped in an IIFE.
 */

export type Target = 'javascript' | 'ruby' | 'sql' | 'python';

const javascriptPrelude = `const { DateTime, Duration, Interval } = require('luxon');`;

const rubyPrelude = `require 'date'
require 'active_support/all'`;

const sqlPrelude = `-- No prelude needed for SQL`;

import { PY_HELPERS } from '../runtime';

// Build Python prelude with imports and all helper functions
const pythonImports = Object.entries(PY_HELPERS)
  .filter(([name]) => name.startsWith('_import_'))
  .map(([, code]) => code)
  .join('\n');
const pythonFunctions = Object.entries(PY_HELPERS)
  .filter(([name]) => !name.startsWith('_import_'))
  .map(([, code]) => code)
  .join('\n');
const pythonPrelude = pythonImports + '\n' + pythonFunctions;

const preludes: Record<Target, string> = {
  javascript: javascriptPrelude,
  ruby: rubyPrelude,
  sql: sqlPrelude,
  python: pythonPrelude
};

/**
 * Get the prelude content for a given target language.
 */
export function getPrelude(target: Target): string {
  return preludes[target];
}
