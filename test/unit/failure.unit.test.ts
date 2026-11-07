import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../../src/compile';
import type { EloFailure } from '../../src/runtime';
import { DateTime, Duration } from 'luxon';

/**
 * What a failure says to the host, as opposed to what it says to a reader.
 *
 * A host that embeds Elo usually has to tell *why* a call failed: data that
 * never arrived is not the same event as data that arrived and was refused,
 * and neither is an invariant that did not hold. The message is prose, and
 * reading it back is how the wording of a diagnostic becomes a public
 * interface by accident. So the raised error carries the structure its message
 * already describes: a `kind`, the `path` it happened at, and the `label` of
 * the constraint, guard or check that named it.
 *
 * `message` stays what it is — for a human, and not promised to anyone.
 */

const runtime = { DateTime, Duration };

/** Runs `source` on `input` and answers the failure it raised. */
function failureOf(source: string, input: unknown = null): EloFailure {
  try {
    compile<(value: unknown) => unknown>(source, { runtime })(input);
  } catch (error) {
    return error as EloFailure;
  }
  throw new Error(`'${source}' did not fail on ${JSON.stringify(input) ?? 'null'}`);
}

const RECORD = `Pos = Int(i | positive: i > 0)
Rec = { a: Pos }
_ |> Rec`;

describe('a failure says what kind of thing it was', () => {
  it('is a schema failure when a value arrived and was refused', () => {
    const failure = failureOf(RECORD, { a: 'x' });
    assert.strictEqual(failure.kind, 'schema');
    assert.strictEqual(failure.path, '.a');
    assert.strictEqual(failure.label, undefined);
  });

  it('is a missing failure when no value arrived at all', () => {
    const failure = failureOf(RECORD, {});
    assert.strictEqual(failure.kind, 'missing');
    assert.strictEqual(failure.path, '.a');
  });

  it('is a constraint failure when a constraint did not hold', () => {
    const failure = failureOf(RECORD, { a: 0 });
    assert.strictEqual(failure.kind, 'constraint');
    assert.strictEqual(failure.path, '.a');
    assert.strictEqual(failure.label, 'positive');
  });

  it('is a schema failure when an attribute was not expected', () => {
    const failure = failureOf(RECORD, { a: 1, b: 2 });
    assert.strictEqual(failure.kind, 'schema');
    assert.strictEqual(failure.path, '.b');
  });

  it('is a guard failure when a guard did not hold', () => {
    const failure = failureOf('let x = 0 in guard positive: x > 0 in x');
    assert.strictEqual(failure.kind, 'guard');
    assert.strictEqual(failure.label, 'positive');
  });

  it('is a check failure when a check did not hold', () => {
    const failure = failureOf('let x = 0 in check positive: x > 0 in x');
    assert.strictEqual(failure.kind, 'check');
    assert.strictEqual(failure.label, 'positive');
  });

  it('names the path of a failure nested in an array', () => {
    const failure = failureOf('Recs = [{ a: Int }]\n_ |> Recs', [{ a: 1 }, { a: 'x' }]);
    assert.strictEqual(failure.kind, 'schema');
    assert.strictEqual(failure.path, '.1.a');
  });

  it('tells a null that was written from a value that never arrived', () => {
    // The distinction the kinds exist for: one is data the host sent and Elo
    // refused, the other is data that is not there.
    assert.strictEqual(failureOf(RECORD, { a: null }).kind, 'schema');
    assert.strictEqual(failureOf(RECORD, {}).kind, 'missing');
  });

  it('says it of a whole object that never arrived', () => {
    const failure = failureOf('Rec = { a: { b: Int } }\n_ |> Rec', {});
    assert.strictEqual(failure.kind, 'missing');
    assert.strictEqual(failure.path, '.a');
  });
});

describe('a failure keeps its kind when its message is reworded', () => {
  /**
   * A label written as a sentence *is* the message — that is how an author
   * replaces Elo's prose with their own. The kind comes from the failing
   * construct, not from the words, so it survives that.
   */
  it('reads a constraint as a constraint however it is worded', () => {
    const failure = failureOf("Pos = Int(i | 'a is not positive': i > 0)\n_ |> Pos", 0);
    assert.strictEqual(failure.message, '.: a is not positive');
    assert.strictEqual(failure.kind, 'constraint');
    assert.strictEqual(failure.label, 'a is not positive');
  });

  it('reads a guard as a guard however it is worded', () => {
    const failure = failureOf("let x = 0 in guard 'x must be positive': x > 0 in x");
    assert.strictEqual(failure.message, 'x must be positive');
    assert.strictEqual(failure.kind, 'guard');
    assert.strictEqual(failure.label, 'x must be positive');
  });

  it('leaves the message of an ordinary failure alone', () => {
    // Pinned here so a change to the prose is a change to this test, rather
    // than a surprise for a host that was reading it.
    assert.strictEqual(failureOf(RECORD, { a: 'x' }).message, '.a: expected Int, got "x"');
    // 'Null', not 'undefined'. Elo has no `undefined`, and Ruby and Python
    // both said Null for the same program — JavaScript said `undefined` only
    // because pSchema read the key with a bare `v[key]`. Reading it through
    // kMember, so that a key named `__proto__` is data, also brought the
    // missing-key message into line with the other two targets.
    assert.strictEqual(failureOf(RECORD, {}).message, '.a: expected Int, got Null');
    assert.strictEqual(failureOf(RECORD, { a: 0 }).message, ".a: constraint 'positive' failed");
    assert.strictEqual(failureOf(RECORD, { a: 1, b: 2 }).message, '.b: unexpected attribute');
  });
});
