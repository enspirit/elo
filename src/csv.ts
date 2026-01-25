/**
 * CSV parsing and serialization utilities for Elo.
 *
 * CSV data is represented as an array of objects, where:
 * - Headers become object keys
 * - All values are kept as strings (Elo's type coercion handles conversion)
 */

/**
 * Parse a CSV string into an array of objects.
 * First row is treated as headers (keys for each row object).
 * All values are kept as strings.
 *
 * @param csv - The CSV string to parse
 * @returns An array of objects, one per data row
 *
 * @example
 * parseCSV('name,age\nAlice,30\nBob,25')
 * // => [{name: 'Alice', age: '30'}, {name: 'Bob', age: '25'}]
 */
export function parseCSV(csv: string): Record<string, string>[] {
  const lines = parseCSVLines(csv);
  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0];
  const result: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    result.push(row);
  }

  return result;
}

/**
 * Parse CSV into a 2D array of strings (rows × columns).
 * Handles quoted values, escaped quotes, and multi-line values.
 */
function parseCSVLines(csv: string): string[][] {
  const result: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;
  let i = 0;

  while (i < csv.length) {
    const char = csv[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote
        if (csv[i + 1] === '"') {
          currentValue += '"';
          i += 2;
        } else {
          // End of quoted value
          inQuotes = false;
          i++;
        }
      } else {
        currentValue += char;
        i++;
      }
    } else {
      if (char === '"') {
        // Start of quoted value
        inQuotes = true;
        i++;
      } else if (char === ",") {
        // Field separator
        currentRow.push(currentValue);
        currentValue = "";
        i++;
      } else if (char === "\n") {
        // End of line
        currentRow.push(currentValue);
        if (
          currentRow.length > 0 &&
          !(currentRow.length === 1 && currentRow[0] === "")
        ) {
          result.push(currentRow);
        }
        currentRow = [];
        currentValue = "";
        i++;
      } else if (char === "\r") {
        // Handle \r\n
        i++;
      } else {
        currentValue += char;
        i++;
      }
    }
  }

  // Handle last value/row
  if (currentValue || currentRow.length > 0) {
    currentRow.push(currentValue);
    if (
      currentRow.length > 0 &&
      !(currentRow.length === 1 && currentRow[0] === "")
    ) {
      result.push(currentRow);
    }
  }

  return result;
}

/**
 * Serialize a value to CSV format.
 *
 * For arrays of objects, the first object's keys become headers.
 * For a single object, it becomes a single-row CSV with headers.
 * For other values, an error is thrown.
 *
 * @param value - The value to serialize (array of objects, or single object)
 * @returns A CSV string
 *
 * @example
 * toCSV([{name: 'Alice', age: 30}, {name: 'Bob', age: 25}])
 * // => 'name,age\nAlice,30\nBob,25'
 *
 * toCSV({name: 'Alice', age: 30})
 * // => 'name,age\nAlice,30'
 */
export function toCSV(value: unknown): string {
  // Handle array of objects
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "";
    }

    // Get headers from first object
    const first = value[0];
    if (typeof first !== "object" || first === null || Array.isArray(first)) {
      throw new Error("CSV output requires an array of objects");
    }

    const headers = Object.keys(first);
    const lines: string[] = [];

    // Add header row
    lines.push(headers.map(escapeCSVValue).join(","));

    // Add data rows
    for (const row of value) {
      if (typeof row !== "object" || row === null || Array.isArray(row)) {
        throw new Error("CSV output requires all elements to be objects");
      }
      const rowObj = row as Record<string, unknown>;
      const values = headers.map((h) =>
        escapeCSVValue(String(rowObj[h] ?? "")),
      );
      lines.push(values.join(","));
    }

    return lines.join("\n");
  }

  // Handle single object as single-row CSV
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    const headers = Object.keys(obj);
    const values = headers.map((h) => escapeCSVValue(String(obj[h] ?? "")));
    return headers.map(escapeCSVValue).join(",") + "\n" + values.join(",");
  }

  throw new Error("CSV output requires an object or array of objects");
}

/**
 * Escape a value for CSV output.
 * Wraps in quotes if the value contains commas, quotes, or newlines.
 * Doubles any internal quotes.
 */
function escapeCSVValue(value: string): string {
  // Check if quoting is needed
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    // Double any internal quotes and wrap in quotes
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
