import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StdLib, EmitContext, signatureKey } from '../../src/stdlib';
import { parseSignatureKey } from '../../src/typedefs';
import { Types } from '../../src/types';
import { IRExpr, irVariable } from '../../src/ir';
import { createJavaScriptBinding } from '../../src/bindings/javascript';
import { createRubyBinding } from '../../src/bindings/ruby';
import { createSQLBinding } from '../../src/bindings/sql';
import { createPythonBinding } from '../../src/bindings/python';

/**
 * Ambiguous arity fallback.
 *
 * `StdLib.lookup` tries generalizations of the argument types and, when an
 * argument is `any` and nothing matched, returns the *first registered*
 * implementation of that name and arity. The pick is therefore decided by the
 * order registrations appear in the binding file, which is not a semantic.
 *
 * Most of the time that is harmless: a single candidate exists, so picking it
 * is both necessary and correct (`count(Any)`, `sum(Any)`, `first(Any)`). The
 * problem is a name whose candidates *emit different code*: `floor(_)` on SQL
 * used to compile to `$1`, because `floor(Int)` is an identity and happened to
 * be registered first.
 *
 * The fix is per-name, not mechanical (removing the fallback breaks the
 * harmless majority), so this test pins the remaining ambiguous
 * (name, arity) pairs per target to an explicit list. Adding one becomes
 * deliberate, and resolving one — by registering an all-`Any` signature that
 * is correct for every runtime type — makes the test demand its removal here.
 *
 * What it cannot check is whether an all-`Any` registration is *right*: it only
 * sees that a choice was made. JavaScript's `reverse(Any)` was registered along
 * with the String functions and raised `split is not a function` on a list; only
 * an acceptance assertion per runtime type catches that, which is what
 * `reference/dynamic-reverse-dispatch.elo` is for.
 */

const targets: Array<[string, StdLib<string>]> = [
  ['javascript', createJavaScriptBinding()],
  ['ruby', createRubyBinding()],
  ['sql', createSQLBinding()],
  ['python', createPythonBinding()],
];

/**
 * (name, arity) pairs whose candidates emit different code, so the fallback's
 * choice is arbitrary. Each needs an all-`Any` registration that is correct
 * for every runtime type; until then the emission is whatever was registered
 * first. The value says what the ambiguity is about.
 */
const AMBIGUOUS: Record<string, Record<string, string>> = {
  javascript: {},
  ruby: {},
  sql: {
    // `fetch/2` was here on all four targets. It is resolved everywhere now:
    // the other three dispatch on the path's runtime shape (kFetchAny), and
    // SQL — which has no runtime shape to dispatch on, and whose mapping form
    // needs the object *literal* at compile time — registers the path form
    // explicitly, so the choice is made on purpose rather than by declaration
    // order. See the `fetch:any,any` comment in src/bindings/sql.ts.
    //
    // PostgreSQL type-checks both arms of a CASE even when only one can run,
    // so these cannot dispatch on pg_typeof inside an expression. They need a
    // known type, and saying so is a language decision, not a patch.
    'length/1': 'LENGTH for a string versus CARDINALITY for an array',
    'isEmpty/1': 'string emptiness versus array emptiness',
    'contains/2': 'POSITION for a string versus = ANY for an array',
    'reverse/1': 'REVERSE for a string versus an ordinality subquery for an array',
  },
  python: {},
};

/** An emit context that renders stand-in arguments by name. */
function standInContext(): EmitContext<string> {
  const emit = (ir: IRExpr): string =>
    ir.type === 'variable' ? ir.name : `<${ir.type}>`;
  return { emit, emitWithParens: emit, requireHelper: () => {} };
}

/** Emit one candidate signature with stand-in arguments. */
function emitCandidate(lib: StdLib<string>, key: string): string {
  const { name, argTypes } = parseSignatureKey(key);
  const impl = lib.lookup(name, argTypes);
  if (!impl) return `<unreachable>`;
  const args = argTypes.map((_, i) => irVariable(String.fromCharCode(97 + i)));
  try {
    return impl(args, standInContext());
  } catch (e) {
    // An emitter that rejects a stand-in (fetch with an object literal, say)
    // still emits something different from its siblings.
    return `<throws: ${(e as Error).message}>`;
  }
}

/**
 * (name, arity) pairs of a target whose fallback pick is arbitrary: several
 * candidates, no explicit all-`Any` signature, and the candidates disagree on
 * what to emit.
 */
function ambiguousPairs(lib: StdLib<string>): string[] {
  const registered = new Set(lib.signatureKeys());
  const byArity = new Map<string, string[]>();
  for (const key of lib.signatureKeys()) {
    const { name, argTypes } = parseSignatureKey(key);
    const pair = `${name}/${argTypes.length}`;
    byArity.set(pair, [...(byArity.get(pair) ?? []), key]);
  }

  const ambiguous: string[] = [];
  for (const [pair, keys] of byArity) {
    if (keys.length < 2) continue;
    const [name, arity] = pair.split('/');
    // An explicit all-`Any` signature settles the question: lookup matches it
    // through generalization and never reaches the fallback.
    const allAny = Array(Number(arity)).fill(Types.any);
    if (registered.has(signatureKey(name, allAny))) continue;
    const emissions = new Set(keys.map(k => emitCandidate(lib, k)));
    if (emissions.size > 1) ambiguous.push(pair);
  }
  return ambiguous.sort();
}

describe('Ambiguous arity fallback', () => {
  for (const [target, lib] of targets) {
    it(`${target} has no unlisted ambiguous dispatch`, () => {
      const found = ambiguousPairs(lib);
      const listed = Object.keys(AMBIGUOUS[target] ?? {});
      assert.deepStrictEqual(
        found,
        listed.sort(),
        `the arity fallback picks arbitrarily for these ${target} names. ` +
        `Register an all-Any signature that is correct for every runtime ` +
        `type, or list the pair in AMBIGUOUS with what the ambiguity is about.`
      );
    });
  }
});
