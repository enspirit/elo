import { Expr } from '../ast';
import { IRExpr, IRCall, IRArrayLiteral, inferType, usesInput } from '../ir';
import { transform } from '../transform';
import { Types, TypeAnnotations } from '../types';
import { Emitter, emit } from './_emit';
import { createSQLBinding, isNativeBinaryOp, SQL_OP_MAP, PG_TYPE, pgTypeOf, jsonFieldPgType, jsonPath } from '../bindings/sql';
import { assertSafeIdentifier, assertSafeDatapathSegment } from './_validate';

/**
 * SQL compilation options
 */
export interface SQLCompileOptions {
  /** If true, always mark as using input (even if _ is not used) */
  asFunction?: boolean;
  /**
   * Types the checker found for the AST, from `typecheckWithAnnotations`.
   *
   * With it, a declared field or coerced value gets a typed implementation
   * instead of a runtime dispatcher. Without it the emission is exactly what
   * it always was, which is why the compile path never calls the checker
   * itself.
   */
  types?: TypeAnnotations;
  /** Dispatch every call as though no operand type were known. */
  forceDynamic?: boolean;
}

/**
 * Result of SQL compilation
 */
export interface SQLCompileResult {
  /** The generated SQL code */
  code: string;
  /** Whether the code uses the input parameter $1 */
  usesInput: boolean;
}

/**
 * SQL operator precedence (higher = binds tighter)
 */
const SQL_PRECEDENCE: Record<string, number> = {
  'OR': 0,
  'AND': 1,
  '=': 2, '<>': 2,
  '<': 3, '>': 3, '<=': 3, '>=': 3,
  '+': 4, '-': 4,
  '*': 5, '/': 5, '%': 5,
};

/** The operators PostgreSQL refuses to associate. */
const COMPARISONS = ['=', '<>', '<', '>', '<=', '>='];

/**
 * Check if an IR expression needs parentheses when used as child of a binary op
 */
function needsParens(child: IRExpr, parentOp: string, side: 'left' | 'right'): boolean {
  if (!isNativeBinaryOp(child)) return false;

  const call = child as IRCall;
  const childOp = SQL_OP_MAP[call.fn];
  if (!childOp) return false;

  const parentPrec = SQL_PRECEDENCE[parentOp] || 0;
  const childPrec = SQL_PRECEDENCE[childOp] || 0;

  if (childPrec < parentPrec) return true;
  if (childPrec === parentPrec && side === 'right' && (parentOp === '-' || parentOp === '/')) {
    return true;
  }
  // PostgreSQL's comparison operators are non-associative: `1 = 1 = TRUE` is
  // a syntax error on either side, and so is `1 < 2 = TRUE` even though `<`
  // binds tighter. A comparison inside a comparison is therefore always
  // parenthesised, whatever the precedences say.
  if (COMPARISONS.includes(parentOp) && COMPARISONS.includes(childOp)) {
    return true;
  }

  return false;
}

/**
 * The families of Elo type PostgreSQL will put in one array.
 *
 * An array carries a single element type, and the constructor coerces its
 * elements to it. Two numbers give a `numeric[]` and a Date next to a Datetime
 * gives a `timestamp[]`, both exactly; anything else mixed is rejected by
 * PostgreSQL itself — `ARRAY[1, 'two']` is "invalid input syntax for type
 * integer". Null is absent on purpose: it is a hole, not a type.
 */
const PG_ARRAY_FAMILY: Partial<Record<string, string>> = {
  int: 'number', float: 'number',
  date: 'temporal', datetime: 'temporal',
  string: 'string', bool: 'bool', duration: 'duration',
  object: 'object', array: 'array', interval: 'interval', fn: 'fn',
};

/** `int` -> `Int`, for an error message the author reads. */
function typeLabel(kind: string): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

/**
 * Refuse a list SQL cannot hold, rather than emitting an array PostgreSQL will
 * reject.
 *
 * Elo's List is heterogeneous and nests freely, which the other three targets
 * represent directly. A SQL array does neither, so these two shapes have no
 * SQL at all — and saying so here is the restriction Elo accepts in exchange
 * for being portable.
 */
function assertRepresentableList(elements: IRExpr[]): void {
  const families = new Map<string, string>();
  for (const element of elements) {
    const kind = inferType(element).kind;
    // An unknown element could be anything, so there is nothing to object to;
    // if it turns out to clash, PostgreSQL says so at plan time.
    if (kind === 'null' || kind === 'any') continue;
    const family = PG_ARRAY_FAMILY[kind];
    if (family) families.set(family, typeLabel(kind));
  }
  if (families.size > 1) {
    const found = [...families.values()].sort().join(' and ');
    throw new Error(
      `A list mixing ${found} cannot be compiled to SQL: a PostgreSQL array ` +
      `carries a single element type. Use a list of one type, or carry the ` +
      `value as Data — jsonb has no such restriction.`
    );
  }

  // A list of lists is a *two-dimensional* array on PostgreSQL, and those are
  // rectangular: `ARRAY[ARRAY[1], ARRAY[2, 3]]` is rejected as
  // "multidimensional arrays must have array expressions with matching
  // dimensions". Only provable where every part is written in place; `flat()`
  // is exempt because it concatenates the parts instead of building the nest.
  const inner = elements.filter(e => e.type === 'array_literal');
  if (inner.length === elements.length && inner.length > 1) {
    const lengths = new Set(inner.map(e => (e as IRArrayLiteral).elements.length));
    if (lengths.size > 1) {
      throw new Error(
        `A list of lists must be rectangular to compile to SQL, and this one ` +
        `mixes lengths ${[...lengths].sort((a, b) => a - b).join(' and ')}: ` +
        `PostgreSQL has no array of arrays, only multi-dimensional arrays, ` +
        `which require every part to be the same length. flat() works on a ` +
        `ragged list because it concatenates the parts.`
      );
    }
  }
}

// Create the SQL standard library binding
const sqlLib = createSQLBinding();

/**
 * Compiles Elo expressions to PostgreSQL SQL
 *
 * This compiler works in two phases:
 * 1. Transform AST to typed IR
 * 2. Emit SQL from IR
 *
 * If the expression uses `_` (input variable), it is compiled as `$1`
 * (PostgreSQL parameter placeholder).
 */
export function compileToSQL(expr: Expr, options?: SQLCompileOptions): string {
  const result = compileToSQLWithMeta(expr, options);
  return result.code;
}

/**
 * Compiles Elo expressions to SQL with metadata about input usage.
 * Use this when you need to know if the expression uses input parameter $1.
 *
 * Note: SQL compilation allows undefined variables since they represent
 * database column names, not program variables with potential global access.
 */
export function compileToSQLWithMeta(expr: Expr, options?: SQLCompileOptions): SQLCompileResult {
  // SQL allows undefined variables since they represent column names
  const ir = transform(expr, new Map(), new Set(), { allowUndefinedVariables: true, types: options?.types, forceDynamic: options?.forceDynamic });
  const needsInput = usesInput(ir) || options?.asFunction;
  // SQL's prelude is installed in the database rather than emitted, so there
  // are no helpers to collect. See `isPreludePrependable`.
  const code = emit(ir, sqlEmitter, { stripGuards: false }, new Set());

  return { code, usesInput: needsInput || false };
}

/**
 * How PostgreSQL spells each kind of IR node.
 *
 * The walk itself lives in `_emit.ts`; this is the whole of what makes the
 * emission SQL. Children arrive already emitted — except in the three cases
 * where SQL's data model genuinely differs and the node is needed too:
 * `member_access`, `array_literal` and `alternative`. See `_emit.ts`.
 */
/**
 * A PostgreSQL string constant for an arbitrary value. The single quote is
 * doubled and the backslash is doubled with an `E'...'` prefix, so the literal
 * cannot be escaped under either `standard_conforming_strings` setting. The
 * prefix is added only when it is needed, so a plain value keeps its bare
 * `'...'` form.
 */
function sqlStringConstant(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\').replace(/'/g, "''")
    .replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r');
  const prefix = escaped !== value.replace(/'/g, "''") ? 'E' : '';
  return `${prefix}'${escaped}'`;
}

const sqlEmitter: Emitter = {
  lib: sqlLib,
  needsParens,

  boolLiteral: (value) => (value ? 'TRUE' : 'FALSE'),
  nullLiteral: 'NULL',

  // Single quotes, with a quote escaped by doubling. E'...' only when the
  // string really holds an escape sequence.
  stringLiteral: (value) => sqlStringConstant(value),

  // A typed temporal literal is `DATE <string constant>`: the value must be
  // escaped exactly like any other string constant, backslash included.
  // Doubling the quote alone left a backslash raw, so under
  // standard_conforming_strings=off a value ending in `\` escaped the closing
  // quote and let trailing bytes become SQL (AST-API injection).
  dateLiteral: (value) => `DATE ${sqlStringConstant(value)}`,

  // ISO8601 to the PostgreSQL TIMESTAMP format
  datetimeLiteral: (value) => {
    const formatted = value.replace('T', ' ').replace('Z', '').split('.')[0];
    return `TIMESTAMP ${sqlStringConstant(formatted)}`;
  },

  durationLiteral: (value) => `INTERVAL ${sqlStringConstant(value)}`,

  objectLiteral: (properties) => {
    if (properties.length === 0) return `'{}'::jsonb`;
    const args = properties
      .map(p => `'${assertSafeIdentifier(p.key, 'object_literal key')}', ${p.value}`)
      .join(', ');
    return `jsonb_build_object(${args})`;
  },

  arrayLiteral: (elements, ir) => {
    // PostgreSQL rejects `ARRAY[]`: an array constructor takes its element
    // type from its elements, and there are none. The typed empty-array
    // literal is the way to write it, with the element type the list carries.
    // Reached where nothing else supplies one — `typeOf([])` — so the fallback
    // only has to be *an* array.
    if (ir.elements.length === 0) {
      return `'{}'::${PG_TYPE[ir.elementType.kind] ?? 'text'}[]`;
    }
    assertRepresentableList(ir.elements);
    return `ARRAY[${elements.join(', ')}]`;
  },

  // _ is the input, which is a parameter placeholder
  variable: (name) => (name === '_' ? '$1' : assertSafeIdentifier(name, 'variable name')),

  memberAccess: (object, property, ir, ctx) => {
    const prop = assertSafeIdentifier(property, 'member_access property');
    const resolved = jsonPath(ir);

    if (resolved) {
      // A chain collapses into one read against the json root, which is not
      // `ir.object`, so this emits the root itself rather than using the
      // object the walk already emitted.
      const root = ctx.emit(resolved.root);
      const rootExpr = isNativeBinaryOp(resolved.root) ? `(${root})` : root;
      const keys = resolved.path.map(
        key => `'${assertSafeIdentifier(key, 'member_access property')}'`
      );
      // One key is `->>`; a path needs `#>>`, because `jsonb->>'user'` is
      // *text* and reading `.name` off that is not a json operation at all.
      const read = keys.length === 1
        ? `${rootExpr}->>${keys[0]}`
        : `${rootExpr} #>> ARRAY[${keys.join(', ')}]`;
      // Parenthesised whether or not it is cast: PostgreSQL binds `||` tighter
      // than `->>`, so a bare `a->>'x' || b->>'y'` parses as
      // `a ->> ('x' || b) ->> 'y'` and fails with "operator does not exist:
      // text ->> unknown". A cast used to hide that by parenthesising as a
      // side effect, which held only as long as every read was cast.
      //
      // The read itself is text whatever the field holds. Where the field's
      // type is known the cast says so and the value composes like any other;
      // a String field needs none, since text is what the read already is.
      const pg = jsonFieldPgType(ir.inferredType);
      return pg ? `(${read})::${pg}` : `(${read})`;
    }

    // The input is a *row* on SQL, not a document: `_.person.age` is a field
    // reference, which is what a host passing a record expects.
    const objectExpr = isNativeBinaryOp(ir.object) ? `(${object})` : object;
    return `${objectExpr}.${prop}`;
  },

  // Bindings are sequential: a binding may use the previous ones. SQL cannot
  // reference an alias within the same SELECT list, so each binding gets its
  // own scope and they are nested here — the other targets emit a flat
  // sequence from the same flattened list.
  letExpr: (bindings, body) => {
    const nest = (index: number): string => {
      const binding = bindings[index];
      const column = `${binding.value} AS ${assertSafeIdentifier(binding.name, 'let binding name')}`;
      const inner = index === bindings.length - 1 ? body : nest(index + 1);
      return `(SELECT ${inner} FROM (SELECT ${column}) AS _let)`;
    };
    return nest(0);
  },

  ifExpr: (condition, then, otherwise) =>
    `CASE WHEN ${condition} THEN ${then} ELSE ${otherwise} END`,

  // COALESCE returns the first non-NULL value, but needs one type for all its
  // arguments where Elo does not: `tuple.x | 0` is a String with an Int
  // default, and a json field read is text, so PostgreSQL refuses to match
  // them. The alternative's value is the first one's, so that is the type the
  // rest are brought to.
  alternative: (alternatives) => {
    const target = pgTypeOf(alternatives[0].node);
    const conflict = target !== null && alternatives.some(({ node }) => {
      const type = pgTypeOf(node);
      return type !== null && type !== target;
    });
    const alts = alternatives
      .map(({ code, node }) =>
        !conflict || pgTypeOf(node) === target ? code : `(${code})::${target}`)
      .join(', ');
    return `COALESCE(${alts})`;
  },

  datapath: (segments) => {
    const emitted = segments.map(s => {
      const safe = assertSafeDatapathSegment(s);
      return typeof safe === 'string' ? `'${safe}'` : safe.toString();
    });
    return `ARRAY[${emitted.join(', ')}]`;
  },

  // A type definition and a guard have no SQL at all, which is a restriction
  // Elo accepts in exchange for being portable.
  unsupported: {
    lambda: 'Lambda expressions are not supported in SQL target',
    apply: 'Lambda invocation is not supported in SQL target',
    typedef: 'Type definitions are not yet supported in SQL compilation',
    guard: 'Guard expressions are not supported in SQL compilation',
  },
};

