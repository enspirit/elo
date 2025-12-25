/**
 * Prelude content for all target languages.
 * This is the single source of truth for preludes used by both CLI and web.
 *
 * Note: JavaScript prelude only contains library requires.
 * Runtime helpers (kAdd, kSub, etc.) are now embedded directly in the
 * compiled output as needed, wrapped in an IIFE.
 */

export type Target = 'javascript' | 'ruby' | 'sql';

const javascriptPrelude = `const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const isoWeek = require('dayjs/plugin/isoWeek');
const quarterOfYear = require('dayjs/plugin/quarterOfYear');
const utc = require('dayjs/plugin/utc');
dayjs.extend(duration);
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);
dayjs.extend(utc);`;

const rubyPrelude = `require 'date'
require 'active_support/all'`;

const sqlPrelude = `-- No prelude needed for SQL`;

const preludes: Record<Target, string> = {
  javascript: javascriptPrelude,
  ruby: rubyPrelude,
  sql: sqlPrelude
};

/**
 * Get the prelude content for a given target language.
 */
export function getPrelude(target: Target): string {
  return preludes[target];
}
