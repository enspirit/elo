/**
 * Elo type system
 *
 * Represents the types that Elo expressions can have.
 * Used by the IR transformation phase to generate typed function calls.
 */

import type { Expr } from './ast';

/**
 * Primitive type kinds in Elo
 */
export type TypeKind = 'int' | 'float' | 'bool' | 'null' | 'string' | 'date' | 'datetime' | 'duration' | 'interval' | 'fn' | 'object' | 'array' | 'any';

/**
 * A Elo type
 */
export interface EloType {
  kind: TypeKind;
}

/**
 * A type per AST node, keyed on node identity.
 *
 * What the type checker found, for `transform` to consult where its own
 * inference says `any` — `_ |> Order` is opaque to the transform, and
 * `order.total` with it, even though the author declared the field. Node
 * identity is the key because the checker and the transform walk the same AST
 * object.
 *
 * Declared here rather than in either module so neither has to depend on the
 * other: the compile path stays independent of the checker.
 */
export type TypeAnnotations = ReadonlyMap<Expr, EloType>;

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
  interval: { kind: 'interval' } as EloType,
  fn: { kind: 'fn' } as EloType,
  object: { kind: 'object' } as EloType,
  array: { kind: 'array' } as EloType,
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
  return t.kind === 'date' || t.kind === 'datetime' || t.kind === 'duration' || t.kind === 'interval';
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
