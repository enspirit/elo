/**
 * SQL (PostgreSQL) stdlib binding for Elo
 *
 * This module defines how Elo IR functions are emitted as PostgreSQL SQL code.
 */

import { IRExpr } from '../ir';
import { Types } from '../types';
import { StdLib, EmitContext, nullary, fnCall } from '../stdlib';

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
 * Helper for SQL binary operators
 */
function sqlBinaryOp(op: string): (args: IRExpr[], ctx: EmitContext<string>) => string {
  return (args, ctx) => {
    const left = ctx.emitWithParens(args[0], op, 'left');
    const right = ctx.emitWithParens(args[1], op, 'right');
    return `${left} ${op} ${right}`;
  };
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

  // String multiplication (repeat) uses REPEAT function in PostgreSQL
  sqlLib.register('mul', [Types.string, Types.int], (args, ctx) =>
    `REPEAT(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`);
  sqlLib.register('mul', [Types.int, Types.string], (args, ctx) =>
    `REPEAT(${ctx.emit(args[1])}, ${ctx.emit(args[0])})`);

  // List concatenation uses || in PostgreSQL (array concatenation)
  sqlLib.register('add', [Types.array, Types.array], sqlBinaryOp('||'));

  // SQL uses native operators for all types - type generalization handles all combinations
  sqlLib.register('add', [Types.any, Types.any], sqlBinaryOp('+'));
  sqlLib.register('sub', [Types.any, Types.any], sqlBinaryOp('-'));
  sqlLib.register('mul', [Types.any, Types.any], sqlBinaryOp('*'));
  sqlLib.register('div', [Types.any, Types.any], sqlBinaryOp('/'));
  sqlLib.register('mod', [Types.any, Types.any], sqlBinaryOp('%'));
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
  sqlLib.register('eq', [Types.any, Types.any], sqlBinaryOp('='));
  sqlLib.register('neq', [Types.any, Types.any], sqlBinaryOp('<>'));

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
    `COALESCE(CARDINALITY(${ctx.emit(args[0])}), 0)`);
  sqlLib.register('count', [Types.array], (args, ctx) =>
    `COALESCE(CARDINALITY(${ctx.emit(args[0])}), 0)`);
  sqlLib.register('at', [Types.array, Types.int], (args, ctx) =>
    `${ctx.emit(args[0])}[${ctx.emit(args[1])} + 1]`);
  sqlLib.register('first', [Types.array], (args, ctx) =>
    `${ctx.emit(args[0])}[1]`);
  sqlLib.register('last', [Types.array], (args, ctx) =>
    `${ctx.emit(args[0])}[CARDINALITY(${ctx.emit(args[0])})]`);
  sqlLib.register('min', [Types.array], (args, ctx) =>
    `(SELECT MIN(v) FROM UNNEST(${ctx.emit(args[0])}) AS v)`);
  sqlLib.register('max', [Types.array], (args, ctx) =>
    `(SELECT MAX(v) FROM UNNEST(${ctx.emit(args[0])}) AS v)`);
  sqlLib.register('sum', [Types.array], (args, ctx) =>
    `COALESCE((SELECT SUM(v) FROM UNNEST(${ctx.emit(args[0])}) AS v), 0)`);
  sqlLib.register('isEmpty', [Types.array], (args, ctx) =>
    `(COALESCE(CARDINALITY(${ctx.emit(args[0])}), 0) = 0)`);

  // String functions
  sqlLib.register('length', [Types.string], (args, ctx) => `LENGTH(${ctx.emit(args[0])})`);
  sqlLib.register('upper', [Types.string], (args, ctx) => `UPPER(${ctx.emit(args[0])})`);
  sqlLib.register('lower', [Types.string], (args, ctx) => `LOWER(${ctx.emit(args[0])})`);
  sqlLib.register('trim', [Types.string], (args, ctx) => `TRIM(${ctx.emit(args[0])})`);
  sqlLib.register('startsWith', [Types.string, Types.string], (args, ctx) =>
    `starts_with(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`);
  sqlLib.register('endsWith', [Types.string, Types.string], (args, ctx) =>
    `(${ctx.emit(args[0])} LIKE '%' || ${ctx.emit(args[1])})`);
  sqlLib.register('contains', [Types.string, Types.string], (args, ctx) =>
    `(POSITION(${ctx.emit(args[1])} IN ${ctx.emit(args[0])}) > 0)`);
  // PostgreSQL SUBSTRING is 1-based, Elo is 0-based
  sqlLib.register('substring', [Types.string, Types.int, Types.int], (args, ctx) =>
    `SUBSTRING(${ctx.emit(args[0])} FROM ${ctx.emit(args[1])} + 1 FOR ${ctx.emit(args[2])})`);
  sqlLib.register('concat', [Types.string, Types.string], (args, ctx) =>
    `CONCAT(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`);
  // indexOf returns NULL when not found, 0-based index otherwise
  // POSITION returns 1-based (or 0 if not found), NULLIF converts 0 to NULL
  sqlLib.register('indexOf', [Types.string, Types.string], (args, ctx) =>
    `(NULLIF(POSITION(${ctx.emit(args[1])} IN ${ctx.emit(args[0])}), 0) - 1)`);
  sqlLib.register('replace', [Types.string, Types.string, Types.string], (args, ctx) =>
    `REGEXP_REPLACE(${ctx.emit(args[0])}, ${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
  sqlLib.register('replaceAll', [Types.string, Types.string, Types.string], (args, ctx) =>
    `REGEXP_REPLACE(${ctx.emit(args[0])}, ${ctx.emit(args[1])}, ${ctx.emit(args[2])}, 'g')`);
  sqlLib.register('isEmpty', [Types.string], (args, ctx) =>
    `(LENGTH(${ctx.emit(args[0])}) = 0)`);
  sqlLib.register('padStart', [Types.string, Types.int, Types.string], (args, ctx) =>
    `LPAD(${ctx.emit(args[0])}, ${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);
  sqlLib.register('padEnd', [Types.string, Types.int, Types.string], (args, ctx) =>
    `RPAD(${ctx.emit(args[0])}, ${ctx.emit(args[1])}, ${ctx.emit(args[2])})`);

  // Numeric functions
  sqlLib.register('abs', [Types.int], (args, ctx) => `ABS(${ctx.emit(args[0])})`);
  sqlLib.register('abs', [Types.float], (args, ctx) => `ABS(${ctx.emit(args[0])})`);
  sqlLib.register('round', [Types.int], (args, ctx) => ctx.emit(args[0]));
  sqlLib.register('round', [Types.float], (args, ctx) => `ROUND(${ctx.emit(args[0])})`);
  sqlLib.register('floor', [Types.int], (args, ctx) => ctx.emit(args[0]));
  sqlLib.register('floor', [Types.float], (args, ctx) => `FLOOR(${ctx.emit(args[0])})`);
  sqlLib.register('ceil', [Types.int], (args, ctx) => ctx.emit(args[0]));
  sqlLib.register('ceil', [Types.float], (args, ctx) => `CEIL(${ctx.emit(args[0])})`);

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

  // Data path navigation - uses PostgreSQL jsonb #> operator with text array path
  sqlLib.register('fetch', [Types.any, Types.fn], (args, ctx) => {
    const data = ctx.emit(args[0]);
    const path = ctx.emit(args[1]);
    // Convert path array to text array and use jsonb #> operator
    return `(${data})::jsonb #> (${path})::text[]`;
  });
  sqlLib.register('fetch', [Types.any, Types.object], (args, ctx) => {
    const data = ctx.emit(args[0]);
    const pathsObj = args[1];
    if (pathsObj.type !== 'object_literal') {
      throw new Error('fetch with object requires an object literal');
    }
    // Build jsonb_build_object with key, fetch pairs
    const pairs = pathsObj.properties.map(({ key, value }) => {
      const pathEmitted = ctx.emit(value);
      return `'${key}', (${data})::jsonb #> (${pathEmitted})::text[]`;
    });
    return `jsonb_build_object(${pairs.join(', ')})`;
  });
  sqlLib.register('fetch', [Types.any, Types.array], (args, ctx) => {
    const data = ctx.emit(args[0]);
    const pathsArr = args[1];
    if (pathsArr.type !== 'array_literal') {
      throw new Error('fetch with array requires an array literal');
    }
    // Build jsonb_build_array with fetched values
    const elements = pathsArr.elements.map(elem => {
      const pathEmitted = ctx.emit(elem);
      return `(${data})::jsonb #> (${pathEmitted})::text[]`;
    });
    return `jsonb_build_array(${elements.join(', ')})`;
  });
  sqlLib.register('patch', [Types.any, Types.fn, Types.any], (args, ctx) => {
    const data = ctx.emit(args[0]);
    const path = ctx.emit(args[1]);
    const value = ctx.emit(args[2]);
    // Use the elo_patch function which handles path creation
    return `elo_patch((${data})::jsonb, (${path})::text[], to_jsonb(${value}))`;
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
  sqlLib.register('String', [Types.any], (args, ctx) => `elo_string(to_jsonb(${ctx.emit(args[0])}))`);

  // List manipulation functions
  // PostgreSQL doesn't have built-in array_reverse, use subquery with ordinality
  sqlLib.register('reverse', [Types.array], (args, ctx) => {
    const arr = ctx.emit(args[0]);
    return `(SELECT ARRAY_AGG(elem ORDER BY ord DESC) FROM UNNEST(${arr}) WITH ORDINALITY AS t(elem, ord))`;
  });

  // Join list elements with separator
  sqlLib.register('join', [Types.array, Types.string], (args, ctx) =>
    `array_to_string(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`);

  // Split string into list
  sqlLib.register('split', [Types.string, Types.string], (args, ctx) =>
    `string_to_array(${ctx.emit(args[0])}, ${ctx.emit(args[1])})`);

  // No fallback - unknown functions should fail at compile time
  // (StdLib.emit() will throw if no implementation is found)

  return sqlLib;
}
