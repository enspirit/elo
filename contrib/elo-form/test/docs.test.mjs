// The documentation and the stylesheet are part of the interface: these tests fail when
// doc/ and the code disagree, or when the stylesheet stops being driven by its tokens.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { readTokens } from '../scripts/docs.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const css = read('src/elo-form.css');

test('the generated tables in doc/ are up to date', () => {
  try {
    execFileSync(process.execPath, ['scripts/docs.mjs', '--check'], { cwd: new URL('..', import.meta.url), stdio: 'pipe' });
  } catch (e) {
    assert.fail(String(e.stderr || e.message));
  }
});

test('every option is documented', () => {
  const doc = read('doc/options.md');
  const sources = [
    ['src/form.ts', 'EloFormOptions'], ['src/widgets.ts', 'WidgetOptions'], ['src/schema.ts', 'ResolveOptions'],
  ];
  const names = [];
  for (const [file, name] of sources) {
    const body = read(file).match(new RegExp(`export interface ${name}[^{]*\\{([\\s\\S]*?)\\n\\}`))[1];
    // Top-level members only: two spaces of indentation, then `name?:` or `name:`.
    for (const m of body.matchAll(/^ {2}([a-zA-Z]+)\??:/gm)) names.push(m[1]);
  }
  assert.ok(names.length >= 14, `expected to find the options, found ${names}`);
  for (const name of names) {
    assert.ok(doc.includes(`[\`${name}\`](#`), `options.md has no summary row for \`${name}\``);
    assert.match(doc, new RegExp(`^### .*\`${name}\``, 'm'), `options.md has no section for \`${name}\``);
  }
});

test('every token is documented, defined once, and used', () => {
  const tokens = readTokens(css);
  const doc = read('doc/css.md');
  assert.ok(tokens.length >= 30);
  assert.equal(new Set(tokens.map((t) => t.name)).size, tokens.length, 'a token is defined twice');
  // Every private property in the token block follows the documented one-line form.
  const declared = [...css.matchAll(/^\s*(--_elo-[a-z-]+):/gm)].map((m) => m[1]);
  assert.deepEqual(declared, tokens.map((t) => t.name.replace('--elo-', '--_elo-')), 'a token line is not in the `--_elo-x: var(--elo-x, default); /* about */` form');
  const rules = css.slice(css.indexOf('\n.elo-form {'));
  for (const t of tokens) {
    assert.ok(doc.includes(`| \`${t.name}\` |`), `css.md does not list ${t.name}`);
    const priv = t.name.replace('--elo-', '--_elo-');
    assert.ok(css.split(`var(${priv})`).length > 1, `${priv} is never used`);
    assert.ok(t.group, `${t.name} is not under an @group`);
  }
  for (const m of rules.matchAll(/var\((--_elo-[a-z-]+)\)/g)) {
    assert.ok(declared.includes(m[1]), `${m[1]} is used but not defined`);
  }
});

test('rules go through the tokens: no public token and no literal color outside the token block', () => {
  const rules = css.slice(css.indexOf('\n.elo-form {')).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal(rules.match(/--elo-[a-z-]+/g), null, 'a rule reads or sets a public --elo-* token directly');
  assert.equal(rules.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g), null, 'a rule has a literal color');
  // And the stylesheet never *sets* a public token, so any value set by a page wins.
  assert.equal(css.replace(/\/\*[\s\S]*?\*\//g, '').match(/(^|[\s{;])--elo-[a-z-]+\s*:/g), null);
});

test('every class the stylesheet styles is one the library emits, and structural ones are documented', () => {
  const emitted = new Set((read('src/widgets.ts') + read('src/form.ts')).match(/elo-[a-z]+(?:-[a-z]+)*/g));
  const kinds = ['string', 'int', 'float', 'bool', 'date', 'datetime', 'duration', 'null', 'tuple', 'array', 'union', 'any', 'data', 'json'];
  for (const k of kinds) emitted.add(`elo-kind-${k}`);
  for (const p of ['before', 'after']) emitted.add(`elo-affixed-${p}`);
  const doc = read('doc/css.md');
  const styled = new Set(css.replace(/\/\*[\s\S]*?\*\//g, '').match(/\.elo-[a-z]+(?:-[a-z]+)*/g).map((c) => c.slice(1)));
  for (const cls of styled) {
    assert.ok(emitted.has(cls), `.${cls} is styled but never emitted`);
    // Kind classes are documented as a family: `elo-kind-<kind>`.
    assert.ok(cls.startsWith('elo-kind-') ? doc.includes('elo-kind-<kind>') : doc.includes(cls), `css.md does not mention .${cls}`);
  }
});
