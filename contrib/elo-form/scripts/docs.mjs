// Keeps the reference tables in doc/ in step with the code.
//
//   node scripts/docs.mjs           rewrite the generated parts of doc/css.md and doc/messages.md
//   node scripts/docs.mjs --check   fail if they are out of date (the test suite runs this)
//
// Only the text between `<!-- generated:NAME -->` and `<!-- /generated:NAME -->` is touched.
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

/** The tokens of src/elo-form.css: one per `--_elo-x: var(--elo-x, default); /* what for *\/` line. */
export function readTokens(css = read('src/elo-form.css')) {
  const tokens = [];
  let group = '';
  for (const line of css.split('\n')) {
    const heading = line.match(/^\s*\/\* @group (.+?) \*\/\s*$/);
    if (heading) { group = heading[1]; continue; }
    const token = line.match(/^\s*--_elo-([a-z-]+):\s*var\(--elo-([a-z-]+),\s*(.+)\);\s*\/\*\s*(.+?)\s*\*\/\s*$/);
    if (token) {
      if (token[1] !== token[2]) throw new Error(`--_elo-${token[1]} should read --elo-${token[1]}, not --elo-${token[2]}`);
      tokens.push({ group, name: `--elo-${token[1]}`, fallback: token[3], about: token[4] });
    }
  }
  return tokens;
}

/** A default as a reader would want it: private names shown as the public tokens they stand for. */
const shown = (fallback) => fallback.replace(/var\(--_elo-([a-z-]+)\)/g, '--elo-$1').replace(/[\\|]/g, '\\$&');

function tokenTables() {
  const tokens = readTokens();
  const groups = [...new Set(tokens.map((t) => t.group))];
  return groups.map((group) => [
    `### ${group}`, '',
    '| Token | Default | What it styles |', '| --- | --- | --- |',
    ...tokens.filter((t) => t.group === group).map((t) => `| \`${t.name}\` | \`${shown(t.fallback)}\` | ${t.about} |`),
  ].join('\n')).join('\n\n');
}

function flatten(value, prefix = '') {
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
  }
  return [[prefix, String(value)]];
}

async function messageTable() {
  const { defaultMessages } = await import(new URL('dist/elo-form.js', root));
  const cell = (s) => s.replace(/[\\|]/g, '\\$&');
  return [
    '| Key | Default text |', '| --- | --- |',
    ...flatten(defaultMessages).map(([key, text]) => `| \`${cell(key)}\` | ${cell(text.replace(/^ | $/g, '␣'))} |`),
  ].join('\n');
}

const parts = {
  'doc/css.md': { tokens: tokenTables },
  'doc/messages.md': { messages: messageTable },
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const check = process.argv.includes('--check');
  let stale = false;
  for (const [file, sections] of Object.entries(parts)) {
    let text = read(file);
    for (const [name, make] of Object.entries(sections)) {
      const open = `<!-- generated:${name} -->`, close = `<!-- /generated:${name} -->`;
      const from = text.indexOf(open), to = text.indexOf(close);
      if (from < 0 || to < 0) throw new Error(`${file} has no ${open} … ${close} section`);
      text = `${text.slice(0, from + open.length)}\n${await make()}\n${text.slice(to)}`;
    }
    if (text !== read(file)) {
      stale = true;
      if (check) console.error(`${file} is out of date: run \`npm run docs\`.`);
      else { writeFileSync(new URL(file, root), text); console.log(`updated ${file}`); }
    }
  }
  if (check && stale) process.exit(1);
}
