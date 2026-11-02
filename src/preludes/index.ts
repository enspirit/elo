/**
 * Prelude content for all target languages.
 * This is the single source of truth for preludes used by both CLI and web.
 *
 * Note: JavaScript prelude only contains library requires.
 * Runtime helpers (kAdd, kSub, etc.) are now embedded directly in the
 * compiled output as needed, wrapped in an IIFE.
 *
 * Note: the JavaScript, Ruby and Python preludes are *prepended* to the
 * compiled expression; SQL's has to be *installed in the database once*,
 * because a pure SQL expression cannot define a function. See
 * `isPreludePrependable`.
 */

export type Target = 'javascript' | 'ruby' | 'sql' | 'python';

const javascriptPrelude = `const { DateTime, Duration, Interval } = require('luxon');`;

const rubyPrelude = `require 'date'
require 'active_support/all'`;

import { sqlPrelude } from './sql';
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

/**
 * True when the prelude may be prepended to a compiled expression.
 *
 * False for SQL only: its prelude is a set of `CREATE OR REPLACE FUNCTION`
 * statements, which a pure SQL expression has nowhere to put. A host installs
 * it in the database once instead — `eloc --prelude-only -t sql | psql`.
 */
export function isPreludePrependable(target: Target): boolean {
  return target !== 'sql';
}
