const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function assertNumericLiteral(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(
      `Invalid numeric literal value: expected a finite number, got ${typeof value} (${JSON.stringify(value)})`
    );
  }
  return value;
}

/**
 * Render a float literal so that it stays a float in the target language.
 * `1.0` must not emit as `1`: in Ruby, Integer / Integer truncates.
 */
export function formatFloatLiteral(value: unknown): string {
  const n = assertNumericLiteral(value);
  // toFixed switches to exponential notation past 1e21, where the decimal
  // point is pointless anyway.
  return Number.isInteger(n) && Math.abs(n) < 1e21 ? `${n}.0` : `${n}`;
}

export function assertSafeIdentifier(name: unknown, context: string): string {
  if (typeof name !== 'string' || !IDENTIFIER_RE.test(name)) {
    throw new Error(
      `Invalid ${context}: must match ${IDENTIFIER_RE}, got ${JSON.stringify(name)}`
    );
  }
  return name;
}

/**
 * An IANA timezone name, restricted hard enough that no target needs to escape
 * it.
 *
 * The declared zone is the one compiler input that ends up inside a string
 * literal in all four emitted languages at once, and CLAUDE.md's rule is that
 * a value is never interpolated into target syntax. Rather than reach for four
 * different escapers, this whitelist admits no character any of them would
 * have to escape: no quote, no backslash, no `#` (Ruby interpolation), no
 * U+2028. What is left is exactly what a zone name is made of.
 *
 * Accepts `UTC`, `Europe/Brussels`, `America/Argentina/Buenos_Aires`,
 * `Etc/GMT+5`. Refuses everything else, including the empty string.
 */
const TIMEZONE_RE = /^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z0-9_+-]+)*$/;

export function assertSafeTimezone(name: unknown): string {
  if (typeof name !== 'string' || !TIMEZONE_RE.test(name)) {
    throw new Error(
      `Invalid timezone: must be an IANA zone name matching ${TIMEZONE_RE}, ` +
      `got ${JSON.stringify(name)}`
    );
  }
  return name;
}

export function assertSafeDatapathSegment(segment: unknown): string | number {
  if (typeof segment === 'number' && Number.isInteger(segment)) {
    return segment;
  }
  if (typeof segment === 'string' && IDENTIFIER_RE.test(segment)) {
    return segment;
  }
  throw new Error(
    `Invalid datapath segment: must be a safe identifier or integer index, got ${JSON.stringify(segment)}`
  );
}

/**
 * A PostgreSQL string constant for an arbitrary value. The single quote is
 * doubled and the backslash is doubled with an `E'...'` prefix, so the literal
 * cannot be escaped under either `standard_conforming_strings` setting. The
 * prefix is added only when it is needed, so a plain value keeps its bare
 * `'...'` form.
 */
export function sqlStringConstant(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\').replace(/'/g, "''")
    .replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r');
  const prefix = escaped !== value.replace(/'/g, "''") ? 'E' : '';
  return `${prefix}'${escaped}'`;
}
