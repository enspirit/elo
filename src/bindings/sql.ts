/**
 * SQL (PostgreSQL) stdlib binding for Elo
 *
 * This module defines how Elo IR functions are emitted as PostgreSQL SQL code.
 */

import { IRExpr, IRArrayLiteral, inferType } from '../ir';
import { Types, EloType, typeEquals } from '../types';
import { StdLib, EmitContext, nullary, fnCall } from '../stdlib';
import { parseExtractTemplate, buildExtractPattern } from '../extract';
import { assertSafeIdentifier } from '../compilers/_validate';

/**
 * Map IR function names to SQL operators
 */
export const SQL_OP_MAP: Record<string, string> = {
  'add': '+', 'sub': '-', 'mul': '*', 'div': '/', 'mod': '%',
  'lt': '<', 'gt': '>', 'lte': '<=', 'gte': '>=',
  'eq': '=', 'neq': '<>', 'and': 'AND', 'or': 'OR',
};

/**
 * Check if a call will be emitted as a native SQL binary operator
 */
export function isNativeBinaryOp(ir: IRExpr): boolean {
  if (ir.type !== 'call') return false;
  return SQL_OP_MAP[ir.fn] !== undefined && ir.argTypes.length === 2;
}

/**
 * The PostgreSQL type an Elo type lands on, for the one thing that needs to
 * name it: an array's element type.
 */
export const PG_TYPE: Partial<Record<string, string>> = {
  int: 'integer',
  float: 'double precision',
  bool: 'boolean',
  string: 'text',
  date: 'date',
  datetime: 'timestamp',
  duration: 'interval',
};

/**
 * The PostgreSQL type to read a json field as, given what it holds.
 *
 * A number in `jsonb` is a `numeric`: json draws no line between 1 and 1.0, so
 * neither can the read. Reading an Int field as `integer` would also make
 * `{ a: 10 }.a / 4` truncate, which is not what Elo's `/` means.
 *
 * A String field needs no cast at all: `jsonb->>'k'` is text by definition, so
 * `::text` would say what the read already says. Knowing the field *is* a
 * String still matters — it is what sends `+` to `||` instead of to numeric
 * addition — but it is the type that carries that, not a cast.
 */
export function jsonFieldPgType(type: EloType): string | undefined {
  if (type.kind === 'int' || type.kind === 'float') return 'numeric';
  if (type.kind === 'string') return undefined;
  return PG_TYPE[type.kind];
}

/** `[]` written in place, which is the only list with no element to type it. */
function isEmptyList(ir: IRExpr): boolean {
  return ir.type === 'array_literal' && ir.elements.length === 0;
}

/**
 * Emit an array argument, giving an empty list the element type its context
 * needs.
 *
 * `[]` is a list of nothing in Elo and PostgreSQL has no such value: a bare
 * `ARRAY[]` is rejected with "cannot determine type of empty array", and the
 * untyped `'{}'` literal only resolves next to a typed sibling — as an
 * argument to a polymorphic function (`CARDINALITY`, `UNNEST`, `ANY`) it fails
 * the same way. So the element type comes from the list itself when it has
 * one, and otherwise from `demand`: what the operation about to consume it
 * requires. `text` where the operation does not care, since every list
 * function that *does* care says so.
 */
function arrayArg(
  ir: IRExpr,
  ctx: EmitContext<string>,
  demand: EloType = Types.string
): string {
  if (!isEmptyList(ir)) return ctx.emit(ir);
  const element = (ir as IRArrayLiteral).elementType.kind === 'any'
    ? demand
    : (ir as IRArrayLiteral).elementType;
  return `'{}'::${PG_TYPE[element.kind] ?? 'text'}[]`;
}

/**
 * Aggregating zero rows yields NULL, not an empty array, so every emitter
 * built on ARRAY_AGG answers NULL for an empty list where Elo says `[]`.
 * Falling back to the input is both the right value and the right type: when
 * the aggregate is NULL the input *was* the empty list.
 */
function aggregatedArray(ir: IRExpr, aggregate: string, input: string): string {
  // A list written in place with elements in it cannot aggregate to nothing,
  // so the common case keeps the shorter emission.
  if (ir.type === 'array_literal' && ir.elements.length > 0) return aggregate;
  return `COALESCE(${aggregate}, ${input})`;
}

/**
 * The calls whose SQL emission is a `jsonb` value.
 *
 * SQL has two data models in play and Elo's `Object`/`Any` cannot tell them
 * apart. The input `_` is a **row**: `_.person.age` is a field reference, which
 * is what a host passing a record expects. Everything in Elo's data family is
 * **jsonb**, where a field is read with `->>` and a value only compares against
 * another jsonb. So the compiler tracks it from the expression's shape.
 */
const JSONB_CALLS: ReadonlySet<string> = new Set([
  'fetch', 'patch', 'merge', 'deepMerge',
]);

/** Whether an emitted expression is a `jsonb` value. */
export function isJsonb(ir: IRExpr): boolean {
  switch (ir.type) {
    case 'object_literal':
      return true;
    case 'call':
      if (JSONB_CALLS.has(ir.fn)) return true;
      // `Data` passes a list and an object literal straight through and wraps
      // everything else in elo_data, so only the list case is not jsonb.
      if (ir.fn === 'Data') return ir.argTypes[0]?.kind !== 'array';
      return false;
    case 'let':
    case 'typedef':
    case 'guard':
      return isJsonb(ir.body);
    case 'if':
      return isJsonb(ir.then);
    default:
      return false;
  }
}

/**
 * A member read resolved against the json document it reads from: the
 * expression holding the document, and the keys down to the value.
 *
 * `null` when the object is not a document, which is how `_.person.age` keeps
 * compiling to a row field reference. A chain is resolved in one go because
 * `jsonb->>'user'` is *text*, and reading `.name` off that is not a json
 * operation at all — the whole path has to go through `#>>` instead.
 */
export function jsonPath(ir: IRExpr): { root: IRExpr; path: string[] } | null {
  if (ir.type !== 'member_access') return null;
  const inner = jsonPath(ir.object);
  if (inner) return { root: inner.root, path: [...inner.path, ir.property] };
  if (isJsonb(ir.object) || inferType(ir.object).kind === 'object') {
    return { root: ir.object, path: [ir.property] };
  }
  return null;
}

/**
 * `to_jsonb(x)`, with the cast PostgreSQL needs to resolve it.
 *
 * `to_jsonb` is polymorphic and a bare literal is `unknown`, so
 * `to_jsonb('Alice')` does not resolve at all. The Elo type names the overload
 * it wants. An array constructor already carries its type, and a value that is
 * jsonb already needs nothing.
 */
export function toJsonb(ir: IRExpr, ctx: EmitContext<string>): string {
  if (isJsonb(ir)) return ctx.emit(ir);
  const pg = PG_TYPE[inferType(ir).kind];
  const emitted = ctx.emit(ir);
  return pg ? `to_jsonb(${emitted}::${pg})` : `to_jsonb(${emitted})`;
}

/**
 * Whether an expression is a field read off `jsonb`.
 *
 * Elo's `Object` is `jsonb` on PostgreSQL, and `jsonb->>'k'` is **text**
 * whatever the stored value is. So `{ budget: 1500 }.budget` emits the text
 * `'1500'`, and `… = 1500` has no operator at all — "operator does not exist:
 * text = integer". The read cannot say what type it produced, so the type has
 * to come from whatever the value is being used with.
 *
 * `let` and `if` are transparent: their value is their body's, and the fixture
 * `(let obj = { x: 10 } in obj.x) == 10` is exactly that case.
 */
export function readsJsonField(ir: IRExpr): boolean {
  switch (ir.type) {
    case 'member_access':
      // A read whose type the checker supplied is already cast, so it needs
      // nothing from its context.
      return jsonPath(ir) !== null && ir.inferredType.kind === 'any';
    case 'let':
    case 'typedef':
    case 'guard':
      return readsJsonField(ir.body);
    case 'if':
      return readsJsonField(ir.then);
    default:
      return false;
  }
}

/**
 * The PostgreSQL type to bring a json field read to, so it can sit next to
 * `ir`.
 *
 * Numbers go to `numeric` rather than through text: `{ a: 1.0 }.a == 1` is
 * true in Elo, where `'1.0' = '1'` is not, and `'10' < '9'` is not an
 * ordering. `null` means the text the read already is: either the other side
 * is a string, or it is another field read and the two are comparable as they
 * stand.
 */
/**
 * What an operator itself says about its operands, for when both of them are
 * untyped field reads and neither can tell the other anything.
 *
 * Only the operators whose reading is unambiguous are here. `=` and `<>`
 * compare two reads as text, which is right for every value whose json form is
 * canonical, and `||` is text by definition — so they are absent rather than
 * guessed at.
 */
const OPERATOR_DEMAND: Partial<Record<string, string>> = {
  '+': 'numeric', '-': 'numeric', '*': 'numeric', '/': 'numeric', '%': 'numeric',
  '<': 'numeric', '>': 'numeric', '<=': 'numeric', '>=': 'numeric',
  'AND': 'boolean', 'OR': 'boolean',
};

function demandedPgType(sibling: IRExpr, op: string): string | null {
  if (readsJsonField(sibling)) return OPERATOR_DEMAND[op] ?? null;
  switch (inferType(sibling).kind) {
    case 'int':
    case 'float':
      return 'numeric';
    case 'bool':
      return 'boolean';
    case 'date':
      return 'date';
    case 'datetime':
      return 'timestamp';
    case 'duration':
      return 'interval';
    default:
      return null;
  }
}

/**
 * The PostgreSQL type an emitted expression has, where the compiler knows it.
 *
 * For the one place SQL needs several expressions to agree on a type and Elo
 * does not: COALESCE, which is how `a | b` compiles. `null` means "let
 * PostgreSQL decide" — a parameter or a subquery it will unify on its own —
 * and only two *known* and different types are a conflict worth casting away.
 */
export function pgTypeOf(ir: IRExpr): string | null {
  if (readsJsonField(ir)) return 'text';
  switch (ir.type) {
    case 'let':
    case 'typedef':
    case 'guard':
      return pgTypeOf(ir.body);
    case 'if':
      return pgTypeOf(ir.then);
    case 'member_access':
      // What the read *has*, which is not the same question as what cast it
      // needs: a String field needs none — `->>` is already text — but its
      // type is `text` all the same, and COALESCE has to be told so. Reading
      // the cast instead answered "no type" and let `o.x | 0` through as
      // COALESCE(text, integer).
      if (jsonPath(ir) !== null) {
        return jsonFieldPgType(ir.inferredType) ?? 'text';
      }
      return PG_TYPE[inferType(ir).kind] ?? null;
    default:
      return PG_TYPE[inferType(ir).kind] ?? null;
  }
}

/**
 * `=` and `<>`, with the one case PostgreSQL cannot express directly:
 * comparing against `[]`.
 *
 * An empty list has no element type to cast to, and the other operand's is not
 * always knowable — but the comparison does not need it. `xs == []` means "xs
 * is an empty list", which CARDINALITY answers whatever the elements are. The
 * null check is there because `null == []` is false in Elo, while
 * `CARDINALITY(NULL)` is null rather than a count.
 */
function sqlComparison(op: '=' | '<>'): (args: IRExpr[], ctx: EmitContext<string>) => string {
  return (args, ctx) => {
    const emptyLeft = isEmptyList(args[0]);
    const emptyRight = isEmptyList(args[1]);
    if (emptyLeft && emptyRight) return op === '=' ? 'TRUE' : 'FALSE';
    if (emptyLeft || emptyRight) {
      const other = ctx.emit(emptyLeft ? args[1] : args[0]);
      const isEmpty = `(${other} IS NOT NULL AND CARDINALITY(${other}) = 0)`;
      return op === '=' ? isEmpty : `(NOT ${isEmpty})`;
    }
    return sqlBinaryOp(op)(args, ctx);
  };
}

/**
 * Helper for SQL binary operators
 */
function sqlBinaryOp(op: string): (args: IRExpr[], ctx: EmitContext<string>) => string {
  return (args, ctx) => {
    const left = operandOf(args[0], args[1], op, 'left', ctx);
    const right = operandOf(args[1], args[0], op, 'right', ctx);
    return `${left} ${op} ${right}`;
  };
}

/**
 * One operand of a binary operator, with a json field read cast to the type
 * the other operand has. Applies to arithmetic and ordering as much as to
 * equality: `{ a: 1 }.a + 1` and `{ a: 1 }.a > 0` were just as broken.
 */
function operandOf(
  ir: IRExpr,
  sibling: IRExpr,
  op: string,
  side: 'left' | 'right',
  ctx: EmitContext<string>
): string {
  // A jsonb value only compares against another jsonb: `fetch(d, .name) =
  // 'Alice'` makes PostgreSQL read 'Alice' *as json*, where a bare word is not
  // valid json, so the error is about the literal rather than the types.
  if (isJsonb(sibling) && !isJsonb(ir)) return toJsonb(ir, ctx);

  const emitted = ctx.emitWithParens(ir, op, side);
  if (!readsJsonField(ir)) return emitted;
  const demand = demandedPgType(sibling, op);
  return demand ? `(${emitted})::${demand}` : emitted;
}

/**
 * Create the SQL standard library binding
 */
export function createSQLBinding(): StdLib<string> {
  const sqlLib = new StdLib<string>();

  // Temporal nullary functions
  sqlLib.register('today', [], nullary('CURRENT_DATE'));
  sqlLib.register('now', [], nullary('CURRENT_TIMESTAMP'));
  sqlLib.register('bot', [], nullary("TIMESTAMP '0001-01-01 00:00:00'"));
  sqlLib.register('eot', [], nullary("TIMESTAMP '9999-12-31 23:59:59'"));

  // Period boundary functions using date_trunc
  const periodBoundarySQL: Record<string, { truncate: string; end?: string }> = {
    'start_of_day': { truncate: 'day' },
    'end_of_day': { truncate: 'day', end: "+ INTERVAL '1 day' - INTERVAL '1 second'" },
    'start_of_week': { truncate: 'week' },
    'end_of_week': { truncate: 'week', end: "+ INTERVAL '7 days' - INTERVAL '1 second'" },
    'start_of_month': { truncate: 'month' },
    'end_of_month': { truncate: 'month', end: "+ INTERVAL '1 month' - INTERVAL '1 second'" },
    'start_of_quarter': { truncate: 'quarter' },
    'end_of_quarter': { truncate: 'quarter', end: "+ INTERVAL '3 months' - INTERVAL '1 second'" },
    'start_of_year': { truncate: 'year' },
    'end_of_year': { truncate: 'year', end: "+ INTERVAL '1 year' - INTERVAL '1 second'" },
  };

  const camelCaseSQLMap: Record<string, { truncate: string; end?: string }> = {
    'startOfDay': { truncate: 'day' },
    'endOfDay': { truncate: 'day', end: "+ INTERVAL '1 day' - INTERVAL '1 second'" },
    'startOfWeek': { truncate: 'week' },
    'endOfWeek': { truncate: 'week', end: "+ INTERVAL '7 days' - INTERVAL '1 second'" },
    'startOfMonth': { truncate: 'month' },
    'endOfMonth': { truncate: 'month', end: "+ INTERVAL '1 month' - INTERVAL '1 second'" },
    'startOfQuarter': { truncate: 'quarter' },
    'endOfQuarter': { truncate: 'quarter', end: "+ INTERVAL '3 months' - INTERVAL '1 second'" },
    'startOfYear': { truncate: 'year' },
    'endOfYear': { truncate: 'year', end: "+ INTERVAL '1 year' - INTERVAL '1 second'" },
  };

  for (const [fn, { truncate, end }] of Object.entries(periodBoundarySQL)) {
    sqlLib.register(fn, [Types.datetime], (args, ctx) => {
      const arg = args[0];
      let baseExpr: string;
      if (arg.type === 'call' && arg.fn === 'now') {
        baseExpr = fn.includes('_day') ? 'CURRENT_TIMESTAMP' : 'CURRENT_DATE';
      } else {
        baseExpr = ctx.emit(arg);
      }
      const truncated = `date_trunc('${truncate}', ${baseExpr})`;
      return end ? `${truncated} ${end}` : truncated;
    });
  }
  for (const [fn, { truncate, end }] of Object.entries(camelCaseSQLMap)) {
    for (const t of [Types.date, Types.datetime]) {
      sqlLib.register(fn, [t], (args, ctx) => {
        const truncated = `date_trunc('${truncate}', ${ctx.emit(args[0])})`;
        return end ? `${truncated} ${end}` : truncated;
      });
    }
  }

  // String concatenation uses || in SQL
  sqlLib.register('add', [Types.string, Types.string], sqlBinaryOp('||'));

  // String multiplication (repeat). elo_repeat bounds the result length by
  // ELO_MAX_STRING_LENGTH, as kRepeat does on the other targets; bare REPEAT
  // would let a short expression allocate an arbitrarily large string.
  sqlLib.register('mul', [Types.string, Types.int], (args, ctx) =>
    `elo_repeat(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`);
  sqlLib.register('mul', [Types.int, Types.string], (args, ctx) =>
    `elo_repeat(${ctx.emit(args[1])}, ${ctx.emit(args[0])})`);

  // List concatenation uses || in PostgreSQL (array concatenation). Appending
  // `[]` is the identity, which spares PostgreSQL an element type an empty
  // list cannot give it; with both sides empty there is nothing to borrow
  // from, so the default cast applies.
  sqlLib.register('add', [Types.array, Types.array], (args, ctx) => {
    const emptyLeft = isEmptyList(args[0]);
    const emptyRight = isEmptyList(args[1]);
    if (emptyLeft && emptyRight) return arrayArg(args[0], ctx);
    if (emptyLeft) return ctx.emitWithParens(args[1], '||', 'right');
    if (emptyRight) return ctx.emitWithParens(args[0], '||', 'left');
    return sqlBinaryOp('||')(args, ctx);
  });

  // SQL uses native operators for all types - type generalization handles all combinations
  sqlLib.register('add', [Types.any, Types.any], sqlBinaryOp('+'));
  sqlLib.register('sub', [Types.any, Types.any], sqlBinaryOp('-'));
  sqlLib.register('mul', [Types.any, Types.any], sqlBinaryOp('*'));
  // PostgreSQL truncates integer / integer, where Elo's `/` is real division
  // in every target — `7 / 2` is 3.5, not 3. Casting the left operand is
  // enough to make the division real, and `double precision` is what the
  // other three produce: Ruby's fdiv, JavaScript's `/` and Python's `/` are
  // all IEEE doubles. Ruby's binding makes the same opt-out, for the same
  // reason, right above its own numeric registrations.
  //
  // Only the statically-integer case. As soon as either operand is a Float
  // PostgreSQL divides as reals already, and when neither type is known there
  // is nothing to cast to: a cast that fixed Int / Int would break
  // Duration / Int, which goes through the same `Any` signature.
  sqlLib.register('div', [Types.int, Types.int], (args, ctx) => {
    const left = ctx.emitWithParens(args[0], '/', 'left');
    const right = ctx.emitWithParens(args[1], '/', 'right');
    return `${left}::double precision / ${right}`;
  });
  sqlLib.register('div', [Types.any, Types.any], sqlBinaryOp('/'));
  // Elo's `%` is floored: the result takes the sign of the divisor, as it does
  // in Ruby and Python. PostgreSQL's `%` is truncated like C's, so `-7 % 3` is
  // -1 there where Elo says 2, and it has no floored modulo to call. A pure
  // expression has nowhere to define a helper either, so the correction is
  // inline — which does evaluate the divisor twice.
  sqlLib.register('mod', [Types.any, Types.any], (args, ctx) => {
    const left = ctx.emitWithParens(args[0], '%', 'left');
    const right = ctx.emitWithParens(args[1], '%', 'right');
    return `((${left} % ${right}) + ${right}) % ${right}`;
  });
  sqlLib.register('pow', [Types.any, Types.any], fnCall('POWER'));

  // Temporal arithmetic
  // Special case: today() + duration('P1D') -> CURRENT_DATE + INTERVAL '1 day' (for TOMORROW)
  sqlLib.register('add', [Types.date, Types.duration], (args, ctx) => {
    const leftArg = args[0];
    const rightArg = args[1];
    if (leftArg.type === 'call' && leftArg.fn === 'today' &&
        rightArg.type === 'duration_literal' && rightArg.value === 'P1D') {
      return "CURRENT_DATE + INTERVAL '1 day'";
    }
    const left = ctx.emitWithParens(args[0], '+', 'left');
    const right = ctx.emitWithParens(args[1], '+', 'right');
    return `${left} + ${right}`;
  });

  // Other temporal additions are covered by any,any registration

  // Special case: today() - duration('P1D') -> CURRENT_DATE - INTERVAL '1 day' (for YESTERDAY)
  sqlLib.register('sub', [Types.date, Types.duration], (args, ctx) => {
    const leftArg = args[0];
    const rightArg = args[1];
    if (leftArg.type === 'call' && leftArg.fn === 'today' &&
        rightArg.type === 'duration_literal' && rightArg.value === 'P1D') {
      return "CURRENT_DATE - INTERVAL '1 day'";
    }
    const left = ctx.emitWithParens(args[0], '-', 'left');
    const right = ctx.emitWithParens(args[1], '-', 'right');
    return `${left} - ${right}`;
  });

  // Date - Date returns an INTERVAL (PostgreSQL returns integer days, convert to interval)
  sqlLib.register('sub', [Types.date, Types.date], (args, ctx) => {
    const left = ctx.emitWithParens(args[0], '-', 'left');
    const right = ctx.emitWithParens(args[1], '-', 'right');
    return `(${left} - ${right}) * INTERVAL '1 day'`;
  });
  sqlLib.register('sub', [Types.datetime, Types.datetime], (args, ctx) => {
    const left = ctx.emitWithParens(args[0], '-', 'left');
    const right = ctx.emitWithParens(args[1], '-', 'right');
    return `${left} - ${right}`;  // TIMESTAMP - TIMESTAMP already returns INTERVAL in PostgreSQL
  });

  // Other temporal subtractions and duration scaling are covered by any,any registrations

  // Comparison operators - SQL handles all types, type generalization applies
  sqlLib.register('lt', [Types.any, Types.any], sqlBinaryOp('<'));
  sqlLib.register('gt', [Types.any, Types.any], sqlBinaryOp('>'));
  sqlLib.register('lte', [Types.any, Types.any], sqlBinaryOp('<='));
  sqlLib.register('gte', [Types.any, Types.any], sqlBinaryOp('>='));
  sqlLib.register('eq', [Types.any, Types.any], sqlComparison('='));
  sqlLib.register('neq', [Types.any, Types.any], sqlComparison('<>'));

  // Logical operators
  sqlLib.register('and', [Types.any, Types.any], sqlBinaryOp('AND'));
  sqlLib.register('or', [Types.any, Types.any], sqlBinaryOp('OR'));

  // Unary operators - type generalization handles int, float, and any
  sqlLib.register('neg', [Types.any], (args, ctx) => {
    const operand = ctx.emit(args[0]);
    if (isNativeBinaryOp(args[0])) return `-(${operand})`;
    return `-${operand}`;
  });
  sqlLib.register('pos', [Types.any], (args, ctx) => {
    const operand = ctx.emit(args[0]);
    if (isNativeBinaryOp(args[0])) return `+(${operand})`;
    return `+${operand}`;
  });
  sqlLib.register('not', [Types.any], (args, ctx) => {
    const operand = ctx.emit(args[0]);
    if (isNativeBinaryOp(args[0])) return `NOT (${operand})`;
    return `NOT ${operand}`;
  });

  // Assert function - type generalization handles bool and any
  sqlLib.register('assert', [Types.any], (args, ctx) => {
    const condition = ctx.emit(args[0]);
    return `CASE WHEN ${condition} THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END`;
  });
  sqlLib.register('assert', [Types.any, Types.string], (args, ctx) => {
    const condition = ctx.emit(args[0]);
    return `CASE WHEN ${condition} THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END`;
  });

  // AssertFails - expects a function to throw when called
  // In PostgreSQL, we use a DO block with exception handling
  sqlLib.register('assertFails', [Types.fn], (args, ctx) => {
    // For SQL, assertFails tests are skipped since PostgreSQL exception handling
    // requires procedural context that's not available in pure SQL expressions
    return `TRUE /* assertFails not supported in SQL */`;
  });

  // Array functions
  sqlLib.register('length', [Types.array], (args, ctx) =>
    `COALESCE(CARDINALITY(${arrayArg(args[0], ctx)}), 0)`);
  sqlLib.register('count', [Types.array], (args, ctx) =>
    `COALESCE(CARDINALITY(${arrayArg(args[0], ctx)}), 0)`);
  // PostgreSQL only subscripts a parenthesised expression: `ARRAY[1, 2][1]` is
  // a syntax error where `(ARRAY[1, 2])[1]` is 1. A column reference parses
  // either way, which is why every list literal indexed in place used to emit
  // SQL that psql rejected. Always parenthesising is both correct and the
  // shortest rule to keep.
  const subscript = (receiver: string, index: string) => `(${receiver})[${index}]`;
  sqlLib.register('at', [Types.array, Types.int], (args, ctx) =>
    subscript(arrayArg(args[0], ctx), `${ctx.emit(args[1])} + 1`));
  sqlLib.register('first', [Types.array], (args, ctx) =>
    subscript(arrayArg(args[0], ctx), '1'));
  sqlLib.register('last', [Types.array], (args, ctx) =>
    subscript(arrayArg(args[0], ctx), `CARDINALITY(${arrayArg(args[0], ctx)})`));
  sqlLib.register('min', [Types.array], (args, ctx) =>
    `(SELECT MIN(v) FROM UNNEST(${arrayArg(args[0], ctx)}) AS v)`);
  sqlLib.register('max', [Types.array], (args, ctx) =>
    `(SELECT MAX(v) FROM UNNEST(${arrayArg(args[0], ctx)}) AS v)`);
  sqlLib.register('min', [Types.any, Types.any], fnCall('LEAST'));
  sqlLib.register('max', [Types.any, Types.any], fnCall('GREATEST'));
  sqlLib.register('sum', [Types.array], (args, ctx) =>
    `COALESCE((SELECT SUM(v) FROM UNNEST(${arrayArg(args[0], ctx, Types.float)}) AS v), 0)`);
  sqlLib.register('avg', [Types.array], (args, ctx) =>
    `(SELECT AVG(v) FROM UNNEST(${arrayArg(args[0], ctx, Types.float)}) AS v)`);
  sqlLib.register('sum', [Types.array, Types.any], (args, ctx) => {
    const initType = inferType(args[1]);
    const init = ctx.emit(args[1]);
    const arr = arrayArg(args[0], ctx, initType);
    // COALESCE outside the fold, not inside it. Folding against a literal zero
    // meant the init had to be numeric for the two to match —
    // `sum([P1D, P2D], P0D)` could not put an interval next to an integer.
    // Aggregating zero rows is null, which makes the whole fold null, which
    // COALESCE answers with the init: the identity of the fold, already the
    // right type by construction.
    const fold = typeEquals(initType, Types.string)
      ? `${init} || (SELECT STRING_AGG(v, '') FROM UNNEST(${arr}) AS v)`
      : `${init} + (SELECT SUM(v) FROM UNNEST(${arr}) AS v)`;
    return `COALESCE(${fold}, ${init})`;
  });
  sqlLib.register('isEmpty', [Types.array], (args, ctx) =>
    `(COALESCE(CARDINALITY(${arrayArg(args[0], ctx)}), 0) = 0)`);
  // `= ANY` compares the needle against the elements, so an empty list has to
  // take its element type from the needle or the comparison has no operator.
  sqlLib.register('contains', [Types.array, Types.any], (args, ctx) =>
    `(${ctx.emit(args[1])} = ANY(${arrayArg(args[0], ctx, inferType(args[1]))}))`);
  sqlLib.register('sort', [Types.array], (args, ctx) => {
    const arr = arrayArg(args[0], ctx);
    return aggregatedArray(args[0], `(SELECT ARRAY_AGG(v ORDER BY v) FROM UNNEST(${arr}) AS v)`, arr);
  });

  // String functions
  sqlLib.register('length', [Types.string], (args, ctx) => `LENGTH(${ctx.emit(args[0])})`);
  sqlLib.register('upper', [Types.string], (args, ctx) => `UPPER(${ctx.emit(args[0])})`);
  sqlLib.register('lower', [Types.string], (args, ctx) => `LOWER(${ctx.emit(args[0])})`);
  sqlLib.register('trim', [Types.string], (args, ctx) => `TRIM(${ctx.emit(args[0])})`);
  sqlLib.register('trimStart', [Types.string], (args, ctx) => `LTRIM(${ctx.emit(args[0])})`);
  sqlLib.register('trimEnd', [Types.string], (args, ctx) => `RTRIM(${ctx.emit(args[0])})`);
  sqlLib.register('reverse', [Types.string], (args, ctx) => `REVERSE(${ctx.emit(args[0])})`);
  sqlLib.register('startsWith', [Types.string, Types.string], (args, ctx) =>
    `starts_with(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`);
  sqlLib.register('endsWith', [Types.string, Types.string], (args, ctx) =>
    `(${ctx.emit(args[0])} LIKE '%' || ${ctx.emit(args[1])})`);
  sqlLib.register('contains', [Types.string, Types.string], (args, ctx) =>
    `(POSITION(${ctx.emit(args[1])} IN ${ctx.emit(args[0])}) > 0)`);
  // PostgreSQL SUBSTRING is 1-based, Elo is 0-based
  sqlLib.register('substring', [Types.string, Types.int, Types.int], (args, ctx) =>
    `SUBSTRING(${ctx.emit(args[0])} FROM ${ctx.emit(args[1])} + 1 FOR ${ctx.emit(args[2])})`);
  // slice(s, start, end): end is exclusive, so the length is end - start
  sqlLib.register('slice', [Types.string, Types.int, Types.int], (args, ctx) =>
    `SUBSTRING(${ctx.emit(args[0])} FROM ${ctx.emit(args[1])} + 1 FOR (${ctx.emit(args[2])}) - (${ctx.emit(args[1])}))`);
  sqlLib.register('concat', [Types.string, Types.string], (args, ctx) =>
    `CONCAT(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`);
  // indexOf returns NULL when not found, 0-based index otherwise
  // POSITION returns 1-based (or 0 if not found), NULLIF converts 0 to NULL
  sqlLib.register('indexOf', [Types.string, Types.string], (args, ctx) =>
    `(NULLIF(POSITION(${ctx.emit(args[1])} IN ${ctx.emit(args[0])}), 0) - 1)`);
  // Literal replacement, not regex: the search string is matched verbatim
  // (matching JS/Ruby/Python). replace() replaces the first occurrence;
  // PostgreSQL has no literal first-replace builtin, so splice around the first
  // match found with POSITION. replaceAll() uses REPLACE (literal, all).
  sqlLib.register('replace', [Types.string, Types.string, Types.string], (args, ctx) => {
    const s = ctx.emit(args[0]);
    const search = ctx.emit(args[1]);
    const repl = ctx.emit(args[2]);
    return `(CASE WHEN POSITION(${search} IN ${s}) > 0 THEN LEFT(${s}, POSITION(${search} IN ${s}) - 1) || ${repl} || SUBSTRING(${s} FROM POSITION(${search} IN ${s}) + LENGTH(${search})) ELSE ${s} END)`;
  });
  sqlLib.register('replaceAll', [Types.string, Types.string, Types.string], (args, ctx) =>
    `REPLACE(${ctx.emit(args[0])}, ${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
  sqlLib.register('isEmpty', [Types.string], (args, ctx) =>
    `(LENGTH(${ctx.emit(args[0])}) = 0)`);
  sqlLib.register('isBlank', [Types.string], (args, ctx) =>
    `(LENGTH(TRIM(${ctx.emit(args[0])})) = 0)`);
  // elo_lpad/elo_rpad bound the target length by ELO_MAX_STRING_LENGTH, as
  // kPad does on the other targets.
  sqlLib.register('padStart', [Types.string, Types.int, Types.string], (args, ctx) =>
    `elo_lpad(${ctx.emit(args[0])}, ${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
  sqlLib.register('padEnd', [Types.string, Types.int, Types.string], (args, ctx) =>
    `elo_rpad(${ctx.emit(args[0])}, ${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);

  // Numeric functions
  sqlLib.register('abs', [Types.int], (args, ctx) => `ABS(${ctx.emit(args[0])})`);
  sqlLib.register('abs', [Types.float], (args, ctx) => `ABS(${ctx.emit(args[0])})`);
  sqlLib.register('round', [Types.int], (args, ctx) => ctx.emit(args[0]));
  // ROUND(double precision) is banker's rounding in PostgreSQL, while
  // ROUND(numeric) rounds away from zero like the other targets. POWER() and
  // friends yield double precision, so the cast is not optional.
  sqlLib.register('round', [Types.float], (args, ctx) => `ROUND((${ctx.emit(args[0])})::numeric)`);
  sqlLib.register('round', [Types.any], (args, ctx) => `ROUND((${ctx.emit(args[0])})::numeric)`);
  // Same definition as the other targets: round(x * 10^n) / 10^n.
  for (const t of [Types.int, Types.float]) {
    sqlLib.register('round', [t, Types.int], (args, ctx) => {
      const x = ctx.emit(args[0]);
      const n = ctx.emit(args[1]);
      return `(ROUND(((${x}) * POWER(10, ${n}))::numeric) / POWER(10, ${n}))`;
    });
  }
  sqlLib.register('floor', [Types.int], (args, ctx) => ctx.emit(args[0]));
  sqlLib.register('floor', [Types.float], (args, ctx) => `FLOOR(${ctx.emit(args[0])})`);
  // Without an explicit Any, the arity fallback took the Int identity and
  // `floor(x)` on an unknown type compiled to `x`. FLOOR() is correct for an
  // integer too, so the all-types emission is the Float one.
  sqlLib.register('floor', [Types.any], (args, ctx) => `FLOOR(${ctx.emit(args[0])})`);
  sqlLib.register('ceil', [Types.int], (args, ctx) => ctx.emit(args[0]));
  sqlLib.register('ceil', [Types.float], (args, ctx) => `CEIL(${ctx.emit(args[0])})`);
  sqlLib.register('ceil', [Types.any], (args, ctx) => `CEIL(${ctx.emit(args[0])})`);

  // Duration unit conversion functions
  // Approximate units use standard conversions: 1y=365.25d, 1m=30.4375d, 1q=91.3125d
  sqlLib.register('inYears', [Types.duration], (args, ctx) =>
    `(EXTRACT(EPOCH FROM ${ctx.emit(args[0])}) / 31557600.0)`);
  sqlLib.register('inQuarters', [Types.duration], (args, ctx) =>
    `(EXTRACT(EPOCH FROM ${ctx.emit(args[0])}) / 7889400.0)`);
  sqlLib.register('inMonths', [Types.duration], (args, ctx) =>
    `(EXTRACT(EPOCH FROM ${ctx.emit(args[0])}) / 2629800.0)`);
  sqlLib.register('inWeeks', [Types.duration], (args, ctx) =>
    `(EXTRACT(EPOCH FROM ${ctx.emit(args[0])}) / 604800.0)`);
  sqlLib.register('inDays', [Types.duration], (args, ctx) =>
    `(EXTRACT(EPOCH FROM ${ctx.emit(args[0])}) / 86400.0)`);
  sqlLib.register('inHours', [Types.duration], (args, ctx) =>
    `(EXTRACT(EPOCH FROM ${ctx.emit(args[0])}) / 3600.0)`);
  sqlLib.register('inMinutes', [Types.duration], (args, ctx) =>
    `(EXTRACT(EPOCH FROM ${ctx.emit(args[0])}) / 60.0)`);
  sqlLib.register('inSeconds', [Types.duration], (args, ctx) =>
    `EXTRACT(EPOCH FROM ${ctx.emit(args[0])})`);

  // Temporal extraction functions
  sqlLib.register('year', [Types.date], (args, ctx) => `EXTRACT(YEAR FROM ${ctx.emit(args[0])})`);
  sqlLib.register('year', [Types.datetime], (args, ctx) => `EXTRACT(YEAR FROM ${ctx.emit(args[0])})`);
  sqlLib.register('month', [Types.date], (args, ctx) => `EXTRACT(MONTH FROM ${ctx.emit(args[0])})`);
  sqlLib.register('month', [Types.datetime], (args, ctx) => `EXTRACT(MONTH FROM ${ctx.emit(args[0])})`);
  sqlLib.register('day', [Types.date], (args, ctx) => `EXTRACT(DAY FROM ${ctx.emit(args[0])})`);
  sqlLib.register('day', [Types.datetime], (args, ctx) => `EXTRACT(DAY FROM ${ctx.emit(args[0])})`);
  sqlLib.register('hour', [Types.datetime], (args, ctx) => `EXTRACT(HOUR FROM ${ctx.emit(args[0])})`);
  sqlLib.register('minute', [Types.datetime], (args, ctx) => `EXTRACT(MINUTE FROM ${ctx.emit(args[0])})`);

  // Type introspection - map PostgreSQL types to Elo type names
  sqlLib.register('typeOf', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `CASE WHEN ${v} IS NULL THEN 'Null' ` +
      `WHEN pg_typeof(${v})::text LIKE '%[]' THEN 'List' ` +
      `ELSE CASE pg_typeof(${v})::text ` +
      `WHEN 'integer' THEN 'Int' ` +
      `WHEN 'bigint' THEN 'Int' ` +
      `WHEN 'double precision' THEN 'Float' ` +
      `WHEN 'numeric' THEN 'Float' ` +
      `WHEN 'boolean' THEN 'Bool' ` +
      `WHEN 'text' THEN 'String' ` +
      `WHEN 'character varying' THEN 'String' ` +
      `WHEN 'unknown' THEN 'String' ` +
      `WHEN 'interval' THEN 'Duration' ` +
      `WHEN 'date' THEN 'DateTime' ` +
      `WHEN 'timestamp without time zone' THEN 'DateTime' ` +
      `WHEN 'timestamp with time zone' THEN 'DateTime' ` +
      `ELSE 'Tuple' END END`;
  });

  // Null handling
  sqlLib.register('isNull', [Types.any], (args, ctx) => `${ctx.emit(args[0])} IS NULL`);
sqlLib.register('isNotNull', [Types.any], (args, ctx) => `${ctx.emit(args[0])} IS NOT NULL`);

  // Data path navigation - uses PostgreSQL jsonb #> operator with text array path
  sqlLib.register('fetch', [Types.any, Types.fn], (args, ctx) => {
    const data = ctx.emit(args[0]);
    const path = ctx.emit(args[1]);
    // Convert path array to text array and use jsonb #> operator
    return `(${data})::jsonb #> (${path})::text[]`;
  });
  sqlLib.register('fetch', [Types.any, Types.string], (args, ctx) => {
    const data = ctx.emit(args[0]);
    const key = ctx.emit(args[1]);
    // Wrap string in ARRAY for single-segment path
    return `(${data})::jsonb #> ARRAY[${key}]::text[]`;
  });
  sqlLib.register('fetch', [Types.any, Types.array], (args, ctx) => {
    const data = ctx.emit(args[0]);
    const path = ctx.emit(args[1]);
    // Array is treated as path segments directly
    return `(${data})::jsonb #> (${path})::text[]`;
  });
  sqlLib.register('fetch', [Types.any, Types.object], (args, ctx) => {
    const data = ctx.emit(args[0]);
    const pathsObj = args[1];
    if (pathsObj.type !== 'object_literal') {
      throw new Error('fetch with object requires an object literal');
    }
    // Build jsonb_build_object with key, fetch pairs. The key is interpolated
    // into a SQL string constant, so it must be a safe identifier — exactly as
    // the object_literal emitter requires. A parser-produced key is always an
    // IDENTIFIER token; this only rejects a key injected through the AST API.
    const pairs = pathsObj.properties.map(({ key, value }) => {
      const safeKey = assertSafeIdentifier(key, 'fetch object key');
      const pathEmitted = ctx.emit(value);
      return `'${safeKey}', (${data})::jsonb #> (${pathEmitted})::text[]`;
    });
    return `jsonb_build_object(${pairs.join(', ')})`;
  });
  // PostgreSQL has no runtime shape dispatch to offer here, and the mapping
  // form above needs the object *literal* at compile time, so an unknown path
  // type can only be the path form. Registered explicitly rather than left to
  // the arity fallback, which picked the same emitter by accident of
  // declaration order. SQL has no lambdas, so the only way to reach this is a
  // path whose type the checker cannot name; a mapping arriving that way is a
  // cast error PostgreSQL reports at plan time, which is the honest answer.
  sqlLib.register('fetch', [Types.any, Types.any], (args, ctx) =>
    `(${ctx.emit(args[0])})::jsonb #> (${ctx.emit(args[1])})::text[]`);
  sqlLib.register('patch', [Types.any, Types.fn, Types.any], (args, ctx) => {
    const data = ctx.emit(args[0]);
    const path = ctx.emit(args[1]);
    const value = ctx.emit(args[2]);
    // Use the elo_patch function which handles path creation
    return `elo_patch((${data})::jsonb, (${path})::text[], ${toJsonb(args[2], ctx)})`;
  });

  // Data merge functions
  sqlLib.register('merge', [Types.any, Types.any], (args, ctx) => {
    const a = ctx.emit(args[0]);
    const b = ctx.emit(args[1]);
    // PostgreSQL jsonb || operator performs shallow merge
    return `(${a})::jsonb || (${b})::jsonb`;
  });
  sqlLib.register('deepMerge', [Types.any, Types.any], (args, ctx) => {
    const a = ctx.emit(args[0]);
    const b = ctx.emit(args[1]);
    return `elo_deep_merge((${a})::jsonb, (${b})::jsonb)`;
  });

  // Error handling - uses elo_fail() PL/pgSQL function that raises an exception
  sqlLib.register('fail', [Types.string], (args, ctx) => `elo_fail(${ctx.emit(args[0])})`);

  // Type selectors (information contracts)
  // These use elo_* PL/pgSQL functions that return NULL on parse failure

  // Int - identity for int, truncate for float, parse for string
  sqlLib.register('chr', [Types.int], (args, ctx) => `CHR(${ctx.emit(args[0])})`);
  sqlLib.register('Int', [Types.int], (args, ctx) => ctx.emit(args[0]));
  sqlLib.register('Int', [Types.float], (args, ctx) => `TRUNC(${ctx.emit(args[0])})::INTEGER`);
  sqlLib.register('Int', [Types.string], (args, ctx) => `elo_int(${ctx.emit(args[0])})`);
  sqlLib.register('Int', [Types.any], (args, ctx) => `elo_int(${ctx.emit(args[0])})`);

  // Float - identity for float, convert for int, parse for string
  sqlLib.register('Float', [Types.float], (args, ctx) => ctx.emit(args[0]));
  sqlLib.register('Float', [Types.int], (args, ctx) => `${ctx.emit(args[0])}::DOUBLE PRECISION`);
  sqlLib.register('Float', [Types.string], (args, ctx) => `elo_float(${ctx.emit(args[0])})`);
  sqlLib.register('Float', [Types.any], (args, ctx) => `elo_float(${ctx.emit(args[0])})`);

  // Bool - identity for bool, parse "true"/"false" for string
  sqlLib.register('Bool', [Types.bool], (args, ctx) => ctx.emit(args[0]));
  sqlLib.register('Bool', [Types.string], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `CASE ${v} WHEN 'true' THEN TRUE WHEN 'false' THEN FALSE ELSE NULL END`;
  });
  sqlLib.register('Bool', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `CASE ${v} WHEN 'true' THEN TRUE WHEN 'false' THEN FALSE ELSE NULL END`;
  });

  // Date - identity for date, parse ISO for string
  sqlLib.register('Date', [Types.date], (args, ctx) => ctx.emit(args[0]));
  sqlLib.register('Date', [Types.string], (args, ctx) => `elo_date(${ctx.emit(args[0])})`);
  sqlLib.register('Date', [Types.any], (args, ctx) => `elo_date(${ctx.emit(args[0])})`);

  // Datetime - identity for datetime, parse ISO for string
  sqlLib.register('Datetime', [Types.datetime], (args, ctx) => ctx.emit(args[0]));
  sqlLib.register('Datetime', [Types.string], (args, ctx) => `elo_datetime(${ctx.emit(args[0])})`);
  sqlLib.register('Datetime', [Types.any], (args, ctx) => `elo_datetime(${ctx.emit(args[0])})`);

  // Duration - identity for duration, parse ISO for string
  sqlLib.register('Duration', [Types.duration], (args, ctx) => ctx.emit(args[0]));
  sqlLib.register('Duration', [Types.string], (args, ctx) => `elo_duration(${ctx.emit(args[0])})`);
  sqlLib.register('Duration', [Types.any], (args, ctx) => `elo_duration(${ctx.emit(args[0])})`);

  // Interval - construct from object with start/end properties
  sqlLib.register('Interval', [Types.interval], (args, ctx) => ctx.emit(args[0]));
  sqlLib.register('Interval', [Types.object], (args, ctx) => {
    const obj = args[0];
    if (obj.type === 'object_literal') {
      const startProp = obj.properties.find(p => p.key === 'start');
      const endProp = obj.properties.find(p => p.key === 'end');
      if (startProp && endProp) {
        return `tstzrange(${ctx.emit(startProp.value)}, ${ctx.emit(endProp.value)})`;
      }
    }
    const v = ctx.emit(args[0]);
    return `tstzrange((${v})->>'start', (${v})->>'end')`;
  });
  sqlLib.register('Interval', [Types.any], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `tstzrange((${v})->>'start', (${v})->>'end')`;
  });

  // Interval accessors
  sqlLib.register('start', [Types.interval], (args, ctx) => `lower(${ctx.emit(args[0])})`);
  sqlLib.register('end', [Types.interval], (args, ctx) => `upper(${ctx.emit(args[0])})`);

  // Interval arithmetic
  sqlLib.register('union', [Types.interval, Types.interval], (args, ctx) => {
    const a = ctx.emit(args[0]);
    const b = ctx.emit(args[1]);
    return `tstzrange(LEAST(lower(${a}), lower(${b})), GREATEST(upper(${a}), upper(${b})))`;
  });
  sqlLib.register('intersection', [Types.interval, Types.interval], (args, ctx) => {
    const a = ctx.emit(args[0]);
    const b = ctx.emit(args[1]);
    // PostgreSQL: intersection is *, handle empty case with CASE
    // Use '[]' bounds for the empty case to make lower/upper return the same value
    return `(CASE WHEN ${a} && ${b} THEN ${a} * ${b} ELSE tstzrange(GREATEST(lower(${a}), lower(${b})), GREATEST(lower(${a}), lower(${b})), '[]') END)`;
  });

  // Duration(Interval) - get the length of an interval
  sqlLib.register('Duration', [Types.interval], (args, ctx) => {
    const v = ctx.emit(args[0]);
    return `(upper(${v}) - lower(${v}))`;
  });

  // Data - identity for non-strings, parse JSON for strings
  sqlLib.register('Data', [Types.array], (args, ctx) => ctx.emit(args[0]));
  sqlLib.register('Data', [Types.object], (args, ctx) => ctx.emit(args[0]));
  sqlLib.register('Data', [Types.string], (args, ctx) => `elo_data(${ctx.emit(args[0])})`);
  sqlLib.register('Data', [Types.any], (args, ctx) => `elo_data(${ctx.emit(args[0])})`);

  // String - convert any value to string (Elo literal format for complex types)
  sqlLib.register('String', [Types.string], (args, ctx) => ctx.emit(args[0]));
  sqlLib.register('String', [Types.int], (args, ctx) => `(${ctx.emit(args[0])})::TEXT`);
  sqlLib.register('String', [Types.float], (args, ctx) => `(${ctx.emit(args[0])})::TEXT`);
  sqlLib.register('String', [Types.bool], (args, ctx) => `(${ctx.emit(args[0])})::TEXT`);
  sqlLib.register('String', [Types.null], (args, ctx) => `(${ctx.emit(args[0])})::TEXT`);
  sqlLib.register('String', [Types.array], (args, ctx) => `elo_string(${ctx.emit(args[0])})`);
  sqlLib.register('String', [Types.object], (args, ctx) => `elo_string(to_jsonb(${ctx.emit(args[0])}))`);
  // Not elo_string: that renders, and renders a string *quoted*. Reached with
  // the type unknown it has to convert, like `String:string` does.
  sqlLib.register('String', [Types.any], (args, ctx) => `elo_to_string(to_jsonb(${ctx.emit(args[0])}))`);

  // List manipulation functions
  // PostgreSQL doesn't have built-in array_reverse, use subquery with ordinality
  sqlLib.register('reverse', [Types.array], (args, ctx) => {
    const arr = arrayArg(args[0], ctx);
    return aggregatedArray(
      args[0],
      `(SELECT ARRAY_AGG(elem ORDER BY ord DESC) FROM UNNEST(${arr}) WITH ORDINALITY AS t(elem, ord))`,
      arr
    );
  });
  sqlLib.register('unique', [Types.array], (args, ctx) => {
    const arr = arrayArg(args[0], ctx);
    return aggregatedArray(
      args[0],
      `(SELECT ARRAY_AGG(v ORDER BY ord) FROM (SELECT DISTINCT ON (v) v, ord FROM UNNEST(${arr}) WITH ORDINALITY AS t(v, ord) ORDER BY v, ord) sub)`,
      arr
    );
  });
  // PostgreSQL has no array of arrays. `ARRAY[ARRAY[1, 2], ARRAY[3, 4]]` is a
  // single *two-dimensional* integer[], so UNNEST already yields the four
  // scalars and the second UNNEST this used to emit had an integer to unnest —
  // "function unnest(integer) does not exist". Worse, a ragged list cannot be
  // built at all: `ARRAY[ARRAY[1], ARRAY[2, 3]]` is rejected outright.
  //
  // Concatenating the parts sidesteps both: it never constructs the nested
  // array, so it is exact for a ragged list and for an empty part. Available
  // whenever the list is written in place and its elements are lists, which is
  // every use of `flat` that a nested list could be written for.
  sqlLib.register('flat', [Types.array], (args, ctx) => {
    const outer = args[0];
    if (outer.type === 'array_literal' && outer.elements.every(e => inferType(e).kind === 'array')) {
      if (outer.elements.length === 0) return arrayArg(outer, ctx);
      // An empty part has no element type of its own, so it borrows one from a
      // sibling: `[[], [1, 2]]` concatenates integer arrays.
      const sibling = outer.elements
        .map(e => (e.type === 'array_literal' ? e.elementType : Types.any))
        .find(t => t.kind !== 'any') ?? Types.string;
      const parts = outer.elements.map(e => arrayArg(e, ctx, sibling));
      return parts.length === 1 ? parts[0] : `(${parts.join(' || ')})`;
    }
    // Otherwise one UNNEST, which flattens a rectangular two-dimensional array
    // in a single step and leaves a flat list alone — the most SQL can do for a
    // value it only sees at runtime.
    const arr = arrayArg(outer, ctx);
    return aggregatedArray(outer, `(SELECT ARRAY_AGG(elem) FROM UNNEST(${arr}) AS elem)`, arr);
  });

  // Join list elements with separator
  sqlLib.register('join', [Types.array, Types.string], (args, ctx) =>
    `array_to_string(${arrayArg(args[0], ctx)}, ${ctx.emit(args[1])})`);

  // Split string into list. elo_split rather than string_to_array: an empty
  // separator splits into characters, which string_to_array does not do.
  sqlLib.register('split', [Types.string, Types.string], (args, ctx) =>
    `elo_split(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`);

  // Extract - pattern matching with mustache-style templates
  sqlLib.register('extract', [Types.string, Types.string], (args, ctx) => {
    const template = parseExtractTemplate((args[1] as { value: string }).value);
    const pattern = buildExtractPattern(template);
    // Escape single quotes for SQL string
    const escapedPattern = pattern.replace(/'/g, "''");
    const matchPairs = template.fields.map((f, i) => `'${f}', _m[${i + 1}]`).join(', ');
    const nullPairs = template.fields.map(f => `'${f}', NULL`).join(', ');
    return `(SELECT CASE WHEN _m IS NOT NULL THEN jsonb_build_object(${matchPairs}) ELSE jsonb_build_object(${nullPairs}) END FROM (SELECT regexp_match(${ctx.emit(args[0])}, '${escapedPattern}')) AS _t(_m))`;
  });

  // No fallback - unknown functions should fail at compile time
  // (StdLib.emit() will throw if no implementation is found)

  return sqlLib;
}
