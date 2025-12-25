/**
 * Klang type system
 *
 * Represents the types that Klang expressions can have.
 * Used by the IR transformation phase to generate typed function calls.
 */

/**
 * Primitive type kinds in Klang
 */
export type TypeKind = 'int' | 'float' | 'bool' | 'string' | 'date' | 'datetime' | 'duration' | 'fn' | 'any';

/**
 * A Klang type
 */
export interface KlangType {
  kind: TypeKind;
}

/**
 * Type constants for convenience
 */
export const Types = {
  int: { kind: 'int' } as KlangType,
  float: { kind: 'float' } as KlangType,
  bool: { kind: 'bool' } as KlangType,
  string: { kind: 'string' } as KlangType,
  date: { kind: 'date' } as KlangType,
  datetime: { kind: 'datetime' } as KlangType,
  duration: { kind: 'duration' } as KlangType,
  fn: { kind: 'fn' } as KlangType,
  any: { kind: 'any' } as KlangType,
} as const;

/**
 * Check if two types are equal
 */
export function typeEquals(a: KlangType, b: KlangType): boolean {
  return a.kind === b.kind;
}

/**
 * Check if a type is numeric (int or float)
 */
export function isNumeric(t: KlangType): boolean {
  return t.kind === 'int' || t.kind === 'float';
}

/**
 * Check if a type is temporal (date, datetime, or duration)
 */
export function isTemporal(t: KlangType): boolean {
  return t.kind === 'date' || t.kind === 'datetime' || t.kind === 'duration';
}

/**
 * Check if a type is known (not 'any')
 */
export function isKnown(t: KlangType): boolean {
  return t.kind !== 'any';
}

/**
 * Get a string representation of a type for function naming
 */
export function typeName(t: KlangType): string {
  return t.kind;
}
