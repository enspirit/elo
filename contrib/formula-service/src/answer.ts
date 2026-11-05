/**
 * How a formula's answer becomes JSON.
 *
 * `Output` says what the answer is, and the answer is a *runtime* value: on
 * JavaScript, an Elo `Date` is a luxon `DateTime`, and so is a `Datetime`. The
 * two are indistinguishable by inspection, which is why this walk is driven by
 * the declared type rather than by the value — a declared `Date` is written
 * `"2026-01-25"`, never `"2026-01-25T00:00:00.000+01:00"`, whose offset is the
 * server's timezone and not the formula's business.
 *
 * It is its own module, with no import at all, because the thing that runs it
 * is the sandbox worker: a `require` of the compiler there would cost a
 * compiler load per request, and buy nothing.
 */

/**
 * What to write a value as. Derived from `Output` once, at boot, by
 * `answerShape` in `./bundle` — and passed to the worker as data, since that
 * is all it is.
 */
export type AnswerShape =
  /** A number, a string, a boolean, null — or a type with no one writing. */
  | { kind: 'value' }
  | { kind: 'date' }
  | { kind: 'datetime' }
  | { kind: 'duration' }
  | { kind: 'list'; of: AnswerShape }
  | { kind: 'object'; properties: Record<string, AnswerShape> };

/** Luxon's temporal values, duck-typed: the worker has no types to check. */
interface Temporal {
  toISODate?: () => string | null;
  toISO?: () => string | null;
}

/**
 * The answer as JSON-shaped data: plain objects, arrays, strings, numbers,
 * booleans and null, ready for `JSON.stringify`.
 *
 * A value the shape says nothing about is passed through — `JSON.stringify`
 * then applies whatever `toJSON` it has, which is what Elo's own `json`
 * format does. So an `Any` holding a date keeps the full ISO form; a declared
 * one does not.
 */
export function toJson(value: unknown, shape: AnswerShape): unknown {
  if (value === null || value === undefined) return null;
  switch (shape.kind) {
    case 'date':
      return (value as Temporal).toISODate?.() ?? value;
    case 'datetime':
    case 'duration':
      return (value as Temporal).toISO?.() ?? value;
    case 'list':
      return Array.isArray(value) ? value.map(item => toJson(item, shape.of)) : value;
    case 'object': {
      if (typeof value !== 'object' || Array.isArray(value)) return value;
      const written: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        written[key] = toJson(item, shape.properties[key] ?? { kind: 'value' });
      }
      return written;
    }
    case 'value':
      return value;
  }
}
