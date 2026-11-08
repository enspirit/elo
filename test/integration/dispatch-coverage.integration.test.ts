import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '../../src/parser';
import { loadProgram, scopeProgram } from '../../src/modules';
import { nodeLoader } from '../../src/node-loader';
import { typecheckWithAnnotations } from '../../src/typecheck';
import { StdLib } from '../../src/stdlib';
import { createJavaScriptBinding } from '../../src/bindings/javascript';
import { createRubyBinding } from '../../src/bindings/ruby';
import { createPythonBinding } from '../../src/bindings/python';
import { createSQLBinding } from '../../src/bindings/sql';
import { compileToJavaScript } from '../../src/compilers/javascript';
import { compileToRuby } from '../../src/compilers/ruby';
import { compileToPython } from '../../src/compilers/python';
import { compileToSQL } from '../../src/compilers/sql';

/**
 * Which stdlib implementations does the fixture corpus actually compile?
 *
 * Every other check in this repository — the acceptance runs, and all three
 * emitted-grammar gates — only sees code that something handed it. Three times
 * while building those gates a check was green not because the emitter was
 * right but because **nothing reached it**:
 *
 *  - the typed `at()` sandbox escape: no fixture indexed a list with anything
 *    but a literal, so the emitter holding it was unreachable (0245);
 *  - the `__proto__` object-literal key: no fixture built such an object (0245);
 *  - `#` in an `extract()` template: no fixture had one (0246).
 *
 * Each was found by accident, one at a time. This test is the list of them.
 *
 * `registry-consistency.unit.test.ts` already pins two directions — everything
 * the type table declares is emittable, and everything a target emits is
 * declared. This adds the third: everything a target implements is actually
 * **exercised**. A signature nobody compiles is a signature no gate inspects
 * and no acceptance assertion runs.
 *
 * Both directions are checked, as there:
 *
 *  - an implementation that no fixture reaches must be listed in UNREACHED
 *    with a reason, so a *new* gap fails rather than joining a silent pile;
 *  - a listed implementation that the corpus now reaches must be removed, so
 *    the list shrinks as fixtures are written rather than rotting.
 *
 * The right long-run size of UNREACHED is zero. It is not zero today, and the
 * entries say which kind of gap each one is.
 */

const FIXTURES = join(__dirname, '../../../test/fixtures');
const MODULES_DIR = 'modules';

/**
 * Signatures no fixture compiles, by target, each with the reason it is still
 * here. A to-do list, not an allowlist.
 *
 * `dynamic` — the `any`-typed form of a function whose typed form is covered.
 * Reachable today by wrapping the call in a lambda, since a lambda parameter
 * is `any`; CLAUDE.md already asks for both paths to be asserted and these are
 * where that has not been done. The largest group, and the one that matters
 * most: the dynamic emitters are a separate body of code, and most of the
 * sandbox escapes to date have been in one.
 *
 * `widening` — a numeric or temporal operand combination the typed path
 * handles but no fixture writes, e.g. `Float * Float` or `min(Float, Int)`.
 *
 * `cross-type` — a comparison between two different types. Legal Elo (`1 ==
 * 'a'` compiles) and answers false, but untested.
 */
type Reason = 'dynamic' | 'widening' | 'cross-type';

const UNREACHED: Record<string, Record<string, Reason>> = {
  javascript: {
    // dynamic
    'Datetime:any': 'dynamic',
    'Interval:any': 'dynamic',
    'assert:any': 'dynamic',
    'assert:any,string': 'dynamic',
    // cross-type
    'eq:bool,float': 'cross-type',
    'eq:bool,int': 'cross-type',
    'eq:bool,string': 'cross-type',
    'eq:date,datetime': 'cross-type',
    'eq:float,bool': 'cross-type',
    'eq:float,string': 'cross-type',
    'eq:int,bool': 'cross-type',
    'eq:int,float': 'cross-type',
    'eq:int,string': 'cross-type',
    'eq:string,bool': 'cross-type',
    'eq:string,float': 'cross-type',
    'eq:string,int': 'cross-type',
    'neq:bool,float': 'cross-type',
    'neq:bool,int': 'cross-type',
    'neq:bool,string': 'cross-type',
    'neq:date,datetime': 'cross-type',
    'neq:datetime,date': 'cross-type',
    'neq:float,bool': 'cross-type',
    'neq:float,int': 'cross-type',
    'neq:float,string': 'cross-type',
    'neq:int,bool': 'cross-type',
    'neq:int,float': 'cross-type',
    'neq:int,string': 'cross-type',
    'neq:string,bool': 'cross-type',
    'neq:string,float': 'cross-type',
    'neq:string,int': 'cross-type',
    // widening
    'Interval:interval': 'widening',
    'String:null': 'widening',
    'assert:bool,string': 'widening',
    'ceil:int': 'widening',
    'div:duration,float': 'widening',
    'floor:int': 'widening',
    'max:float,int': 'widening',
    'min:float,int': 'widening',
    'mod:float,float': 'widening',
    'mod:int,float': 'widening',
    'mul:float,duration': 'widening',
    'mul:float,float': 'widening',
    'pos:float': 'widening',
    'pos:int': 'widening',
    'pow:float,float': 'widening',
    'round:int': 'widening',
    'sub:float,int': 'widening',
  },
  ruby: {
    // dynamic
    'Datetime:any': 'dynamic',
    'Interval:any': 'dynamic',
    'assert:any,string': 'dynamic',
    'max:any,float': 'dynamic',
    'max:any,int': 'dynamic',
    'max:float,any': 'dynamic',
    'max:int,any': 'dynamic',
    'min:any,float': 'dynamic',
    'min:any,int': 'dynamic',
    'min:float,any': 'dynamic',
    'min:int,any': 'dynamic',
    // widening
    'Interval:interval': 'widening',
    'String:null': 'widening',
    'ceil:int': 'widening',
    'div:duration,float': 'widening',
    'endOfDay:date': 'widening',
    'endOfQuarter:date': 'widening',
    'endOfWeek:date': 'widening',
    'endOfYear:date': 'widening',
    'floor:int': 'widening',
    'max:float,int': 'widening',
    'min:float,int': 'widening',
    'mod:float,float': 'widening',
    'mod:int,float': 'widening',
    'mul:float,float': 'widening',
    'round:int': 'widening',
    'sub:float,int': 'widening',
  },
  python: {
    // dynamic
    'Interval:any': 'dynamic',
    'max:any,float': 'dynamic',
    'max:any,int': 'dynamic',
    'max:float,any': 'dynamic',
    'max:int,any': 'dynamic',
    'min:any,float': 'dynamic',
    'min:any,int': 'dynamic',
    'min:float,any': 'dynamic',
    'min:int,any': 'dynamic',
    'or:any,any': 'dynamic',
    // cross-type
    'eq:int,float': 'cross-type',
    'gt:int,float': 'cross-type',
    'gte:int,float': 'cross-type',
    'lt:int,float': 'cross-type',
    'lte:float,int': 'cross-type',
    'lte:int,float': 'cross-type',
    'neq:float,int': 'cross-type',
    'neq:int,float': 'cross-type',
    // widening
    'Interval:interval': 'widening',
    'assert:bool,string': 'widening',
    'ceil:int': 'widening',
    'floor:int': 'widening',
    'gt:duration,duration': 'widening',
    'gte:duration,duration': 'widening',
    'gte:float,float': 'widening',
    'lt:duration,duration': 'widening',
    'lte:duration,duration': 'widening',
    'lte:float,float': 'widening',
    'max:float,int': 'widening',
    'min:float,int': 'widening',
    'mod:float,float': 'widening',
    'mod:int,float': 'widening',
    'mul:float,float': 'widening',
    'pos:float': 'widening',
    'pos:int': 'widening',
    'pow:float,float': 'widening',
    'round:int': 'widening',
    'sub:float,int': 'widening',
  },
  sql: {
    // dynamic
    'Bool:any': 'dynamic',
    'Datetime:any': 'dynamic',
    'Duration:any': 'dynamic',
    'Float:any': 'dynamic',
    'Int:any': 'dynamic',
    'Interval:any': 'dynamic',
    'assert:any,string': 'dynamic',
    // Registered on purpose rather than left to the arity fallback (see the
    // comment in src/bindings/sql.ts), and genuinely unreachable: a path whose
    // type the checker cannot name has to arrive through something like
    // `min([...])`, and PostgreSQL's UNNEST flattens a nested array, so no SQL
    // expression can produce an array-typed value of unknown Elo type. The
    // other three targets reach their `fetch:any,any` through a lambda.
    'fetch:any,any': 'dynamic',
    'pos:any': 'dynamic',
    // widening
    'Interval:interval': 'widening',
    'String:null': 'widening',
    'ceil:int': 'widening',
    'floor:int': 'widening',
    'round:int': 'widening',
  },
};

function classify(key: string): Reason {
  const args = key.includes(':') ? key.slice(key.indexOf(':') + 1).split(',') : [];
  if (args.includes('any')) return 'dynamic';
  const COMPARISONS = ['eq', 'neq', 'lt', 'gt', 'lte', 'gte'];
  const name = key.split(':')[0];
  if (COMPARISONS.includes(name) && new Set(args).size > 1) return 'cross-type';
  return 'widening';
}

function findEloFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== MODULES_DIR) files.push(...findEloFiles(full));
    } else if (entry.endsWith('.elo')) files.push(full);
  }
  return files.sort();
}

const TARGETS = {
  javascript: [createJavaScriptBinding, compileToJavaScript],
  ruby: [createRubyBinding, compileToRuby],
  python: [createPythonBinding, compileToPython],
  sql: [createSQLBinding, compileToSQL],
} as const;

/** Signature keys the corpus dispatched, per target. */
const reached: Record<string, Set<string>> = {};

describe('Every stdlib implementation is reached by some fixture', () => {
  let restore: typeof StdLib.prototype.emit;

  before(() => {
    // `emit` is the one place a dispatch happens, so recording there sees
    // every one. `keyOf(lookup(...))` rather than the requested key because
    // lookup generalizes: `at(array, int)` can be answered by `at(any, any)`,
    // and it is the *answering* implementation whose code gets emitted.
    restore = StdLib.prototype.emit;
    let current: string | null = null;

    StdLib.prototype.emit = function (this: StdLib<string>, name, args, argTypes, ctx) {
      if (current) {
        const impl = this.lookup(name, argTypes);
        const key = impl && this.keyOf(impl);
        if (key) reached[current].add(key);
      }
      return restore.call(this, name, args, argTypes, ctx);
    };

    const files = findEloFiles(FIXTURES);
    for (const target of Object.keys(TARGETS)) {
      reached[target] = new Set();
      current = target;
      const compile = TARGETS[target as keyof typeof TARGETS][1];
      for (const path of files) {
        let scope;
        try {
          scope = loadProgram(readFileSync(path, 'utf-8'), { loader: nodeLoader(), file: path });
        } catch {
          continue;
        }
        for (const line of scope.body.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          // Both compile modes: `--optimize` feeds the checker's annotations
          // back into codegen and therefore picks *different* implementations.
          for (const annotated of [false, true]) {
            try {
              const ast = scopeProgram(scope, parse(line));
              const types = annotated
                ? typecheckWithAnnotations(ast, { allowUndefinedVariables: target === 'sql' }).types
                : undefined;
              compile(ast, types ? { types } : {});
            } catch {
              // A refusal compiles nothing, so there is nothing to record.
            }
          }
        }
      }
    }
    current = null;
  });

  after(() => {
    StdLib.prototype.emit = restore;
  });

  for (const [target, [makeBinding]] of Object.entries(TARGETS)) {
    it(`${target}: no new unreached implementation`, () => {
      const declared = new Set(makeBinding().signatureKeys());
      const missing = [...declared].filter(key => !reached[target].has(key)).sort();
      const listed = UNREACHED[target];
      const unlisted = missing.filter(key => !(key in listed));

      assert.deepStrictEqual(
        unlisted,
        [],
        `${target}: ${unlisted.length} implementation(s) that no fixture compiles and that `
        + 'UNREACHED does not list. Write a fixture that reaches them — a signature nothing '
        + 'compiles is one no acceptance run executes and no emitted-grammar gate inspects. '
        + 'If one is genuinely unreachable, add it with a reason.\n\n'
        + unlisted.map(k => `  ${k}  (looks like: ${classify(k)})`).join('\n')
      );
    });

    it(`${target}: no stale UNREACHED entry`, () => {
      const stale = Object.keys(UNREACHED[target]).filter(key => reached[target].has(key)).sort();
      assert.deepStrictEqual(
        stale,
        [],
        `${target}: UNREACHED lists ${stale.length} signature(s) the corpus now reaches. `
        + 'Delete them — the list has to shrink as fixtures are written, or it stops '
        + `meaning anything.\n\n${stale.map(k => `  ${k}`).join('\n')}`
      );
    });
  }

  it('reports the shape of what is left', () => {
    const counts: Record<string, Record<string, number>> = {};
    for (const target of Object.keys(TARGETS)) {
      counts[target] = {};
      for (const reason of Object.values(UNREACHED[target])) {
        counts[target][reason] = (counts[target][reason] ?? 0) + 1;
      }
    }
    // Not an assertion about the numbers — a line in the output so that the
    // size of the gap is visible without anyone running a script.
    console.log('  unreached by kind:', JSON.stringify(counts));
    assert.ok(true);
  });
});
