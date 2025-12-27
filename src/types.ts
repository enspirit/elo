/**
 * Elo type system
 *
 * Represents the types that Elo expressions can have.
 * Used by the IR transformation phase to generate typed function calls.
 */

/**
 * Primitive type kinds in Elo
 */
export type TypeKind = 'int' | 'float' | 'bool' | 'null' | 'string' | 'date' | 'datetime' | 'duration' | 'fn' | 'object' | 'any';

/**
 * A Elo type
 */
export interface EloType {
  kind: TypeKind;
}

/**
 * Type constants for convenience
 */
export const Types = {
  int: { kind: 'int' } as EloType,
  float: { kind: 'float' } as EloType,
  bool: { kind: 'bool' } as EloType,
  null: { kind: 'null' } as EloType,
  string: { kind: 'string' } as EloType,
  date: { kind: 'date' } as EloType,
  datetime: { kind: 'datetime' } as EloType,
  duration: { kind: 'duration' } as EloType,
  fn: { kind: 'fn' } as EloType,
  object: { kind: 'object' } as EloType,
  any: { kind: 'any' } as EloType,
} as const;

/**
 * Check if two types are equal
 */
export function typeEquals(a: EloType, b: EloType): boolean {
  return a.kind === b.kind;
}

/**
 * Check if a type is numeric (int or float)
 */
export function isNumeric(t: EloType): boolean {
  return t.kind === 'int' || t.kind === 'float';
}

/**
 * Check if a type is temporal (date, datetime, or duration)
 */
export function isTemporal(t: EloType): boolean {
  return t.kind === 'date' || t.kind === 'datetime' || t.kind === 'duration';
}

/**
 * Check if a type is known (not 'any')
 */
export function isKnown(t: EloType): boolean {
  return t.kind !== 'any';
}

/**
 * Get a string representation of a type for function naming
 */
export function typeName(t: EloType): string {
  return t.kind;
}
