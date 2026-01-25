/**
 * Pluggable data format adapters for Elo.
 *
 * This module defines interfaces for parsing and serializing different data formats
 * (JSON, CSV, XLSX, etc.). Users can provide their own implementations using
 * libraries like PapaParse or SheetJS.
 *
 * @example
 * // Using the built-in CSV adapter
 * import { defaultFormats } from '@enspirit/elo';
 * const data = defaultFormats.csv.parse('name,age\nAlice,30');
 *
 * @example
 * // Providing a custom adapter with PapaParse
 * import Papa from 'papaparse';
 * import { FormatAdapter } from '@enspirit/elo';
 *
 * const csvAdapter: FormatAdapter = {
 *   parse: (s) => Papa.parse(s, { header: true }).data,
 *   serialize: (v) => Papa.unparse(v)
 * };
 */

import { parseCSV, toCSV } from "./csv";
import { toEloCode } from "./serialize";

/**
 * Interface for a data format adapter.
 * Implement this to add support for custom data formats.
 */
export interface FormatAdapter {
  /**
   * Parse a string into a JavaScript value.
   * @param input - The string to parse
   * @returns The parsed value
   * @throws Error if parsing fails
   */
  parse(input: string): unknown;

  /**
   * Serialize a JavaScript value to a string.
   * @param value - The value to serialize
   * @returns The serialized string
   * @throws Error if the value cannot be serialized to this format
   */
  serialize(value: unknown): string;
}

/**
 * Registry of format adapters by name.
 * Extend this to add custom formats.
 */
export interface FormatRegistry {
  json: FormatAdapter;
  csv: FormatAdapter;
  elo: FormatAdapter;
  [key: string]: FormatAdapter | undefined;
}

/**
 * Built-in JSON format adapter.
 */
export const jsonAdapter: FormatAdapter = {
  parse: (input: string): unknown => JSON.parse(input),
  serialize: (value: unknown): string => JSON.stringify(value),
};

/**
 * Built-in CSV format adapter.
 * CSV data is parsed as an array of objects with string values.
 * For output, requires an array of objects or a single object.
 */
export const csvAdapter: FormatAdapter = {
  parse: (input: string): unknown => parseCSV(input),
  serialize: (value: unknown): string => toCSV(value),
};

/**
 * Built-in Elo code format adapter.
 * This format is output-only (serialize only).
 * Parsing Elo code requires the full parser.
 */
export const eloAdapter: FormatAdapter = {
  parse: (_input: string): unknown => {
    throw new Error(
      "Elo format is output-only. Use the parser for Elo expressions.",
    );
  },
  serialize: (value: unknown): string => toEloCode(value),
};

/**
 * Default format registry with built-in adapters.
 * Use this as-is or extend with custom adapters.
 *
 * @example
 * // Extend with a custom XLSX adapter
 * import XLSX from 'xlsx';
 *
 * const formats = {
 *   ...defaultFormats,
 *   xlsx: {
 *     parse: (s) => XLSX.read(s, { type: 'string' }),
 *     serialize: (v) => XLSX.write(v, { type: 'string' })
 *   }
 * };
 */
export const defaultFormats: FormatRegistry = {
  json: jsonAdapter,
  csv: csvAdapter,
  elo: eloAdapter,
};

/**
 * Helper to get a format adapter by name.
 * @param formats - The format registry to search
 * @param name - The format name (e.g., 'json', 'csv')
 * @returns The adapter
 * @throws Error if format is not found
 */
export function getFormat(
  formats: FormatRegistry,
  name: string,
): FormatAdapter {
  const adapter = formats[name];
  if (!adapter) {
    const available = Object.keys(formats).join(", ");
    throw new Error(`Unknown format '${name}'. Available: ${available}`);
  }
  return adapter;
}
