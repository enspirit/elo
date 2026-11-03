/**
 * Elo type system
 *
 * One type, carrying everything anyone knows about a value.
 *
 * There used to be two. `EloType` was a flat enum of 13 kinds — no field
 * types, no element types, no unions — and the checker carried a structural
 * lattice of its own (`CheckType`) because the language is richer than that:
 *
 *     let Order = { lines: [{ price: Int }], label: String } in _ |> Order
 *
 * is parsed, and validated and coerced at runtime, against exactly that shape.
 * The shape was in the AST and enforced; only the compiler threw it away. So
 * the checker was more precise than the compiler by construction, the two had
 * to be cross-checked against each other, and the SQL binding grew a third,
 * ad-hoc notion of type to make up the difference.
 *
 * ## The one invariant
 *
 * **`kind` is always the kind dispatch sees.** Everything else is precision
 * hanging off it, and nothing is obliged to look.
 *
 * That is what keeps the type system simple while the type is rich:
 *
 *  - `signatureKey` and `typeGeneralizations` key on `kind` alone, through
 *    `typeName`. So the signature table has no notion of field or element
 *    types, and `{ a: Int }` and `{ b: String }` are both `object` to every
 *    signature in it — exactly as before.
 *  - Nothing matches types *structurally* to choose an implementation, so
 *    there is no assignability relation to define: "does `{a: Int, b: Int}`
 *    satisfy `{a: Int}`?" never arises, and there is no variance to get wrong.
 *  - A union whose members disagree has kind `any`, because `any` is precisely
 *    what dispatch means by "I cannot resolve this". It still carries its
 *    members, so the checker can resolve it one member at a time.
 *
 * The projection is therefore *materialised* rather than computed: there is no
 * `project()` to call and no way to forget to call it.
 */

import type { Expr } from './ast';

/**
 * Primitive type kinds in Elo
 */
export type TypeKind = 'int' | 'float' | 'bool' | 'null' | 'string' | 'date' | 'datetime' | 'duration' | 'interval' | 'fn' | 'object' | 'array' | 'any';

/** One declared attribute of an object. */
export interface SchemaProp {
  key: string;
  type: EloType;
  /** `:? Int` — the attribute may be absent. */
  optional: boolean;
}

/**
 * What an object says about attributes it does not declare.
 *
 * - `closed` (the default): rejected at runtime, so they cannot exist.
 * - `ignored` (`{ …, ... }`): allowed in, but **stripped from the coerced
 *   value**, so they cannot be read either. Strict, like `closed`, for anything
 *   downstream.
 * - a type (`{ …, ...: Int }`): allowed, and read at that type.
 */
export type Extras = 'closed' | 'ignored' | EloType;

/**
 * An Elo type.
 *
 * `kind` is what dispatch sees and is always present. The rest is what the
 * author wrote down, where anyone worked it out; absent means "unknown", which
 * is what every one of these used to be.
 */
export interface EloType {
  /** The kind dispatch sees. See the invariant in this module's header. */
  kind: TypeKind;
  /**
   * The declared attributes of an `object`, in the order written.
   *
   * An attribute absent from this list is *unknown*, never forbidden: this
   * says what a read produces, and `extras` says what is allowed.
   */
  props?: readonly SchemaProp[];
  /** What an `object` does with attributes `props` does not declare. */
  extras?: Extras;
  /** What an `array` holds. */
  element?: EloType;
  /**
   * The alternatives of a union.
   *
   * Present when a value is one of several types. `kind` is their agreed kind
   * where they have one and `any` otherwise, so dispatch needs no awareness of
   * unions at all.
   */
  members?: readonly EloType[];
  /** What a `fn` returns. */
  result?: EloType;
}

/**
 * A type per AST node, keyed on node identity.
 *
 * What the type checker found, for `transform` to consult where its own
 * inference says `any` — `_ |> Order` is opaque to the transform, and
 * `order.total` with it, even though the author declared the field. Node
 * identity is the key because the checker and the transform walk the same AST
 * object.
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

// ---------------------------------------------------------------------------
// Building a type
// ---------------------------------------------------------------------------

/** An `object` of known shape. */
export function objectOf(props: readonly SchemaProp[], extras: Extras = 'closed'): EloType {
  return { kind: 'object', props, extras };
}

/** An `array` of known element type. */
export function arrayOf(element: EloType): EloType {
  return { kind: 'array', element };
}

/** A `fn` returning a known type. */
export function fnOf(result: EloType): EloType {
  return { kind: 'fn', result };
}

/**
 * Combine the types of several alternatives into one.
 *
 * Identical types collapse, so a union is only ever built where there is a
 * real choice. An unknown among them makes the whole thing unknown: nothing
 * can be said about a value that might be anything.
 *
 * The result's `kind` is the members' agreed kind, or `any` when they disagree
 * — which is the invariant this module is built on.
 */
export function join(types: readonly EloType[]): EloType {
  if (types.length === 0) return Types.any;
  if (types.some(isUnknown)) return Types.any;

  const unique: EloType[] = [];
  for (const type of types) {
    if (!unique.some((seen) => structurallyEquals(seen, type))) unique.push(type);
  }
  if (unique.length === 1) return unique[0];

  const kinds = new Set(unique.map((t) => t.kind));
  return { kind: kinds.size === 1 ? unique[0].kind : 'any', members: unique };
}

/**
 * A value that may be absent is a union with Null — `:? Int` is `Int|Null`.
 *
 * Modelling it that way rather than as its own case means the union rules
 * already do the work: an operation must hold for every member, and `Null` is
 * a member no arithmetic signature accepts. So `k.a + 1` on an optional field
 * is reported for exactly the reason it is wrong.
 */
export function nullable(inner: EloType): EloType {
  return join([inner, Types.null]);
}

// ---------------------------------------------------------------------------
// Asking about a type
// ---------------------------------------------------------------------------

/**
 * Equality as **dispatch** means it: by kind.
 *
 * `{ a: Int }` and `{ b: String }` are equal here, because they are the same
 * `object` to every signature in the table. For "are these the same type",
 * which is a different question, see `structurallyEquals`.
 */
export function typeEquals(a: EloType, b: EloType): boolean {
  return a.kind === b.kind;
}

/**
 * Equality as a reader means it: all the way down.
 *
 * Used to collapse unions, to compare the branches of an `if`, and to tell
 * whether two visits to one node agreed — all cases where kind-equality would
 * call two different types the same and lose something.
 */
export function structurallyEquals(a: EloType, b: EloType): boolean {
  if (a.kind !== b.kind) return false;
  if (!membersEqual(a.members, b.members)) return false;
  if ((a.element === undefined) !== (b.element === undefined)) return false;
  if (a.element && b.element && !structurallyEquals(a.element, b.element)) return false;
  if ((a.result === undefined) !== (b.result === undefined)) return false;
  if (a.result && b.result && !structurallyEquals(a.result, b.result)) return false;
  if (!extrasEqual(a.extras, b.extras)) return false;
  return propsEqual(a.props, b.props);
}

function membersEqual(a?: readonly EloType[], b?: readonly EloType[]): boolean {
  if (a === undefined || b === undefined) return a === b;
  return a.length === b.length && a.every((m, i) => structurallyEquals(m, b[i]));
}

function propsEqual(a?: readonly SchemaProp[], b?: readonly SchemaProp[]): boolean {
  if (a === undefined || b === undefined) return a === b;
  return (
    a.length === b.length &&
    a.every((prop, i) =>
      prop.key === b[i].key &&
      prop.optional === b[i].optional &&
      structurallyEquals(prop.type, b[i].type))
  );
}

function extrasEqual(a?: Extras, b?: Extras): boolean {
  if (a === undefined || b === undefined) return a === b;
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  return structurallyEquals(a, b);
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
 * True when *nothing* is known about the type, so a diagnostic would be a
 * guess.
 *
 * Not the same as `kind === 'any'`: a union of disagreeing members has kind
 * `any`, because that is what dispatch can do with it, and yet its members are
 * known. `Int|String` is not unknown.
 */
export function isUnknown(t: EloType): boolean {
  return t.kind === 'any' && t.members === undefined;
}

/** Check if a type is known (not `any`) */
export function isKnown(t: EloType): boolean {
  return t.kind !== 'any';
}

/** True when the type admits null. */
export function isNullable(t: EloType): boolean {
  if (t.kind === 'null') return true;
  return t.members !== undefined && t.members.some(isNullable);
}

/**
 * The same type with null ruled out — what a null check, or an `|` fallback,
 * establishes. Returns the type unchanged when it admitted no null.
 */
export function stripNull(t: EloType): EloType {
  if (t.members === undefined) return t;
  const members = t.members.filter((m) => !isNullable(m));
  if (members.length === 0) return t;
  return join(members);
}

/**
 * The type reading `property` off `type` produces, where that is known.
 *
 * `any` for anything else: an object of unknown shape, an attribute the shape
 * does not declare, or a read off something that is not an object at all. An
 * optional attribute reads as nullable, because that is what it is.
 */
export function propertyType(type: EloType, property: string): EloType {
  const prop = type.props?.find((p) => p.key === property);
  // `:?` is the author's own statement that the attribute may be absent, so an
  // optional one reads as `T|Null` and using it as a T is reported.
  if (prop) return prop.optional ? nullable(prop.type) : prop.type;
  // `{ …, ...: Int }` says what an undeclared attribute holds. Not nullable:
  // `...: Int` is a statement about the extras that *are* there, and an author
  // who writes it is saying they will be.
  if (type.extras !== undefined && typeof type.extras !== 'string') return type.extras;
  return Types.any;
}

/**
 * Get a string representation of a type for function naming.
 *
 * The dispatch key, so `kind` and nothing else — see the module header.
 */
export function typeName(t: EloType): string {
  return t.kind;
}

/**
 * Name a type the way an author would recognise it, which is the way they
 * wrote it.
 */
export function describeType(t: EloType): string {
  if (t.members !== undefined) return t.members.map(describeType).join('|');
  switch (t.kind) {
    case 'object': {
      if (t.props === undefined) return 'Object';
      const props = t.props.map((p) => `${p.key}${p.optional ? ' :?' : ':'} ${describeType(p.type)}`);
      if (t.extras === 'ignored') props.push('...');
      else if (t.extras !== undefined && t.extras !== 'closed') props.push(`...: ${describeType(t.extras)}`);
      return `{ ${props.join(', ')} }`;
    }
    case 'array':
      return t.element === undefined ? 'List' : `[${describeType(t.element)}]`;
    case 'fn':
      return 'Function';
    case 'any':
      return 'Any';
    default:
      return t.kind.charAt(0).toUpperCase() + t.kind.slice(1);
  }
}
