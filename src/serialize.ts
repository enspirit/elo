/**
 * Serialize JavaScript runtime values back to Elo code representation.
 *
 * This is useful for displaying execution results in a readable Elo-native format.
 */

/**
 * DateTime type from Luxon (or compatible interface)
 */
interface DateTimeInterface {
  isValid: boolean;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  offset: number;
  zoneName: string | null;
  toISO(): string | null;
  toISODate(): string | null;
}

/**
 * Duration type from Luxon (or compatible interface)
 */
interface DurationInterface {
  isValid: boolean;
  toISO(): string | null;
}

/**
 * Type guard for Luxon DateTime
 */
function isDateTime(value: unknown): value is DateTimeInterface {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.toISO === "function" &&
    typeof obj.toISODate === "function" &&
    typeof obj.isValid === "boolean"
  );
}

/**
 * Type guard for Luxon Duration
 */
function isDuration(value: unknown): value is DurationInterface {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  // Duration has toISO but not toISODate
  return (
    typeof obj.toISO === "function" &&
    typeof obj.toISODate !== "function" &&
    typeof obj.isValid === "boolean"
  );
}

/**
 * Check if a DateTime represents a date-only value (midnight with no offset issues).
 * Date literals in Elo are rendered as D2024-01-15, while datetimes include time.
 */
function isDateOnly(dt: DateTimeInterface): boolean {
  return (
    dt.hour === 0 && dt.minute === 0 && dt.second === 0 && dt.millisecond === 0
  );
}

/**
 * Check if a string is a valid Elo identifier (can be used as object key without quotes).
 * Valid identifiers start with a letter or underscore, followed by letters, digits, or underscores.
 */
function isValidIdentifier(s: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s);
}

/**
 * Escape a string for use in Elo single-quoted string literal.
 * Only single quotes and backslashes need escaping.
 */
function escapeString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Convert a JavaScript runtime value to its Elo code representation.
 *
 * @param value - The JavaScript value to serialize
 * @returns A string containing the Elo code representation
 *
 * @example
 * toEloCode(null)                // => "null"
 * toEloCode(true)                // => "true"
 * toEloCode(42)                  // => "42"
 * toEloCode(3.14)                // => "3.14"
 * toEloCode('hello')             // => "'hello'"
 * toEloCode([1, 2, 3])           // => "[1, 2, 3]"
 * toEloCode({name: 'Alice'})     // => "{name: 'Alice'}"
 * // DateTime objects render as D-prefixed ISO strings
 * // Duration objects render as ISO duration strings
 */
export function toEloCode(value: unknown): string {
  // Handle null and undefined
  if (value === null || value === undefined) {
    return "null";
  }

  // Handle booleans
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  // Handle numbers
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      // NaN, Infinity, -Infinity don't have Elo representations
      return "null";
    }
    return String(value);
  }

  // Handle strings
  if (typeof value === "string") {
    return `'${escapeString(value)}'`;
  }

  // Handle Luxon Duration (check before DateTime since both have toISO)
  if (isDuration(value)) {
    const iso = value.toISO();
    if (iso === null || !value.isValid) {
      return "null";
    }
    return iso;
  }

  // Handle Luxon DateTime
  if (isDateTime(value)) {
    if (!value.isValid) {
      return "null";
    }
    if (isDateOnly(value)) {
      // Render as date literal: D2024-01-15
      const dateStr = value.toISODate();
      return dateStr ? `D${dateStr}` : "null";
    }
    // Render as datetime literal: D2024-01-15T10:30:00Z
    const isoStr = value.toISO();
    return isoStr ? `D${isoStr}` : "null";
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const elements = value.map((elem) => toEloCode(elem));
    return `[${elements.join(", ")}]`;
  }

  // Handle functions (no direct Elo representation)
  if (typeof value === "function") {
    return "<function>";
  }

  // Handle plain objects
  if (typeof value === "object") {
    const entries = Object.entries(value);
    const props = entries.map(([key, val]) => {
      // Use identifier syntax if valid, otherwise quote the key
      const keyStr = isValidIdentifier(key) ? key : `'${escapeString(key)}'`;
      return `${keyStr}: ${toEloCode(val)}`;
    });
    return `{${props.join(", ")}}`;
  }

  // Fallback for unknown types
  return "null";
}
