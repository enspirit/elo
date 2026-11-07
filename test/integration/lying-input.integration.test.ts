import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime, Duration, Interval } from 'luxon';
import { parse, parseTypeExpr } from '../../src/parser';
import { typecheckWithAnnotations } from '../../src/typecheck';
import { compileToJavaScript } from '../../src/compilers/javascript';

/**
 * A declared input type is a promise, not a runtime check.
 *
 * `--input-type '{xs: [Int], i: Int}'` tells the *checker* what the input is.
 * Nothing validates or coerces the input at runtime: `_.i` compiles to a bare
 * read that hands back whatever actually arrived. So every emitter chosen
 * *because the checker knows the type* is, on that path, performing an
 * unguarded operation on an unvalidated value — and `--optimize` turns the
 * whole program into that situation.
 *
 * This is §1.4 of `0244`, and it inverts the usual intuition. The dynamic path
 * looks dangerous (`any` everywhere) and so it got the guards; the typed path
 * looks safe and got the bare operator. The typed path is the one where a lie
 * is undetectable.
 *
 * It is exactly the 1.2.4 sandbox escape: `at(_.xs, _.i)` declared honestly as
 * `{xs: [Int], i: Int}`, sent `{xs: [], i: 'constructor'}`, returned the Array
 * constructor — one hop from `Function`.
 *
 * ## The property
 *
 * **`--optimize` must not let a lie about the input become a capability.**
 *
 * Not "must not raise": a program told its input is an Int and handed a
 * function may legitimately throw a host TypeError, and the security page's
 * "bad input yields a typed Elo error" is a promise about *compiling* source,
 * not about evaluating data that breaks its contract. What must never happen is
 * the runtime promise — *"the code Elo emits cannot reach host-runtime
 * internals, such as the JavaScript prototype chain or the Function
 * constructor"*. So the assertion is on the **value**: never a function, never
 * an object carrying a foreign prototype, never a host global.
 *
 * The emitted-grammar gate catches the *shape* that caused 1.2.4 — a computed
 * read with a runtime index. This catches the property, which the next §1.4 bug
 * may violate with a different shape.
 */

/** Programs whose emission changes when the checker knows the input type. */
const PROGRAMS: Array<{ name: string; type: string; source: string }> = [
  // The 1.2.4 escape, and the two hops after it.
  { name: 'at(list, index)', type: '{xs: [Int], i: Int}', source: 'at(_.xs, _.i)' },
  { name: 'at then member', type: '{xs: [Int], i: Int}', source: 'at(_.xs, _.i)' },
  { name: 'nested at', type: '{xs: [[Int]], i: Int}', source: 'at(at(_.xs, _.i), _.i)' },
  // Member reads of a declared record: the bare read that makes the lie possible.
  { name: 'member read', type: '{a: Int}', source: '_.a' },
  { name: 'nested member read', type: '{a: {b: Int}}', source: '_.a.b' },
  // Arithmetic on declared numbers, where the typed emitter is a bare operator.
  { name: 'typed add', type: '{a: Int, b: Int}', source: '_.a + _.b' },
  { name: 'typed mul', type: '{a: Int, b: Int}', source: '_.a * _.b' },
  { name: 'typed pow', type: '{a: Int, b: Int}', source: '_.a ^ _.b' },
  // String operations on a declared String: typed emitters call native methods.
  { name: 'typed upper', type: '{s: String}', source: 'upper(_.s)' },
  { name: 'typed length', type: '{s: String}', source: 'length(_.s)' },
  { name: 'typed repeat', type: '{s: String, n: Int}', source: '_.s * _.n' },
  { name: 'typed split', type: '{s: String}', source: "split(_.s, ',')" },
  // List operations on a declared list.
  { name: 'typed map', type: '{xs: [Int]}', source: 'map(_.xs, fn( x ~> x * 2 ))' },
  { name: 'typed length of list', type: '{xs: [Int]}', source: 'length(_.xs)' },
  { name: 'typed first', type: '{xs: [Int]}', source: 'first(_.xs)' },
  // Data access by path and by mapping.
  { name: 'fetch path', type: '{a: {b: Int}}', source: 'fetch(_, .a.b)' },
  { name: 'fetch mapping', type: '{a: Int}', source: 'fetch(_, {x: .a})' },
  { name: 'patch', type: '{a: Int}', source: 'patch(_, .a, 1)' },
  { name: 'deepMerge', type: '{a: {b: Int}}', source: 'deepMerge(_.a, {c: 1})' },
];

/**
 * Inputs that break the declared contract.
 *
 * Each is a plain value a host could hand over — from `JSON.parse`, from a
 * query string, from a request body — and each lies about one of the declared
 * types. `__proto__` arrives through `JSON.parse` on purpose: that is how it
 * becomes an own data property rather than a prototype assignment, which is the
 * shape a real attacker has.
 */
function hostileInputs(): Array<{ name: string; value: unknown }> {
  return [
    { name: 'meta-property as index', value: { xs: [], i: 'constructor', a: 'constructor', s: 'constructor', b: 'constructor', n: 'constructor' } },
    { name: '__proto__ as index', value: { xs: [], i: '__proto__', a: '__proto__', s: '__proto__', b: '__proto__', n: '__proto__' } },
    { name: 'prototype as index', value: { xs: [], i: 'prototype', a: 'prototype', s: 'prototype', b: 'prototype', n: 'prototype' } },
    { name: 'string where Int promised', value: { xs: ['a'], i: 'x', a: 'x', b: 'x', s: 'x', n: 'x' } },
    { name: 'object where scalar promised', value: { xs: {}, i: {}, a: {}, b: {}, s: {}, n: {} } },
    { name: 'array where scalar promised', value: { xs: [[]], i: [0], a: [0], b: [0], s: [0], n: [0] } },
    { name: 'null everywhere', value: { xs: null, i: null, a: null, b: null, s: null, n: null } },
    { name: 'nothing at all', value: {} },
    { name: 'JSON __proto__ payload', value: JSON.parse('{"xs": [], "i": 0, "a": {"__proto__": {"polluted": true}}, "b": 1, "s": "x", "n": 1}') },
    { name: 'a host function as data', value: { xs: [], i: 0, a: () => 42, b: 1, s: 'x', n: 1 } },
    { name: 'a host object as data', value: { xs: [], i: 0, a: new Date(), b: 1, s: 'x', n: 1 } },
    { name: 'array-coerced index', value: { xs: [], i: ['constructor'], a: ['constructor'], b: 1, s: 'x', n: 1 } },
    { name: 'toString-coerced index', value: { xs: [], i: { toString: () => 'constructor' }, a: 1, b: 1, s: 'x', n: 1 } },
  ];
}

/** Compile under `--optimize --input-type`, which is the situation under test. */
function compileOptimized(source: string, inputType: string): string {
  const ast = parse(source);
  const { types, diagnostics } = typecheckWithAnnotations(ast, {
    inputType: parseTypeExpr(inputType),
  });
  // A program the checker reported on is emitted unannotated by eloc, so there
  // is no optimized emission to test.
  if (diagnostics.length > 0) throw new Error(`checker reported: ${diagnostics[0].message}`);
  // Deliberately *not* `execute: true`: that wraps the program in a
  // self-invoking IIFE with `_` bound to null, which would make every case
  // below unreachable. The bare form is `(function(_) { … })`, a function this
  // test can hand a hostile input to.
  return compileToJavaScript(ast, { types });
}

/** Every object and function identity reachable from a value. */
function reachable(value: unknown, into = new Set<unknown>()): Set<unknown> {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return into;
  if (into.has(value)) return into;
  into.add(value);
  if (Array.isArray(value)) {
    for (const element of value) reachable(element, into);
  } else if (typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) reachable(nested, into);
  }
  return into;
}

/**
 * Whether a value is something the emitted code should never have been able to
 * hand back: a callable, or an object reaching a prototype that is not
 * `Object.prototype`.
 *
 * `fromInput` is what the host put in. A function that came *out* because the
 * host put it *in* is not a leak — it is the documented host contract ("pass
 * data, not host objects"), and `patch(_, .a, 1)` copying the input faithfully
 * is correct behaviour. A leak is a capability the emitted code *reached*: a
 * value the input never contained, which is what `[]['constructor']` produces.
 */
function leak(value: unknown, fromInput: Set<unknown>, seen = new Set<unknown>()): string | null {
  if (fromInput.has(value)) return null;
  if (typeof value === 'function') return 'a function';
  if (value === null || typeof value !== 'object') return null;
  if (seen.has(value)) return null;
  seen.add(value);

  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) return 'an array with a foreign prototype';
    for (const element of value) {
      const found = leak(element, fromInput, seen);
      if (found) return found;
    }
    return null;
  }

  // Luxon values are the one legitimate non-plain object: Elo's temporal values
  // are instances, and the host is handed them on purpose.
  if (DateTime.isDateTime(value) || Duration.isDuration(value) || Interval.isInterval(value)) {
    return null;
  }

  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return `an object whose prototype is ${proto?.constructor?.name ?? 'foreign'}`;
  }
  for (const nested of Object.values(value as Record<string, unknown>)) {
    const found = leak(nested, fromInput, seen);
    if (found) return found;
  }
  return null;
}

describe('--optimize cannot turn a lie about the input into a capability', () => {
  const inputs = hostileInputs();

  for (const program of PROGRAMS) {
    it(`${program.name} (${program.type})`, () => {
      let code: string;
      try {
        code = compileOptimized(program.source, program.type);
      } catch (error) {
        // The checker refusing the program is a fine outcome: there is then no
        // optimized emission for a lie to exploit.
        assert.ok(error instanceof Error);
        return;
      }

      const factory = new Function('DateTime', 'Duration', 'Interval', `return ${code}`);

      for (const input of inputs) {
        let value: unknown;
        try {
          value = factory(DateTime, Duration, Interval)(input.value);
        } catch {
          // Throwing on a value that broke its declared contract is allowed:
          // the promise is about capabilities, not about never raising.
          continue;
        }

        const found = leak(value, reachable(input.value));
        assert.strictEqual(
          found,
          null,
          `${program.name} declared ${program.type}, was handed "${input.name}", and `
          + `returned ${found}. A declared type is not a runtime check, so the emission `
          + `must not trust it for anything that can reach the host.\n\n  ${code}\n`
        );
      }
    });
  }

  it('global Object.prototype is never polluted', () => {
    assert.strictEqual(
      (Object.prototype as Record<string, unknown>).polluted,
      undefined,
      'a __proto__ payload reached Object.prototype'
    );
  });
});
