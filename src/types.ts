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
 * A Elo type.
 *
 * `kind` is what the compilers dispatch on, and it is all they used to carry:
 * an object was `object` and a list was `array`, whatever the author had
 * written down. So `{ budget: 1500 }.budget` was `any`, and the SQL binding
 * had to work out what to cast it to from whatever it sat next to — which is
 * a guess, and `'x' + 'y'` is the one it got wrong.
 *
 * The shape below is what the author already wrote: it is parsed, it is
 * enforced at runtime, and it was the only thing being thrown away.
 *
 * It is **additive on purpose**. Dispatch still keys on `kind` alone —
 * `typeName` returns it and `typeEquals` compares it — so no signature, no
 * generalization and no binding sees any of this. That is what keeps the
 * question "does `{a: Int, b: Int}` satisfy `{a: Int}`?" from arising: nothing
 * matches types structurally, so there is no assignability relation to define
 * and no variance to get wrong.
 */
export interface EloType {
  kind: TypeKind;
  /**
   * What an `object` holds, by attribute name, where it is known.
   *
   * Absent means "an object of unknown shape", which is what every object was
   * before. A declared attribute that is absent from the map is unknown rather
   * than forbidden — this says what a read *produces*, never what is allowed.
   */
  props?: ReadonlyMap<string, EloType>;
  /** What an `array` holds, where it is known. Absent means unknown. */
  element?: EloType;
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
 * Check if two types are equal.
 *
 * By kind only, which is what dispatch means by equal: `{a: Int}` and
 * `{b: String}` are both an `object` to every signature in the table. Shape is
 * carried *through* inference and flattened here.
 */
export function typeEquals(a: EloType, b: EloType): boolean {
  return a.kind === b.kind;
}

/** An `object` of known shape. */
export function objectOf(props: ReadonlyMap<string, EloType>): EloType {
  return { kind: 'object', props };
}

/** An `array` of known element type. */
export function arrayOf(element: EloType): EloType {
  return { kind: 'array', element };
}

/**
 * The type reading `property` off `type` produces, where that is known.
 *
 * `any` for anything else, which is what every member read answered before:
 * an object of unknown shape, an attribute the shape does not mention, or a
 * read off something that is not an object at all.
 */
export function propertyType(type: EloType, property: string): EloType {
  return type.props?.get(property) ?? Types.any;
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
