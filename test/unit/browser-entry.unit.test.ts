import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';

/**
 * The main entry point must stay importable in a browser.
 *
 * The playground bundles the compiler in-page, where there are no files to
 * read and an import is simply refused. That is the whole reason the
 * filesystem loader lives behind `@enspirit/elo/node`, so this walks what
 * `src/index.ts` actually reaches and refuses a Node-only dependency in it.
 *
 * A static walk rather than a load: a module that merely *mentions* `fs` is
 * already a module a bundler will try to resolve.
 */

const SRC = resolve(__dirname, '../../../src');

/** Node built-ins that have no answer in a browser. */
const NODE_ONLY = ['fs', 'path', 'os', 'child_process', 'module', 'url', 'worker_threads'];

/** Every source file reachable from `entry` by a relative import. */
function reachableFrom(entry: string): Map<string, string> {
  const seen = new Map<string, string>();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    const source = readFileSync(file, 'utf-8');
    seen.set(file, source);

    for (const specifier of importsOf(source)) {
      if (!specifier.startsWith('.')) continue;
      queue.push(resolvePath(dirname(file), specifier));
    }
  }

  return seen;
}

function importsOf(source: string): string[] {
  const specifiers: string[] = [];
  // Comments are stripped first: these files document imports in prose, and
  // `import { Person } from './m'` in a doc comment is not a dependency.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // `from '…'`, `require('…')` and the bare `import '…'` form.
  const pattern = /(?:from|require\s*\(|^\s*import)\s*['"]([^'"]+)['"]/gm;
  for (const match of code.matchAll(pattern)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function resolvePath(from: string, specifier: string): string {
  const base = resolve(from, specifier);
  if (base.endsWith('.ts')) return base;
  // A directory import reaches its `index.ts`, as `./preludes` does.
  return existsSync(`${base}.ts`) ? `${base}.ts` : join(base, 'index.ts');
}

describe('the main entry point is browser-safe', () => {
  const reachable = reachableFrom(join(SRC, 'index.ts'));

  it('reaches the compiler, the linker and the checker', () => {
    // Guards against a walk that found nothing and passed by accident.
    for (const name of ['parser.ts', 'modules.ts', 'typecheck.ts', 'compilers/javascript.ts']) {
      assert.ok(
        [...reachable.keys()].some((file) => file.endsWith(name)),
        `${name} should be reachable from index.ts`
      );
    }
  });

  it('reaches no Node built-in', () => {
    for (const [file, source] of reachable) {
      for (const specifier of importsOf(source)) {
        const bare = specifier.replace(/^node:/, '');
        assert.ok(
          !NODE_ONLY.includes(bare),
          `${file} imports '${specifier}', which a browser has no answer for`
        );
      }
    }
  });

  it('does not reach the filesystem loader or either CLI', () => {
    for (const name of ['node-loader.ts', 'node.ts', 'eloc.ts', 'elo.ts']) {
      assert.ok(
        ![...reachable.keys()].some((file) => file.endsWith(`/${name}`)),
        `${name} must not be reachable from index.ts`
      );
    }
  });
});
