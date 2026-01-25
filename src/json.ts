export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (t === "object") {
    const obj = value as Record<string, unknown>;
    // Only plain object JSON — reject DateTime/Duration/etc by requiring prototype to be Object
    if (Object.getPrototypeOf(obj) !== Object.prototype) return false;
    for (const k of Object.keys(obj)) {
      if (!isJsonValue(obj[k])) return false;
    }
    return true;
  }
  return false;
}

export function assertJsonValue(value: unknown): asserts value is JsonValue {
  if (!isJsonValue(value)) {
    throw new Error("Value is not JSON-serializable (JSON boundary violation)");
  }
}
