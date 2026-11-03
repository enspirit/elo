import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vm from 'node:vm';
import { DateTime, Duration, Interval } from 'luxon';
import * as elo from '../../src/index';
import * as eloNode from '../../src/node';

/**
 * The README's TypeScript examples, checked.
 *
 * The website's Elo examples are extracted and evaluated
 * (website-examples.unit.test.ts); the README's were checked by nothing, which
 * is how it came to document an AST example that raises `Undefined variable:
 * 'price'` and imports from './src' — a contributor's path, not a host's. Both
 * were wrong at 1.1.1 too, so the section had never been run.
 *
 * Two levels, because the blocks are not all of one kind. Every block gets the
 * static check, since a documented name that no longer exists is the drift that
 * matters most. Only the self-contained ones are executed: some blocks are
 * deliberately fragments, showing the shape of a call against a `input` or
 * `source` the surrounding prose describes, and padding them with boilerplate
 * to make them run would make them worse documentation.
 */

const README = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf-8');

/** The modules a README example may import from, as a host would name them. */
const MODULES: Record<string, Record<string, unknown>> = {
  '@enspirit/elo': elo as unknown as Record<string, unknown>,
  '@enspirit/elo/node': eloNode as unknown as Record<string, unknown>,
  'luxon': { DateTime, Duration, Interval },
};

interface Block {
  /** 1-based index among the TypeScript blocks, for a readable failure. */
  n: number;
  code: string;
  imports: Array<{ names: string[]; from: string; typeOnly: boolean }>;
  /** Free identifiers the block uses without importing or declaring them. */
  undeclared: string[];
}

function typescriptBlocks(): Block[] {
  const blocks: Block[] = [];
  const fence = /```typescript\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let n = 0;
  while ((match = fence.exec(README)) !== null) {
    const code = match[1];
    blocks.push({ n: ++n, code, imports: importsOf(code), undeclared: undeclaredOf(code) });
  }
  return blocks;
}

function importsOf(code: string): Block['imports'] {
  const decl = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g;
  const found: Block['imports'] = [];
  let match: RegExpExecArray | null;
  while ((match = decl.exec(code)) !== null) {
    found.push({
      typeOnly: Boolean(match[1]),
      names: match[2].split(',').map((name) => name.trim()).filter(Boolean),
      from: match[3],
    });
  }
  return found;
}

/**
 * The names a block uses but neither imports nor declares.
 *
 * Deliberately crude — it is a classifier for "is this block a fragment",
 * not a scope analyser. It looks at identifiers in call position and on the
 * right of an assignment, which is enough to tell `compile(source, …)` with an
 * undescribed `source` from an example that stands on its own.
 */
function undeclaredOf(source: string): string[] {
  const imported = new Set(importsOf(source).flatMap((entry) => entry.names));
  // Elo code travels inside these examples as string and template literals, so
  // they have to go first: `parse('assert(1 == 1)')` uses no JS binding called
  // `assert`, and reading one there would call every such block a fragment.
  const code = source
    .replace(/\/\/[^\n]*/g, '')
    .replace(/`[\s\S]*?`/g, '``')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
  const declared = new Set<string>();
  for (const match of code.matchAll(/\b(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g)) {
    declared.add(match[1]);
  }
  for (const match of code.matchAll(/\bfor\s*\(\s*(?:const|let)\s+([A-Za-z_$][\w$]*)/g)) {
    declared.add(match[1]);
  }
  const used = new Set<string>();
  // An identifier being called, or used as a bare argument to a call. A name
  // after a dot is a property, not a binding — `DateTime.now()` needs
  // `DateTime` to be in scope and says nothing about `now`.
  for (const match of code.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) used.add(match[2]);
  for (const match of code.matchAll(/\(\s*([a-z_$][\w$]*)\s*[,)]/g)) used.add(match[1]);
  const KEYWORDS = new Set(['if', 'for', 'while', 'catch', 'switch', 'return', 'typeof', 'new', 'console', 'JSON']);
  return [...used].filter((name) => !imported.has(name) && !declared.has(name) && !KEYWORDS.has(name));
}

/** Runs a block, resolving its imports against the real modules. */
function run(block: Block): void {
  let body = block.code;
  const scope: Record<string, unknown> = { console: { log: () => {} } };
  for (const entry of block.imports) {
    const module = MODULES[entry.from];
    for (const name of entry.names) {
      if (!entry.typeOnly) scope[name] = module[name];
    }
  }
  // Import declarations are not valid in a script; the names are in scope now.
  body = body.replace(/import\s+(?:type\s+)?\{[^}]*\}\s+from\s+'[^']+';?/g, '');
  // Strip the TypeScript the examples use, so plain JS is left to execute.
  // Crude on purpose — this is a documentation check, not a compiler. It
  // handles a call's type argument and a type annotation on a parameter or a
  // declaration, which is all the README uses; a ternary written `a ? b : c`
  // would confuse the second rule, so keep examples free of them.
  body = body.replace(/<\([^)]*\)\s*=>\s*[\w<>\[\]|\s]+>/g, '');   // compile<(x: number) => number>
  body = body.replace(/:\s*[A-Za-z_$][\w$<>\[\]|.\s]*(?=[,)=])/g, '');  // (name: string) =>
  vm.runInNewContext(body, vm.createContext(scope), { timeout: 5000 });
}

describe('README TypeScript examples - imports', () => {
  const blocks = typescriptBlocks();

  it('finds the examples', () => {
    assert.ok(blocks.length >= 6, `expected the README's TypeScript blocks, found ${blocks.length}`);
  });

  for (const block of blocks) {
    it(`block ${block.n} imports from a module a host can install`, () => {
      assert.ok(block.imports.length > 0, `block ${block.n} imports nothing`);
      for (const entry of block.imports) {
        assert.ok(
          entry.from in MODULES,
          `block ${block.n} imports from '${entry.from}', which a host cannot resolve. ` +
          `Use one of: ${Object.keys(MODULES).join(', ')}`
        );
      }
    });

    it(`block ${block.n} imports only names that exist`, () => {
      for (const entry of block.imports) {
        const module = MODULES[entry.from];
        if (!module) continue;
        for (const name of entry.names) {
          // A type-only import is erased, so it is checked by tsc rather than here.
          if (entry.typeOnly) continue;
          assert.ok(
            name in module,
            `block ${block.n} imports '${name}' from '${entry.from}', which does not export it`
          );
        }
      }
    });

    // A block that uses an Elo export without importing it is a missing
    // import, not a fragment. That is the distinction the fragment rule above
    // cannot make on its own: `readFileSync` and `source` are context the prose
    // supplies, while `memberAccess` is a name a reader would copy and be
    // unable to resolve. Found by this test failing on an example added with
    // exactly that mistake.
    it(`block ${block.n} imports every Elo name it uses`, () => {
      // `@enspirit/elo/node` re-exports the main entry and adds `nodeLoader`,
      // so attribute a name to the main entry when it is there — that is the
      // import a host should write.
      const lookup = new Map<string, string>();
      for (const specifier of ['@enspirit/elo/node', '@enspirit/elo']) {
        for (const name of Object.keys(MODULES[specifier])) lookup.set(name, specifier);
      }
      for (const name of block.undeclared) {
        assert.ok(
          !lookup.has(name),
          `block ${block.n} uses '${name}' without importing it — add it to the import from '${lookup.get(name)}'`
        );
      }
    });
  }
});

describe('README TypeScript examples - execution', () => {
  for (const block of typescriptBlocks()) {
    // A fragment names something the prose supplies; it is not meant to run.
    if (block.undeclared.length > 0) continue;
    it(`block ${block.n} runs`, () => {
      run(block);
    });
  }
});
