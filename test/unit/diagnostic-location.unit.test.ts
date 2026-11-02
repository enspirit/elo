import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../../src/parser';
import { compileToJavaScript } from '../../src/compilers/javascript';
import { loadProgram, scopeProgram } from '../../src/modules';

/**
 * Where a refusal happened.
 *
 * A parse error has always said which line and column it is about. Everything
 * the transform refuses — an unknown function, a signature that does not
 * exist, a name bound twice — said only *what*, in a file of any length. Since
 * a program may be assembled out of imported modules, "somewhere in this
 * expression" can now be somewhere in any of several files.
 *
 * The position comes from the node the refusal happened on, which both the
 * transform and the emission have in hand, so it is taken once at each point
 * of recursion rather than at each of the throw sites. That is what makes this
 * hold for the next refusal too, and not only for the ones listed here.
 */

/** Compiles `source` with positions recorded, and answers the refusal. */
function refusalOf(source: string): string {
  try {
    compileToJavaScript(parse(source, { locations: true }));
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error(`'${source}' was not refused`);
}

/** The same, for a whole program: a header, its prelude, then an expression. */
function refusalOfProgram(source: string, file?: string): string {
  try {
    const program = loadProgram(source, { locations: true, file });
    compileToJavaScript(scopeProgram(program, parse(program.body, { locations: true, file })));
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error(`'${source}' was not refused`);
}

/**
 * One row per refusal the compiler can raise before it emits anything.
 *
 * The position is asserted, the prose only enough to tell the rows apart: it
 * is the position that is the point, and the message is pinned by the tests
 * that are about each refusal.
 */
const REFUSALS: Array<[name: string, source: string, at: string]> = [
  ['an undefined variable', 'nope + 1', 'line 1, column 1'],
  ['an unknown function', 'rond(1, 2)', 'line 1, column 1'],
  ['a signature that does not exist', "concat('a', 'b', 'c')", 'line 1, column 1'],
  ['a forbidden member', '_.constructor', 'line 1, column 3'],
  ['a member of a number', 'let a = 1 in a.x', 'line 1, column 16'],
  ['an array multiplication', '[1, 2] * 3', 'line 1, column 8'],
  ['a recursive call', 'let f = fn( x ~> f(x) ) in f(1)', 'line 1, column 18'],
  ['extract with the wrong arity', "extract('a')", 'line 1, column 1'],
  ['extract with a computed template', "extract('a', 1 + 1)", 'line 1, column 1'],
  ['a forbidden fetch key', "fetch(_, 'constructor')", 'line 1, column 1'],
  ['a name bound twice', 'let a = 1, a = 2 in a', 'line 1, column 12'],
  ['a parameter named twice', 'fn( x, x ~> x )', 'line 1, column 1'],
];

describe('a compile-time refusal says where it is', () => {
  for (const [name, source, at] of REFUSALS) {
    it(`names the position of ${name}`, () => {
      assert.match(refusalOf(source), new RegExp(`\\bat ${at}\\b`));
    });
  }

  it('names the position of a type defined twice', () => {
    assert.match(refusalOfProgram('T = Int\nT = String\n1'), /at line 2, column 1\b/);
  });

  it('leaves the message alone when positions were not recorded', () => {
    // `parse` records positions on request, so a host that does not ask gets
    // what it always got.
    assert.throws(
      () => compileToJavaScript(parse('rond(1, 2)')),
      /^Error: Unknown function rond\(Int, Int\)$/
    );
  });
});

describe('a refusal in an imported module says which module', () => {
  const FILES: Record<string, string> = {
    'helpers.elo': "let h = fn( n ~> rond(n, 2) ) in { h: h }\n",
    'twice.elo': 'T = Int\nT = String\n1\n',
  };

  function moduleRefusal(source: string): string {
    try {
      const program = loadProgram(source, {
        locations: true,
        file: 'main.elo',
        loader: (path) => {
          const id = path.replace('./', '') + '.elo';
          return { id, source: FILES[id] };
        },
      });
      compileToJavaScript(scopeProgram(program, parse(program.body, { locations: true, file: 'main.elo' })));
    } catch (error) {
      return (error as Error).message;
    }
    throw new Error(`'${source}' was not refused`);
  }

  it('names the module a refused call is in', () => {
    assert.match(
      moduleRefusal("import { h } from './helpers'\nh(1)"),
      /at line 1, column 18 of helpers\.elo/
    );
  });

  it('names the module a duplicate type definition is in', () => {
    assert.match(
      moduleRefusal("import { T } from './twice'\n1"),
      /at line 2, column 1 of twice\.elo/
    );
  });
});
