// Random schemas, to back the claim that *every* schema gets a working form.
//
// For each generated schema:
//  1. a form is built, without falling back to a JSON file anywhere a type says what to ask for;
//  2. data Elo accepts loads into the form, the form agrees it is valid, and what the form
//     hands back is read by Elo as the same value;
//  3. data Elo refuses is refused by the form too (checked on schemas without unions, where
//     loading cannot be a guess).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mount, mountPlanned, elo, plain, $$ } from './setup.mjs';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASES = ['String', 'Int', 'Float', 'Bool', 'Date', 'Datetime', 'Duration', 'Null', 'Data', '.'];
const CONSTRAINED = {
  Int: ['Int(i | i > 2)', 'Int(i | i >= 0 and i <= 10)', 'Int(i | even: i % 2 == 0)', 'Int(i | contains([1, 2, 3], i))'],
  String: ["String(s | length(s) <= 3)", "String(s | s == 'a' or s == 'b')", "String(s | 'must not be empty': not isEmpty(s))"],
  Float: ['Float(f | f < 5)', 'Float(f | f >= 0)'],
  Date: ['Date(d | d >= D2024-01-01)'],
  Duration: ['Duration(d | d <= P30D)'],
};

/** A random schema as a little tree, with the Elo source it stands for. */
function generate(seed, { constraints }) {
  const r = rng(seed);
  const pick = (xs) => xs[Math.floor(r() * xs.length)];
  const defs = [];
  let unions = false;

  const base = () => {
    const name = pick(BASES);
    if (constraints && CONSTRAINED[name] && r() < 0.5) return { t: 'base', name, src: pick(CONSTRAINED[name]), constrained: true };
    return { t: 'base', name, src: name };
  };
  const type = (depth) => {
    const roll = r();
    if (depth <= 0 || roll < 0.4) return base();
    if (roll < 0.5 && defs.length) { const d = pick(defs); return { t: 'ref', name: d.name, src: d.name }; }
    if (roll < 0.65) { const el = type(depth - 1); return { t: 'array', el, src: `[${el.src}]` }; }
    if (roll < 0.8) {
      unions = true;
      const alts = Array.from({ length: 2 + Math.floor(r() * 2) }, () => type(depth - 1));
      return { t: 'union', alts, src: alts.map((a) => a.src).join('|') };
    }
    const props = Array.from({ length: Math.floor(r() * 4) }, (_, i) => ({ key: `k${i}`, optional: r() < 0.35, type: type(depth - 1) }));
    const mode = pick(['closed', 'closed', 'ignored', 'typed']);
    const extras = mode === 'typed' ? type(depth - 1) : mode;
    const parts = props.map((p) => `${p.key}${p.optional ? ' :? ' : ': '}${p.type.src}`);
    if (mode === 'ignored') parts.push('...');
    if (mode === 'typed') parts.push(`...: ${extras.src}`);
    return { t: 'tuple', props, extras, src: `{ ${parts.join(', ')} }` };
  };

  for (let i = 0, n = Math.floor(r() * 4); i < n; i++) {
    const node = type(2);
    defs.push({ name: `T${i}`, node });
    // Now and then, a constraint on the alias itself, whatever it is.
    if (constraints && node.t === 'array' && r() < 0.5) {
      const name = `T${i}c`;
      defs.push({ name, node: { t: 'ref', name: `T${i}`, constrained: true }, src: `T${i}(l | length(l) <= 2)` });
    }
  }
  const root = type(3);
  defs.push({ name: 'Root', node: root });
  const source = defs.map((d) => `${d.name} = ${d.src ?? d.node.src}`).join('\n');
  const lookup = new Map(defs.map((d) => [d.name, d.node]));

  const flat = (node) => (node.t === 'ref' ? flat(lookup.get(node.name)) : node);
  const hasNull = (node) => {
    const n = flat(node);
    return (n.t === 'base' && n.name === 'Null') || (n.t === 'union' && n.alts.some(hasNull));
  };
  const json = (depth) => {
    const roll = r();
    if (depth <= 0 || roll < 0.6) return pick([1, 2.5, true, false, null, 'text', -3]);
    if (roll < 0.8) return Array.from({ length: Math.floor(r() * 3) }, () => json(depth - 1));
    return Object.fromEntries(Array.from({ length: Math.floor(r() * 3) }, (_, i) => [`j${i}`, json(depth - 1)]));
  };

  /** A value of the right shape. `blankable`: empty would mean "absent" here, so avoid empties. */
  const value = (node, blankable) => {
    switch (node.t) {
      case 'ref': return value(lookup.get(node.name), blankable);
      case 'array': return Array.from({ length: (blankable ? 1 : 0) + Math.floor(r() * 3) }, () => value(node.el, false));
      case 'union': return value(pick(node.alts), blankable || hasNull(node));
      case 'tuple': {
        const o = {};
        for (const p of node.props) if (!p.optional || r() < 0.5) o[p.key] = value(p.type, p.optional);
        if (node.extras === 'ignored' && r() < 0.5) o.zz = 1;
        if (typeof node.extras === 'object') for (let i = 0, n = Math.floor(r() * 3); i < n; i++) o[`x${i}`] = value(node.extras, false);
        return o;
      }
      case 'base': switch (node.name) {
        case 'String': return pick(blankable ? ['a', 'b', 'hello', '42', 'x y'] : ['a', 'b', 'hello', '42', 'x y', '']);
        case 'Int': return Math.floor(r() * 16) - 3;
        case 'Float': return pick([0, 1, 2.5, -1.25, 7, 1e-7, 12345.678]);
        case 'Bool': return r() < 0.5;
        case 'Null': return null;
        case 'Date': return `202${Math.floor(r() * 6)}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 10)}`;
        case 'Datetime': return `202${Math.floor(r() * 6)}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 10)}T12:${10 + Math.floor(r() * 50)}:0${Math.floor(r() * 10)}Z`;
        case 'Duration': return pick(['P1D', 'PT2H30M', 'P1Y2M', 'P2W', 'PT45S', 'PT0S', 'P1DT1H1M1S', 'P40D']);
        case 'Data': { const v = json(2); return typeof v === 'string' ? JSON.stringify(v) : v; }
        default: { const v = json(2); return blankable && v === '' ? 'x' : v; }
      }
    }
  };

  return { source, unions, value: () => value(root, false) };
}

function run(label, { constraints, count }) {
  test(label, () => {
    let accepted = 0, refused = 0, compared = 0;
    for (let seed = 1; seed <= count; seed++) {
      const { source, unions, value } = generate(seed, { constraints });
      const verdict = elo(source, 'Root');
      const context = (extra) => `seed ${seed}\n${source}\n${extra}`;

      let form;
      try { form = mount(source, { type: 'Root' }); } catch (e) { assert.fail(context(`building failed: ${e.stack}`)); }
      // No JSON file except where the schema itself says "anything".
      const files = $$(form, 'input[type=file]').length;
      const free = $$(form, '.elo-kind-any, .elo-kind-data').length;
      assert.ok(files <= free, context('fell back to a JSON file for a typed node'));
      // An untouched form never claims more than Elo does.
      if (form.result.valid) assert.ok(verdict(form.getRaw()).ok, context('blank form valid, Elo disagrees'));

      for (let i = 0; i < 4; i++) {
        const v = value();
        const expected = verdict(v);
        form.setValue(v);
        const got = form.validate();
        // The same form built the other way — planned as JSON, checked by a compiled module — says the same.
        if (seed % 5 === 0) {
          const planned = mountPlanned(source, { type: 'Root' }, { value: v }).validate();
          assert.deepEqual([planned.valid, planned.raw, planned.problems], [got.valid, got.raw, got.problems], context(`planned form disagrees on ${JSON.stringify(v)}`));
        }
        const detail = () => context(`value: ${JSON.stringify(v)}\nraw:   ${JSON.stringify(got.raw)}\nproblems: ${JSON.stringify(got.problems)}\nelo: ${expected.error?.message}`);
        // Refused data may be loaded differently from how it was written when a union has to guess
        // which alternative was meant, so refusals are only compared where there is no union.
        if (expected.ok || !unions) { assert.equal(got.valid, expected.ok, detail()); if (!expected.ok) compared++; }
        else if (got.valid) assert.ok(verdict(got.raw).ok, detail());
        if (expected.ok) {
          accepted++;
          assert.deepEqual(plain(verdict(got.raw).value), plain(expected.value), detail());
        } else refused++;
      }
    }
    console.log(`    ${label}: ${count} schemas, ${accepted} values accepted, ${refused} refused (${compared} of them on union-free schemas)`);
    if (constraints) assert.ok(compared > 50, 'the generator should produce refusals too');
    assert.ok(accepted > count, 'the generator should mostly produce acceptable values');
  });
}

run('random schemas without constraints round-trip', { constraints: false, count: 1500 });
run('random schemas with constraints agree with Elo', { constraints: true, count: 1500 });
