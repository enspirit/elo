import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as ts from 'typescript';
import { JS_HELPERS } from '../../src/runtime';
import { isStaticallyNumericIndex } from '../support/emitted-js-grammar';

/**
 * The trusted base, enumerated.
 *
 * All three emitted-grammar gates exempt the prelude helpers, because helpers
 * are *where* a guarded bracket read and an `Object.defineProperty` write are
 * supposed to live — they cannot obey the rule the rest of the emission does.
 *
 * That exemption is the harness's largest blind spot. Of the thirty security
 * issues fixed since 1.0, **six were inside a helper**, so no grammar gate
 * could have seen any of them:
 *
 *  - the `fetch()` non-string-key coercion (1.2.0) and the prototype-chain
 *    bypass (1.1.0), both in `kFetch`;
 *  - the `patch()` denylist (1.1.0), in `kPatch`;
 *  - the `fetch()` datapath-segment denylist (1.0.1);
 *  - own-property reads, in `kMember` (1.2.1);
 *  - `__proto__` in `kDeepMerge` (1.2.4);
 *  - and `pSchema`, found by auditing this region by hand (1.2.4).
 *
 * The audit that found the last one was one query — list every computed access
 * in `JS_HELPERS` — and it should not depend on anyone remembering to repeat
 * it. This is that query, with the answer pinned.
 *
 * Every helper that reads or writes a **computed** member must be classified,
 * and the claim checked. A new helper that starts indexing by a runtime key
 * fails until somebody says why that is safe. `__proto__` is the name that
 * matters: reading `o['__proto__']` yields the prototype unless the object has
 * an own data property of that name, and writing it runs the setter.
 *
 * ## Why JavaScript only
 *
 * This class does not exist on the other targets. A Ruby `Hash#[]` and a
 * Python `dict[k]` are plain key reads with no prototype chain behind them, so
 * there is no meta-property for a computed key to reach. Python's analogous
 * risk is the dunder *attribute*, which `gate-python.py` covers with a closed
 * list of 34. SQL has no object model at all.
 */

/** Why a computed access inside a helper is safe. */
type Access =
  | { guard: 'defineProperty' | 'proto-check' | 'hasOwnProperty' | 'type-check'; why: string }
  | { numeric: string }
  | { ownKeys: string };

const NUMERIC_LOOP: Access = {
  numeric:
    'Every index is numeric by construction — a loop counter or a literal — so it '
    + 'cannot name a meta-property. Checked below rather than asserted.',
};

const OWN_KEYS: Access = {
  ownKeys:
    'The key comes from Object.keys(v), which lists own enumerable properties only. '
    + "A key named __proto__ is therefore an own data property — that is what the "
    + 'object-literal emitter and pSet arrange — so reading it back yields the data '
    + 'rather than the prototype. If the object did *not* have it as an own '
    + 'property, Object.keys would not have offered the name.',
};

/**
 * Every helper that performs a computed member access, and why it is safe.
 *
 * A list someone edits on purpose. Adding a helper that indexes by a runtime
 * key means deciding what stops that key being `__proto__`.
 */
const HELPER_ACCESS: Record<string, Access> = {
  kAt: {
    guard: 'type-check',
    why:
      'Refuses a non-array and a non-integer index before reading, so the index '
      + 'cannot be a string. This is the sandbox guard the typed and dynamic at() '
      + 'emitters both route through.',
  },
  kMember: {
    guard: 'hasOwnProperty',
    why:
      'The guarded reader itself: reads an own property or answers null, so no '
      + 'name reaches the prototype. Every other helper that needs a keyed read '
      + 'should call this rather than index directly.',
  },
  kFetch: {
    guard: 'proto-check',
    why:
      'Coerces the segment to a string *before* testing it against the denylist — '
      + 'the 1.2.0 fix, since a non-string key slipped past a === check and landed '
      + 'on the coerced name — and then reads through kMember.',
  },
  kFetchObject: {
    guard: 'defineProperty',
    why:
      'Writes a __proto__ key with defineProperty so it stays a data property, and '
      + 'reads the path map by a key it took from Object.keys.',
  },
  kPatch: {
    guard: 'proto-check',
    why:
      'Denylists the meta-property names for both the read and the write, after '
      + 'coercing a non-string segment. Its numeric indices are path positions.',
  },
  kDeepMerge: {
    guard: 'defineProperty',
    why:
      'The 1.2.4 fix: a bare result[key] = … ran the prototype setter for a '
      + '__proto__ key, so the write goes through defineProperty and the reads '
      + 'through kMember.',
  },
  pSet: {
    guard: 'defineProperty',
    why:
      'Exists only to make this safe once: stores a __proto__ key as data and '
      + 'anything else by assignment. Introduced with the pSchema fix (1.2.4). The '
      + 'other three sites predate it and still carry their own copy — '
      + 'consolidating them onto this is open work.',
  },
  pSchema: {
    guard: 'hasOwnProperty',
    why:
      'Reads the input through kMember and writes the result through pSet; the '
      + 'remaining computed read is pr[0], a numeric index into a property triple.',
  },
  kEq: OWN_KEYS,
  kString: OWN_KEYS,
  pArray: NUMERIC_LOOP,
  pUnwrap: NUMERIC_LOOP,
};

/** The guard mechanisms, as they appear in helper source. */
const GUARD_EVIDENCE: Record<string, RegExp> = {
  defineProperty: /Object\.defineProperty/,
  'proto-check': /__proto__|FORBIDDEN/,
  hasOwnProperty: /hasOwnProperty/,
  'type-check': /Number\.isInteger|Array\.isArray/,
};

interface Access2 {
  reads: ts.ElementAccessExpression[];
  writes: ts.ElementAccessExpression[];
}

/** Every computed member access in one helper, split by read and write. */
function computedAccess(source: string): Access2 {
  const sf = ts.createSourceFile('helper.js', source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.JS);
  const reads: ts.ElementAccessExpression[] = [];
  const writes: ts.ElementAccessExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isElementAccessExpression(node)) {
      const isWrite = ts.isBinaryExpression(node.parent)
        && node.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
        && node.parent.left === node;
      (isWrite ? writes : reads).push(node);
    }
    node.forEachChild(visit);
  };
  visit(sf);
  return { reads, writes };
}

const WITH_ACCESS = Object.entries(JS_HELPERS)
  .map(([name, source]) => ({ name, source, ...computedAccess(source) }))
  .filter(h => h.reads.length > 0 || h.writes.length > 0);

describe('The exempt helper region is enumerated, not unexamined', () => {
  it('finds the helpers', () => {
    assert.ok(Object.keys(JS_HELPERS).length > 40);
    assert.ok(WITH_ACCESS.length > 5);
  });

  it('every helper doing a computed access is classified', () => {
    const unclassified = WITH_ACCESS.map(h => h.name).filter(n => !(n in HELPER_ACCESS)).sort();
    assert.deepStrictEqual(
      unclassified,
      [],
      `${unclassified.length} helper(s) index by a computed key with no entry in `
      + 'HELPER_ACCESS. The grammar gates exempt this region, so nothing else will ask: '
      + "say what stops the key being '__proto__'. Six of the security issues fixed "
      + `since 1.0 were in here.\n\n${unclassified.map(n => `  ${n}`).join('\n')}`
    );
  });

  it('no stale classification', () => {
    const names = new Set(WITH_ACCESS.map(h => h.name));
    const stale = Object.keys(HELPER_ACCESS).filter(n => !names.has(n)).sort();
    assert.deepStrictEqual(
      stale, [],
      `HELPER_ACCESS classifies ${stale.length} helper(s) that no longer index by a `
      + `computed key.\n\n${stale.map(n => `  ${n}`).join('\n')}`
    );
  });

  for (const helper of WITH_ACCESS) {
    const claim = HELPER_ACCESS[helper.name];
    if (!claim) continue;

    if ('numeric' in claim) {
      it(`${helper.name}: every index really is numeric by construction`, () => {
        // Reuses the grammar gate's predicate, so "numeric by construction"
        // means the same thing inside a helper as outside one.
        const suspect = [...helper.reads, ...helper.writes]
          .filter(node => !isStaticallyNumericIndex(node.argumentExpression)
            && !isLoopCounter(node.argumentExpression, helper.source))
          .map(node => node.getText());
        assert.deepStrictEqual(
          suspect, [],
          `${helper.name} is classified as indexing numerically, but these indices are `
          + `not numeric by construction:\n\n${suspect.map(s => `  ${s}`).join('\n')}`
        );
      });
    }

    if ('ownKeys' in claim) {
      it(`${helper.name}: really does take its keys from Object.keys`, () => {
        assert.match(
          helper.source, /Object\.keys\s*\(/,
          `${helper.name} is classified as iterating own keys but never calls Object.keys`
        );
      });
    }

    if ('guard' in claim) {
      it(`${helper.name}: really carries a ${claim.guard} guard`, () => {
        assert.match(
          helper.source, GUARD_EVIDENCE[claim.guard],
          `${helper.name} claims a ${claim.guard} guard, which is not in its source`
        );
      });
    }

    it(`${helper.name}: a computed write keeps __proto__ a data key`, () => {
      // The one invariant worth asserting over every write in the region,
      // whatever its classification: this is the kDeepMerge and pSchema bug.
      for (const write of helper.writes) {
        if (isStaticallyNumericIndex(write.argumentExpression)) continue;
        assert.ok(
          /Object\.defineProperty/.test(helper.source) || /__proto__|FORBIDDEN/.test(helper.source),
          `${helper.name} writes ${write.getText()} with a runtime key and neither uses `
          + 'Object.defineProperty nor checks for __proto__. A __proto__ key would run '
          + 'the prototype setter instead of storing data.'
        );
      }
    });
  }
});

/**
 * Whether an index is a counter declared by a `for (let i = …; …)` in the same
 * helper. The grammar gate's predicate cannot see this, because outside a
 * helper the emitted code has no loops at all.
 */
function isLoopCounter(node: ts.Node, source: string): boolean {
  if (!ts.isIdentifier(node)) return false;
  return new RegExp(`for\\s*\\(\\s*(?:let|var|const)\\s+${node.text}\\s*=`).test(source);
}
