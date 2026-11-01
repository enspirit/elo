import { describe, it } from 'node:test';
import assert from 'node:assert';
import { eloTypeDefs, parseSignatureKey } from '../../src/typedefs';
import { signatureKey } from '../../src/stdlib';
import { StdLib } from '../../src/stdlib';
import { createJavaScriptBinding } from '../../src/bindings/javascript';
import { createRubyBinding } from '../../src/bindings/ruby';
import { createSQLBinding } from '../../src/bindings/sql';
import { createPythonBinding } from '../../src/bindings/python';

/**
 * Consistency between the language-agnostic type table and the per-target
 * bindings.
 *
 * Elo declares function signatures in five places: `typedefs.ts` says what is
 * *legal Elo* and what each call returns, and one binding per target says how
 * to *emit* it. Nothing used to keep them aligned, which is how `upper(42)`
 * came to compile on JavaScript and Ruby while SQL rejected it — "it compiles"
 * did not mean the same thing per target.
 *
 * These tests make `typedefs.ts` the authority:
 *
 *  - Direction A: everything the type table declares legal must be emittable
 *    by every target. A gap means a program type-checks and then fails to
 *    compile somewhere.
 *  - Direction B: every name and arity a target implements must be declared in
 *    the type table. A gap means a documented function has no type at all, so
 *    it infers `any` and poisons everything downstream.
 *
 * Exceptions are listed explicitly with a reason. An empty exception list is
 * the goal; a long one is a to-do list.
 */

const targets: Array<[string, StdLib<string>]> = [
  ['javascript', createJavaScriptBinding()],
  ['ruby', createRubyBinding()],
  ['sql', createSQLBinding()],
  ['python', createPythonBinding()],
];

/**
 * Direction A exceptions: signatures the type table declares that a given
 * target cannot emit through a typed implementation.
 */
const NOT_EMITTABLE: Record<string, Record<string, string>> = {
  sql: {
    // SQL has no lambdas, so every higher-order list function is out of reach.
    // The SQL compiler rejects these with a dedicated message.
    'map:array,fn': 'SQL has no lambda support',
    'filter:array,fn': 'SQL has no lambda support',
    'reduce:array,any,fn': 'SQL has no lambda support',
    'any:array,fn': 'SQL has no lambda support',
    'all:array,fn': 'SQL has no lambda support',
    'find:array,fn': 'SQL has no lambda support',
    'sortBy:array,fn': 'SQL has no lambda support',
  },
  python: {
    // Python emits temporal arithmetic through the dynamic kAdd/kSub/kMul/kDiv
    // helpers rather than registering a typed implementation per combination.
    // The helpers dispatch correctly at runtime; this is a code-quality gap,
    // not a correctness one.
    'add:date,duration': 'emitted by the dynamic kAdd helper',
    'sub:date,duration': 'emitted by the dynamic kSub helper',
    'sub:date,date': 'emitted by the dynamic kSub helper',
    'add:datetime,duration': 'emitted by the dynamic kAdd helper',
    'sub:datetime,duration': 'emitted by the dynamic kSub helper',
    'sub:datetime,datetime': 'emitted by the dynamic kSub helper',
    'add:duration,duration': 'emitted by the dynamic kAdd helper',
    'sub:duration,duration': 'emitted by the dynamic kSub helper',
    'add:duration,date': 'emitted by the dynamic kAdd helper',
    'add:duration,datetime': 'emitted by the dynamic kAdd helper',
    'mul:duration,int': 'emitted by the dynamic kMul helper',
    'mul:duration,float': 'emitted by the dynamic kMul helper',
    'mul:int,duration': 'emitted by the dynamic kMul helper',
    'mul:float,duration': 'emitted by the dynamic kMul helper',
    'div:duration,int': 'emitted by the dynamic kDiv helper',
    'div:duration,float': 'emitted by the dynamic kDiv helper',
  },
};

/**
 * Direction B exceptions: (name, arity) pairs a target implements that the
 * type table deliberately does not declare.
 */
const UNDECLARED: Record<string, string> = {
  // `extract(text, template)` is validated structurally in the transform and
  // its result shape comes from the template, not from a signature.
  'extract/2': 'template-driven, validated in transform.ts',
};

describe('Registry consistency - typedefs is the authority', () => {
  for (const [target, lib] of targets) {
    it(`[A] every declared signature is emittable by ${target}`, () => {
      const exceptions = NOT_EMITTABLE[target] ?? {};
      const missing: string[] = [];

      for (const key of eloTypeDefs.signatureKeys()) {
        if (key in exceptions) continue;
        const { name, argTypes } = parseSignatureKey(key);
        if (!lib.lookup(name, argTypes)) missing.push(key);
      }

      assert.deepStrictEqual(
        missing,
        [],
        `typedefs.ts declares signatures that ${target} cannot emit. Either ` +
        `implement them in src/bindings/${target}.ts, remove them from ` +
        `typedefs.ts, or list them in NOT_EMITTABLE with a reason.`
      );
    });

    it(`[A] every ${target} exception is still needed`, () => {
      const stale: string[] = [];
      for (const key of Object.keys(NOT_EMITTABLE[target] ?? {})) {
        const { name, argTypes } = parseSignatureKey(key);
        if (lib.lookup(name, argTypes)) stale.push(key);
      }
      assert.deepStrictEqual(
        stale,
        [],
        `these signatures are now emittable by ${target}; drop them from ` +
        `NOT_EMITTABLE.`
      );
    });

    it(`[B] every name and arity ${target} implements is declared`, () => {
      const declaredArities = new Set(
        eloTypeDefs
          .signatureKeys()
          .map(parseSignatureKey)
          .map(({ name, argTypes }) => `${name}/${argTypes.length}`)
      );
      const undeclared = new Set<string>();

      for (const key of lib.signatureKeys()) {
        const { name, argTypes } = parseSignatureKey(key);
        const arity = `${name}/${argTypes.length}`;
        if (declaredArities.has(arity)) continue;
        if (arity in UNDECLARED) continue;
        undeclared.add(arity);
      }

      assert.deepStrictEqual(
        [...undeclared].sort(),
        [],
        `${target} implements functions with no entry in typedefs.ts, so they ` +
        `infer 'any'. Declare them, or list them in UNDECLARED with a reason.`
      );
    });
  }

  it('declares no signature that no target implements', () => {
    // A signature nothing can emit is dead weight in the type table: it makes
    // the checker accept a program every compiler then rejects.
    const dead: string[] = [];
    for (const key of eloTypeDefs.signatureKeys()) {
      const { name, argTypes } = parseSignatureKey(key);
      const emittable = targets.some(([target, lib]) => {
        if (key in (NOT_EMITTABLE[target] ?? {})) return true;
        return Boolean(lib.lookup(name, argTypes));
      });
      if (!emittable) dead.push(key);
    }
    assert.deepStrictEqual(dead, []);
  });

  it('round-trips signature keys', () => {
    // parseSignatureKey is the inverse of signatureKey; the consistency tests
    // above are only meaningful if that holds.
    for (const key of eloTypeDefs.signatureKeys()) {
      const { name, argTypes } = parseSignatureKey(key);
      assert.strictEqual(signatureKey(name, argTypes), key);
    }
  });
});
