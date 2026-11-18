// Builds dist/: an ES module for bundlers, and a standalone script for a plain <script> tag.
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
const common = { entryPoints: ['src/index.ts'], bundle: true, target: 'es2020', logLevel: 'warning' };

await build({ ...common, format: 'esm', outfile: 'dist/elo-form.js', external: ['@enspirit/elo', 'luxon'] });
// The two halves on their own: reading a schema (Elo, no page) and building a form (a plan, no Elo).
await build({ ...common, entryPoints: ['src/planner.ts'], format: 'esm', outfile: 'dist/elo-form.plan.js', external: ['@enspirit/elo', 'luxon'] });
await build({ ...common, entryPoints: ['src/render.ts'], format: 'esm', outfile: 'dist/elo-form.render.js' });
// The worker a page starts to run compiled checks away from itself.
await build({ ...common, entryPoints: ['src/worker.ts'], format: 'esm', outfile: 'dist/elo-form.worker.js', minify: true });
await build({ ...common, format: 'iife', globalName: 'EloForm', outfile: 'dist/elo-form.standalone.js', minify: true });
copyFileSync('src/elo-form.css', 'dist/elo-form.css');

// The playground: one self-contained page, with the library and Elo inlined.
const demo = await build({ ...common, entryPoints: ['demo/entry.ts'], format: 'iife', globalName: 'EloFormDemo', minify: true, write: false });
const version = JSON.parse(readFileSync('node_modules/@enspirit/elo/package.json', 'utf8')).version;
const page = readFileSync('demo/playground.src.html', 'utf8')
  .replace('/*__ELO_FORM_CSS__*/', () => readFileSync('src/elo-form.css', 'utf8'))
  .replace('/*__ELO_FORM_JS__*/', () => demo.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'))
  .replace('__ELO_VERSION__', version);
writeFileSync('dist/playground.html', page);
