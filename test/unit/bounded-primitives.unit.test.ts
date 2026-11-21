import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EloType, Types } from '../../src/types';
import { IRExpr, irVariable, irDataPath } from '../../src/ir';
import { StdLib, EmitContext } from '../../src/stdlib';
import { createJavaScriptBinding } from '../../src/bindings/javascript';
import { createRubyBinding } from '../../src/bindings/ruby';
import { createPythonBinding } from '../../src/bindings/python';
import { createSQLBinding } from '../../src/bindings/sql';

/**
 * Every path through a bounded primitive is bounded.
 *
 * One sentence describes every allocation bug Elo has had: **the helper exists
 * and some path did not call it.**
 *
 *  - `s * n` was bounded by `kRepeat` on the typed path and ran Ruby's
 *    unbounded `String#*` on the dynamic one (1.2.4);
 *  - `padStart`/`padEnd` were bounded on three targets and used bare `LPAD`
 *    on SQL (1.2.3);
 *  - `patch` grew an array one element per step with no cap (1.2.3);
 *  - `[1] * n` repeated an array unbounded on Ruby and Python (1.1.0);
 *  - `a ^ b` built an exact bignum on Ruby and Python (1.2.4);
 *  - `x % n` on a String ran `sprintf` (1.2.4).
 *
 * Never "the helper was wrong". Always a cell of
 * (operation × operand types × target) that nobody had enumerated.
 *
 * So this enumerates it. For every signature of every bounded operation that
 * any target registers, the emission must either **name the bounded helper**
 * or be classified as native with a reason. The classification is complete by
 * construction: a signature nobody has decided about fails the test, so adding
 * `mul:duration,string` to one target cannot quietly skip the bound.
 *
 * What this does *not* check is that the bound bites — that the helper refuses
 * a large input rather than merely being called. That is
 * `test/fixtures/security/bounded-primitives.elo`, executed on every target.
 */

/** A bounded operation: one whose output can be disproportionate to its input. */
const BOUNDED_OPERATIONS = [
  'mul', 'pow', 'mod', 'at', 'patch', 'padStart', 'padEnd', 'replace', 'replaceAll',
];

/** Either the bound lives in a helper this signature calls, or it does not need one. */
type Expectation = { helper: string } | { native: string };

// The reasons a native emission needs no helper. Shared rather than repeated,
// so that each is stated once and argued once.

const NUMERIC: Expectation = {
  native:
    'Native arithmetic on two machine numbers. The result is one number whose size '
    + 'does not depend on the operands, so there is nothing to bound. These typed '
    + 'fast paths exist precisely so that only the *unknown*-type case pays for a '
    + 'dispatcher.',
};

const DURATION_SCALE: Expectation = {
  native:
    'Scaling a duration rebuilds a fixed set of unit fields. The output is one '
    + 'duration whatever the factor, so it allocates nothing proportional to it.',
};

const LITERAL_REPLACE: Expectation = {
  native:
    'The replacement is inserted verbatim — a function replacement on JavaScript, a '
    + 'block on Ruby, native semantics on Python and SQL. That is the 1.2.3 fix: a '
    + '`$\'` pattern used to expand the output superlinearly, and literal insertion '
    + 'bounds the result at input x 1 without needing a cap.',
};

const INLINE_GUARD: Expectation = {
  native:
    'The guard is emitted inline rather than in a helper: the index is checked '
    + 'against the array length (and, on the dynamic path, for being an Integer) in '
    + 'the emitted expression itself. Bounded, but worth knowing it is not kAt — a '
    + 'change here is not covered by a change to the helper.',
};

const SQL_NO_OBJECT_MODEL: Expectation = {
  native:
    'SQL array subscripting returns NULL out of range and has no object model to '
    + 'walk, so there is no meta-property to reach and no bound to enforce. The '
    + 'index is cast to numeric.',
};

const SQL_DOUBLE: Expectation = {
  native:
    'PostgreSQL POWER answers a double precision, never an exact bignum, so the '
    + 'result is one machine number. This is why the exponentiation cap that '
    + 'JavaScript, Ruby and Python need does not apply here.',
};

const SQL_TYPED_OPERANDS: Expectation = {
  native:
    'SQL has no lambdas, so an `any` operand can only come from an untyped column '
    + 'reference, and PostgreSQL refuses `text * integer` rather than repeating. The '
    + 'String case is routed through elo_repeat separately.',
};

/**
 * What each signature must do. Complete: every registered signature of every
 * name in BOUNDED_OPERATIONS, on every target, appears exactly once.
 */
const EXPECTED: Record<string, Record<string, Expectation>> = {
  javascript: {
    'at:any,any': { helper: 'kAt' },
    // A bare `x[k]` is emitted only for a compile-time integer literal index,
    // which can never name a meta-property; anything else takes kAt. The test
    // below passes a *variable* index, so this must be the guarded form — that
    // is the 1.2.4 typed-at() sandbox escape.
    'at:array,int': { helper: 'kAt' },
    'mod:any,any': { helper: 'kMod' },
    'mod:float,float': { helper: 'kMod' },
    'mod:float,int': { helper: 'kMod' },
    'mod:int,float': { helper: 'kMod' },
    'mod:int,int': { helper: 'kMod' },
    'mul:any,any': { helper: 'kMul' },
    'mul:duration,float': DURATION_SCALE,
    'mul:duration,int': DURATION_SCALE,
    'mul:float,duration': DURATION_SCALE,
    'mul:float,float': NUMERIC,
    'mul:float,int': NUMERIC,
    'mul:int,duration': DURATION_SCALE,
    'mul:int,float': NUMERIC,
    'mul:int,int': NUMERIC,
    'mul:int,string': { helper: 'kRepeat' },
    'mul:string,int': { helper: 'kRepeat' },
    'padEnd:any,int,string': { helper: 'kPad' },
    'padEnd:string,int,string': { helper: 'kPad' },
    'padStart:any,int,string': { helper: 'kPad' },
    'padStart:string,int,string': { helper: 'kPad' },
    'patch:any,fn,any': { helper: 'kPatch' },
    'pow:any,any': { helper: 'kPow' },
    'pow:float,float': { helper: 'kPow' },
    'pow:float,int': { helper: 'kPow' },
    'pow:int,float': { helper: 'kPow' },
    'pow:int,int': { helper: 'kPow' },
    'replace:any,string,string': LITERAL_REPLACE,
    'replace:string,string,string': LITERAL_REPLACE,
    'replaceAll:any,string,string': LITERAL_REPLACE,
    'replaceAll:string,string,string': LITERAL_REPLACE,
  },
  ruby: {
    'at:any,any': INLINE_GUARD,
    'at:array,int': INLINE_GUARD,
    'mod:any,any': { helper: 'k_mod' },
    'mod:float,float': NUMERIC,
    'mod:float,int': NUMERIC,
    'mod:int,float': NUMERIC,
    'mod:int,int': NUMERIC,
    'mul:any,any': { helper: 'k_mul' },
    'mul:float,float': NUMERIC,
    'mul:float,int': NUMERIC,
    'mul:int,float': NUMERIC,
    'mul:int,int': NUMERIC,
    'mul:int,string': { helper: 'k_str_mul' },
    'mul:string,int': { helper: 'k_str_mul' },
    'padEnd:any,int,string': { helper: 'k_pad' },
    'padEnd:string,int,string': { helper: 'k_pad' },
    'padStart:any,int,string': { helper: 'k_pad' },
    'padStart:string,int,string': { helper: 'k_pad' },
    'patch:any,fn,any': { helper: 'k_patch' },
    'pow:any,any': { helper: 'k_pow' },
    'replace:any,string,string': LITERAL_REPLACE,
    'replace:string,string,string': LITERAL_REPLACE,
    'replaceAll:any,string,string': LITERAL_REPLACE,
    'replaceAll:string,string,string': LITERAL_REPLACE,
  },
  python: {
    'at:any,any': INLINE_GUARD,
    'at:array,int': { helper: 'kAt' },
    'mod:any,any': { helper: 'kMod' },
    'mod:float,float': NUMERIC,
    'mod:float,int': NUMERIC,
    'mod:int,float': NUMERIC,
    'mod:int,int': NUMERIC,
    'mul:any,any': { helper: 'kMul' },
    'mul:float,float': NUMERIC,
    'mul:float,int': NUMERIC,
    'mul:int,float': NUMERIC,
    'mul:int,int': NUMERIC,
    'mul:int,string': { helper: 'kStrMul' },
    'mul:string,int': { helper: 'kStrMul' },
    'padEnd:string,int,string': { helper: 'kPad' },
    'padStart:string,int,string': { helper: 'kPad' },
    'patch:any,any,any': { helper: 'kPatch' },
    'pow:any,any': { helper: 'kPow' },
    'pow:float,float': { helper: 'kPow' },
    'pow:float,int': { helper: 'kPow' },
    'pow:int,float': { helper: 'kPow' },
    'pow:int,int': { helper: 'kPow' },
    'replace:string,string,string': LITERAL_REPLACE,
    'replaceAll:string,string,string': LITERAL_REPLACE,
  },
  sql: {
    'at:array,int': SQL_NO_OBJECT_MODEL,
    'mod:any,any': SQL_TYPED_OPERANDS,
    'mul:any,any': SQL_TYPED_OPERANDS,
    'mul:int,string': { helper: 'elo_repeat' },
    'mul:string,int': { helper: 'elo_repeat' },
    'padEnd:string,int,string': { helper: 'elo_rpad' },
    'padStart:string,int,string': { helper: 'elo_lpad' },
    'patch:any,fn,any': { helper: 'elo_patch' },
    'pow:any,any': SQL_DOUBLE,
    'replace:string,string,string': LITERAL_REPLACE,
    'replaceAll:string,string,string': LITERAL_REPLACE,
  },
};

const TARGETS: Record<string, () => StdLib<string>> = {
  javascript: createJavaScriptBinding,
  ruby: createRubyBinding,
  python: createPythonBinding,
  sql: createSQLBinding,
};

const TYPE_BY_NAME: Record<string, EloType> = {
  int: Types.int,
  float: Types.float,
  string: Types.string,
  bool: Types.bool,
  any: Types.any,
  array: Types.array,
  object: Types.object,
  duration: Types.duration,
  date: Types.date,
  datetime: Types.datetime,
};

/**
 * A stand-in IR node of the given type.
 *
 * A *variable* rather than a literal, on purpose: an emitter is allowed to
 * special-case a compile-time literal — JavaScript's `at` emits a bare bracket
 * read for an integer literal index, which is safe because a literal cannot
 * name a meta-property — and the question this test asks is what happens to a
 * value that arrives at runtime. A `fn`-typed argument is a datapath, which is
 * what `patch` and the `fetch` forms actually receive.
 */
function stubArg(typeName: string): IRExpr {
  if (typeName === 'fn') return irDataPath(['a']);
  return irVariable('v', TYPE_BY_NAME[typeName] ?? Types.any);
}

/** Emit one signature, collecting both the helpers it asked for and its code. */
function emitSignature(lib: StdLib<string>, key: string): { code: string; helpers: string[] } {
  const [name, typeList] = key.split(':');
  const typeNames = typeList ? typeList.split(',') : [];
  const argTypes = typeNames.map(n => TYPE_BY_NAME[n] ?? Types.any);
  const impl = lib.lookup(name, argTypes);
  if (!impl) throw new Error(`no implementation for ${key}`);

  const helpers: string[] = [];
  const args = typeNames.map(stubArg);
  const ctx: EmitContext<string> = {
    timezone: 'UTC',
    emit: () => 'v',
    emitWithParens: () => 'v',
    requireHelper: h => helpers.push(h),
  };
  return { code: impl(args, ctx), helpers };
}

describe('Every path through a bounded primitive is bounded', () => {
  for (const [target, makeBinding] of Object.entries(TARGETS)) {
    const lib = makeBinding();
    const registered = lib.signatureKeys()
      .filter(key => BOUNDED_OPERATIONS.includes(key.split(':')[0]))
      .sort();
    const expected = EXPECTED[target];

    it(`${target}: every bounded signature is classified`, () => {
      const unclassified = registered.filter(key => !(key in expected));
      assert.deepStrictEqual(
        unclassified,
        [],
        `${target}: ${unclassified.length} signature(s) of a bounded operation with no `
        + 'entry in EXPECTED. Decide: does it route through the bounded helper, or is it '
        + 'native for a reason worth writing down? Every allocation bug Elo has had was '
        + `a cell nobody had decided about.\n\n${unclassified.map(k => `  ${k}`).join('\n')}`
      );
    });

    it(`${target}: no stale classification`, () => {
      const stale = Object.keys(expected).filter(key => !registered.includes(key)).sort();
      assert.deepStrictEqual(
        stale, [],
        `${target}: EXPECTED classifies ${stale.length} signature(s) the binding no longer `
        + `registers.\n\n${stale.map(k => `  ${k}`).join('\n')}`
      );
    });

    for (const key of registered) {
      const expectation = expected[key];
      if (!expectation || !('helper' in expectation)) continue;

      it(`${target}: ${key} routes through ${expectation.helper}`, () => {
        const { code, helpers } = emitSignature(lib, key);
        // Either collected through requireHelper, or named in the emitted code:
        // SQL's prelude is installed in the database rather than emitted, so its
        // bindings name `elo_*` helpers without collecting them.
        const routed = helpers.includes(expectation.helper)
          || new RegExp(`\\b${expectation.helper}\\s*\\(`).test(code);
        assert.ok(
          routed,
          `${target}: ${key} must route through ${expectation.helper} — that is where its `
          + `bound lives. Emitted instead:\n\n  ${code}\n`
        );
      });
    }
  }

  it('every native classification carries a reason', () => {
    for (const [target, entries] of Object.entries(EXPECTED)) {
      for (const [key, expectation] of Object.entries(entries)) {
        if ('native' in expectation) {
          assert.ok(
            expectation.native.length > 40,
            `${target}: ${key} is classified native with no real reason`
          );
        }
      }
    }
  });
});
