import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadProgram, scopeProgram, hasNoExpression } from '../../src/modules';
import type { ModuleLoader } from '../../src/modules';
import { parse } from '../../src/parser';

/**
 * The import linker, without a filesystem.
 *
 * `loadProgram` is given a `ModuleLoader`, so a module graph here is a plain
 * map of sources. What is asserted is the scope an import stands for: the type
 * definitions and let bindings a single source could have been written with.
 */

/**
 * A loader over a map, resolving a path against the directory of the module
 * that wrote it — what `nodeLoader` does on a filesystem.
 */
function mapLoader(files: Record<string, string>, calls?: Array<[string, string | undefined]>): ModuleLoader {
  return (path, from) => {
    calls?.push([path, from]);
    const dir = from && from.includes('/') ? from.slice(0, from.lastIndexOf('/') + 1) : '';
    const id = dir + (path.startsWith('./') ? path.slice(2) : path) + (path.endsWith('.elo') ? '' : '.elo');
    const source = files[id];
    if (source === undefined) throw new Error(`no module at ${id}`);
    return { id, source };
  };
}

const TYPES = `Age = Int(a | a >= 0)
Person = { name: String, age: Age }
`;

const REUSABLE = `let double_fn = fn( x ~> x * 2 ) in { double: double_fn, one: 1 }
`;

describe('loadProgram - a source with no imports', () => {
  it('declares nothing and leaves the body alone', () => {
    const program = loadProgram('1 + 1');
    assert.deepStrictEqual(program.typeDefs, []);
    assert.deepStrictEqual(program.bindings, []);
    assert.strictEqual(program.body, '1 + 1');
  });

  it('still reads a type prelude', () => {
    const program = loadProgram('Ints = [Int]\n[1] |> Ints');
    assert.deepStrictEqual(program.typeDefs.map(t => t.name), ['Ints']);
  });

  it('refuses an import when the host has no loader', () => {
    assert.throws(
      () => loadProgram("import { x } from './m'\nx"),
      /no module loader/
    );
  });
});

describe('loadProgram - importing types', () => {
  it('expands the names the module defined into the type it exports', () => {
    const program = loadProgram("import { Person } from './types'\n_ |> Person", {
      loader: mapLoader({ 'types.elo': TYPES }),
    });
    assert.deepStrictEqual(program.typeDefs.map(t => t.name), ['Person']);
    // `Age` is substituted, not referenced: the importer gets one
    // self-contained type and `Age` stays the module's business.
    assert.deepStrictEqual(program.typeDefs[0].typeExpr, {
      kind: 'type_schema',
      extras: undefined,
      properties: [
        { key: 'name', typeExpr: { kind: 'type_ref', name: 'String' }, optional: undefined },
        {
          key: 'age',
          optional: undefined,
          typeExpr: {
            kind: 'subtype_constraint',
            baseType: { kind: 'type_ref', name: 'Int' },
            variable: 'a',
            constraints: [{ condition: parse('a >= 0'), label: undefined }],
          },
        },
      ],
    });
  });

  it('brings in only the names the import asked for', () => {
    const program = loadProgram("import { Person } from './types'\n1", {
      loader: mapLoader({ 'types.elo': TYPES }),
    });
    assert.deepStrictEqual(program.typeDefs.map(t => t.name), ['Person']);
  });

  it('puts the imported types before the source own prelude', () => {
    const program = loadProgram("import { Person } from './types'\nPeople = [Person]\n1", {
      loader: mapLoader({ 'types.elo': TYPES }),
    });
    assert.deepStrictEqual(program.typeDefs.map(t => t.name), ['Person', 'People']);
  });

  it('refuses a type the module does not define', () => {
    assert.throws(
      () => loadProgram("import { Nope } from './types'\n1", {
        loader: mapLoader({ 'types.elo': TYPES }),
      }),
      /'types\.elo' defines no type 'Nope'/
    );
  });

  it('refuses a name defined twice in a module that exports no value', () => {
    assert.throws(
      () => loadProgram("import { Age } from './types'\n1", {
        loader: mapLoader({ 'types.elo': 'Age = Int\nAge = String\n' }),
      }),
      /Duplicate type definition 'Age'/
    );
  });
});

describe('loadProgram - importing values', () => {
  it('binds the module once and reads the name off it', () => {
    const program = loadProgram("import { double } from './reusable'\ndouble(1)", {
      loader: mapLoader({ 'reusable.elo': REUSABLE }),
    });
    assert.deepStrictEqual(program.bindings.map(b => b.name), ['_module_0', 'double']);
    assert.deepStrictEqual(program.bindings[1].value, {
      type: 'member_access',
      object: { type: 'variable', name: '_module_0' },
      property: 'double',
    });
    // The module's value is its own expression, scoped under its own header.
    assert.deepStrictEqual(program.bindings[0].value, parse(REUSABLE.trim()));
  });

  it('binds the module under its alias when it has one', () => {
    const program = loadProgram("import './reusable' as r\nr.one", {
      loader: mapLoader({ 'reusable.elo': REUSABLE }),
    });
    assert.deepStrictEqual(program.bindings.map(b => b.name), ['r']);
  });

  it('binds a module imported both ways once, under the alias', () => {
    const program = loadProgram("import { double } from './reusable'\nimport './reusable' as r\ndouble(1)", {
      loader: mapLoader({ 'reusable.elo': REUSABLE }),
    });
    assert.deepStrictEqual(program.bindings.map(b => b.name), ['r', 'double']);
    assert.deepStrictEqual(program.bindings[1].value, {
      type: 'member_access',
      object: { type: 'variable', name: 'r' },
      property: 'double',
    });
  });

  it('makes a second alias the first binding under another name', () => {
    const program = loadProgram("import './reusable' as r\nimport './reusable' as s\nr.one + s.one", {
      loader: mapLoader({ 'reusable.elo': REUSABLE }),
    });
    assert.deepStrictEqual(program.bindings.map(b => b.name), ['r', 's']);
    assert.deepStrictEqual(program.bindings[1].value, { type: 'variable', name: 'r' });
  });

  it('refuses a value import from a module that has no expression', () => {
    assert.throws(
      () => loadProgram("import { age } from './types'\nage", {
        loader: mapLoader({ 'types.elo': TYPES }),
      }),
      /has no expression, so it exports no value/
    );
  });

  it('refuses an alias of a module that has no expression', () => {
    assert.throws(
      () => loadProgram("import './types' as t\n1", {
        loader: mapLoader({ 'types.elo': TYPES }),
      }),
      /has no expression, so it exports no value/
    );
  });
});

describe('loadProgram - a module of its own', () => {
  it("resolves a module's imports against the module", () => {
    const calls: Array<[string, string | undefined]> = [];
    loadProgram("import { greet } from './sub/greeting'\ngreet(1)", {
      file: 'main.elo',
      loader: mapLoader({
        'sub/greeting.elo': "import { double } from './reusable'\nlet g = fn( n ~> double(n) ) in { greet: g }",
        'sub/reusable.elo': REUSABLE,
      }, calls),
    });
    // The second call says which module wrote the path, so a loader can
    // resolve it relative to that module rather than to the program.
    assert.deepStrictEqual(calls, [
      ['./sub/greeting', 'main.elo'],
      ['./reusable', 'sub/greeting.elo'],
    ]);
  });

  it('refuses a cycle, naming the chain from where it started', () => {
    assert.throws(
      () => loadProgram("import { b } from './b'\nb", {
        file: 'main.elo',
        loader: mapLoader({
          'main.elo': "import { b } from './b'\nb",
          'b.elo': "import { c } from './c'\n{ b: c }",
          'c.elo': "import { b } from './main'\n{ c: b }",
        }),
      }),
      /Import cycle: main\.elo -> b\.elo -> c\.elo -> main\.elo/
    );
  });

  it('refuses a graph that asks for more inlining than it looks', () => {
    // Each level imports the one below it through two wrappers, so the leaf is
    // inlined 2^n times from n levels of small files. The depth guard would
    // let this through; the inlining budget is what stops it.
    const files: Record<string, string> = { 'leaf.elo': '{ v: 1 }' };
    for (let level = 1; level <= 12; level++) {
      const below = level === 1 ? 'leaf' : `m${level - 1}`;
      files[`a${level}.elo`] = `import './${below}' as b\n{ v: b.v }`;
      files[`b${level}.elo`] = `import './${below}' as b\n{ v: b.v }`;
      files[`m${level}.elo`] = `import './a${level}' as x\nimport './b${level}' as y\n{ v: x.v + y.v }`;
    }
    assert.throws(
      () => loadProgram("import './m12' as m\nm.v", { loader: mapLoader(files) }),
      /inlines more than 200 modules/
    );
  });

  it('accepts the same module imported by two imports of its own', () => {
    const program = loadProgram(
      "import { double } from './reusable'\nimport { one } from './reusable'\ndouble(one)",
      { loader: mapLoader({ 'reusable.elo': REUSABLE }) }
    );
    assert.deepStrictEqual(program.bindings.map(b => b.name), ['_module_0', 'double', 'one']);
  });

  it('refuses a chain deeper than it was allowed to go', () => {
    assert.throws(
      () => loadProgram("import { b } from './b'\nb", {
        maxImportDepth: 1,
        loader: mapLoader({
          'b.elo': "import { c } from './c'\n{ b: c }",
          'c.elo': '{ c: 1 }',
        }),
      }),
      /more than 1 modules deep/
    );
  });

  it('names the module a parse error is in', () => {
    assert.throws(
      () => loadProgram("import { x } from './broken'\nx", {
        loader: mapLoader({ 'broken.elo': '{ x: ' }),
      }),
      /Cannot import 'broken\.elo'/
    );
  });

  it('tags the locations of an inlined module with its file', () => {
    const program = loadProgram("import './reusable' as r\nr.one", {
      locations: true,
      loader: mapLoader({ 'reusable.elo': REUSABLE }),
    });
    // The lambda's body is the first node the parser tags here, and it points
    // into the module rather than into the program that imported it.
    const value = program.bindings[0].value;
    assert.strictEqual(value.type, 'let');
    const lambda = value.type === 'let' ? value.bindings[0].value : value;
    assert.strictEqual(lambda.type, 'lambda');
    assert.deepStrictEqual(
      lambda.type === 'lambda' ? lambda.body.loc : undefined,
      { line: 1, column: 28, file: 'reusable.elo' }
    );
  });
});

describe('scopeProgram', () => {
  it('binds the module values outside the type definitions', () => {
    const program = loadProgram("import { Person } from './types'\nimport './reusable' as r\n1", {
      loader: mapLoader({ 'types.elo': TYPES, 'reusable.elo': REUSABLE }),
    });
    const expr = scopeProgram(program, parse('1'));
    assert.strictEqual(expr.type, 'let');
    assert.strictEqual(expr.type === 'let' && expr.body.type, 'typedef');
  });

  it('leaves an expression alone when the header declared nothing', () => {
    const expr = parse('1');
    assert.strictEqual(scopeProgram(loadProgram('1'), expr), expr);
  });
});

describe('hasNoExpression', () => {
  it('is true of blank lines and comments', () => {
    assert.strictEqual(hasNoExpression('\n# a comment\n   \n'), true);
  });

  it('is false as soon as something is written', () => {
    assert.strictEqual(hasNoExpression('\n# a comment\n1\n'), false);
  });
});
