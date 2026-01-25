/**
 * Prelude content for all target languages.
 * This is the single source of truth for preludes used by both CLI and web.
 *
 * Note: JavaScript prelude only contains library requires.
 * Runtime helpers (kAdd, kSub, etc.) are now embedded directly in the
 * compiled output as needed, wrapped in an IIFE.
 */

export type Target = "javascript";

const javascriptPrelude = `const { DateTime, Duration } = require('luxon');`;

const preludes: Record<Target, string> = {
  javascript: javascriptPrelude,
};

/**
 * Get the prelude content for a given target language.
 */
export function getPrelude(target: Target): string {
  return preludes[target];
}
