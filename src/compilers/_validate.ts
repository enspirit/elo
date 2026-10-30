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
