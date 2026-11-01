/**
 * The type checker's own type lattice
 *
 * Elo's type system is richer than the lattice the *compiler* dispatches on.
 * `EloType` (src/types.ts) is a flat enum of 13 kinds plus `any`: no field
 * types, no element types, no unions. But the language lets an author write
 *
 *     let Order = { lines: [{ price: Int }], label: String } in _ |> Order
 *
 * and the runtime validates and coerces `_` against exactly that. The shape is
 * in the AST and it is enforced; only the compiler throws it away.
 *
 * So the checker carries a structural lattice of its own and **projects down**
 * to `EloType` whenever it consults the signature table. That keeps the
 * compiler's dispatch as flat and simple as it was — `types.ts`, `typedefs.ts`,
 * `transform.ts` and the four compilers are untouched — while the optional
 * checker gets the precision the author already paid for.
 *
 * The consequence is a deliberate asymmetry: the checker may be *more* precise
 * than the transform, and may therefore reject a program the compilers would
 * happily emit. It must never be *less* precise, which is what the cross-check
 * test over the fixture corpus verifies.
 */

import { EloType, Types } from './types';

/**
 * A type as the checker knows it.
 */
export type CheckType =
  /** One of the 13 kinds the compiler dispatches on. */
  | { kind: 'primitive'; type: EloType }
  /** An object of known shape, from a type schema. */
  | { kind: 'schema'; props: SchemaProp[]; extras: SchemaExtras }
  /** A list whose element type is known. */
  | { kind: 'array'; element: CheckType }
  /** `Int|String`: a value that is one of several types. */
  | { kind: 'union'; members: CheckType[] }
  /** A function, with the type of what it returns. */
  | { kind: 'fn'; result: CheckType }
  /** Unknown — the input before it is coerced, and anything derived from it. */
  | { kind: 'any' };

export interface SchemaProp {
  key: string;
  type: CheckType;
  optional: boolean;
}

/**
 * What a schema says about attributes it does not declare.
 *
 * - `closed` (the default): rejected at runtime, so they cannot exist.
 * - `ignored` (`{ …, ... }`): allowed in, but **stripped from the coerced
 *   value**, so they cannot be read either. Strict, like `closed`, for anything
 *   downstream.
 * - a type (`{ …, ...: Int }`): allowed, and read at that type.
 */
export type SchemaExtras = 'closed' | 'ignored' | CheckType;

export const ANY: CheckType = { kind: 'any' };

/** Wrap one of the compiler's flat types. */
export function prim(type: EloType): CheckType {
  return { kind: 'primitive', type };
}

export const BOOL = prim(Types.bool);

/**
 * Project a checker type onto the lattice the compiler dispatches on.
 *
 * This is the only place the extra precision is given up, and it happens on
 * every signature lookup — which is why `typedefs.ts` needs no notion of
 * element or field types.
 */
export function project(type: CheckType): EloType {
  switch (type.kind) {
    case 'primitive':
      return type.type;
    case 'schema':
      return Types.object;
    case 'array':
      return Types.array;
    case 'fn':
      return Types.fn;
    case 'any':
      return Types.any;
    case 'union': {
      // A union is only as precise as its members agree. `Int|Float` projects
      // to `any`, not to one of them, because no single signature covers it —
      // resolving a call on a union is done member by member instead.
      const kinds = new Set(type.members.map((m) => project(m).kind));
      if (kinds.size === 1) return project(type.members[0]);
      return Types.any;
    }
  }
}

/**
 * Name a type the way an author would recognise it.
 */
export function describe(type: CheckType): string {
  switch (type.kind) {
    case 'primitive':
      return capitalize(type.type.kind);
    case 'schema': {
      const props = type.props.map((p) => `${p.key}${p.optional ? ' :?' : ':'} ${describe(p.type)}`);
      if (type.extras === 'ignored') props.push('...');
      else if (type.extras !== 'closed') props.push(`...: ${describe(type.extras)}`);
      return `{ ${props.join(', ')} }`;
    }
    case 'array':
      return `[${describe(type.element)}]`;
    case 'union':
      return type.members.map(describe).join('|');
    case 'fn':
      return 'Function';
    case 'any':
      return 'Any';
  }
}

/**
 * True when nothing is known about the type, so a diagnostic would be a guess.
 */
export function isUnknown(type: CheckType): boolean {
  return type.kind === 'any';
}

/**
 * Combine the types of several branches into one.
 * Identical types collapse; anything else becomes a union, and an unknown
 * among them makes the whole thing unknown.
 */
export function join(types: CheckType[]): CheckType {
  if (types.length === 0) return ANY;
  if (types.some(isUnknown)) return ANY;

  const unique: CheckType[] = [];
  for (const type of types) {
    if (!unique.some((seen) => equals(seen, type))) unique.push(type);
  }
  if (unique.length === 1) return unique[0];
  return { kind: 'union', members: unique };
}

/**
 * Structural equality, used to collapse unions and to compare branches.
 */
export function equals(a: CheckType, b: CheckType): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'primitive':
      return a.type.kind === (b as typeof a).type.kind;
    case 'array':
      return equals(a.element, (b as typeof a).element);
    case 'fn':
      return equals(a.result, (b as typeof a).result);
    case 'union': {
      const other = b as typeof a;
      return (
        a.members.length === other.members.length &&
        a.members.every((m, i) => equals(m, other.members[i]))
      );
    }
    case 'schema': {
      const other = b as typeof a;
      if (a.props.length !== other.props.length) return false;
      if (!extrasEqual(a.extras, other.extras)) return false;
      return a.props.every((prop, i) => {
        const otherProp = other.props[i];
        return (
          prop.key === otherProp.key &&
          prop.optional === otherProp.optional &&
          equals(prop.type, otherProp.type)
        );
      });
    }
    case 'any':
      return true;
  }
}

function extrasEqual(a: SchemaExtras, b: SchemaExtras): boolean {
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  return equals(a, b);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
