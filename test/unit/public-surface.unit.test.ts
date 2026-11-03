import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as elo from '../../src/index';

/**
 * The public interface, pinned.
 *
 * Semver is a promise about a surface, and Elo's was never declared: 66 names
 * were reachable from the package entry, five were documented, and 33 of them
 * arrived through `export * from './ast'` — published by accident rather than
 * by decision. So "is this a breaking change?" could not be answered, and the
 * version number for 1.2.0 was a judgement instead of a derivation.
 *
 * The three tiers are documented in README.md under "Versioning and the public
 * interface". This test makes them true rather than aspirational:
 *
 *  - every name the package exports is classified in exactly one tier, so a new
 *    export fails until someone decides what it promises;
 *  - every classified name is still exported, so a removal fails too;
 *  - `src/index.ts` contains no `export *`, because a wildcard is what let the
 *    surface grow without anyone choosing.
 *
 * The third tier is the one worth explaining: PRIVATE here means *reachable
 * but unsupported*. Nothing is hidden — unexporting would buy nothing, since
 * private already means no promise — so being importable is not a promise, and
 * this list is where that is said out loud.
 */

/**
 * Public — breaking it requires a major release.
 *
 * What you need to use Elo as a black box: parse, compile, evaluate,
 * type-check. The option and result types are here by derivation rather than
 * by taste — a public function you cannot name the arguments of is not usable
 * from TypeScript.
 */
const PUBLIC = [
  // Compiling and evaluating
  'compile', 'CompileOptions', 'EloRuntime',
  'parse', 'ParserOptions',
  'compileToRuby', 'RubyCompileOptions',
  'compileToJavaScript', 'JavaScriptCompileOptions',
  'compileToSQL', 'SQLCompileOptions',
  'compileToPython', 'PythonCompileOptions',
  // Type checking. `formatDiagnostic` is public on purpose: it renders a
  // diagnostic the way the CLI does, which is what lets a host report one
  // without reading `DiagnosticCode` — the protected part.
  'typecheck', 'Diagnostic', 'TypecheckOptions', 'formatDiagnostic',
  // Preludes, and whether a target's can be prepended at all
  'getPrelude', 'isPreludePrependable', 'PreludeTarget',
  // Reading a program with imports, and the loader a host supplies
  'loadProgram', 'scopeProgram', 'hasNoExpression', 'readProgram',
  'ModuleLoader', 'LoadOptions', 'LoadedProgram',
  // The failure a compiled expression raises. `kind`, `path` and `label` are
  // promised; the `message` prose is not, which is why the kinds exist.
  'EloFailure',
];

/**
 * Protected — may change in a minor release, announced in the changelog.
 *
 * The AST, its node shapes and its factories, plus anything whose shape is
 * keyed on an AST node or names a diagnostic.
 */
const PROTECTED = [
  // Factories
  'literal', 'nullLiteral', 'stringLiteral', 'dateLiteral', 'dateTimeLiteral',
  'durationLiteral', 'variable', 'binary', 'unary', 'temporalKeyword',
  'functionCall', 'apply', 'memberAccess', 'letExpr', 'ifExpr', 'lambda',
  'objectLiteral', 'arrayLiteral', 'alternative', 'dataPath', 'typeRef',
  'typeSchema', 'typeDef', 'withTypeDefs', 'withLetBindings',
  'subtypeConstraint', 'arrayType', 'unionType', 'guardExpr',
  // Node shapes
  'Expr', 'SourceLocation', 'Located', 'Literal', 'NullLiteral', 'StringLiteral',
  'DateLiteral', 'DateTimeLiteral', 'DurationLiteral', 'TemporalKeyword',
  'Variable', 'BinaryOp', 'UnaryOp', 'FunctionCall', 'Apply', 'MemberAccess',
  'LetBinding', 'LetExpr', 'IfExpr', 'Lambda', 'ObjectProperty', 'ObjectLiteral',
  'ArrayLiteral', 'Alternative', 'DataPath', 'TypeExpr', 'TypeRef', 'TypeSchema',
  'Constraint', 'SubtypeConstraint', 'ArrayType', 'UnionType',
  'TypeSchemaProperty', 'TypeBinding', 'ImportDecl', 'TypeDef', 'GuardExpr',
  // Produces or carries AST nodes
  'parseTypeExpr',
  'typecheckWithAnnotations', 'TypeAnnotations',
  // A closed set a host switches on. The checker keeps reporting; which code
  // it uses for a given mistake may be renamed.
  'DiagnosticCode',
];

/**
 * Private — reachable, and no promise at all.
 *
 * Everything here is importable and some of it is used in this repository;
 * that is not a promise. A host depending on one of these should expect to be
 * broken by a patch release.
 */
const PRIVATE = [
  // Serialisation: the function is private, the Elo literal syntax it emits
  // stays public through the binaries.
  'toEloCode',
  // Data formats: same split — private names over formats the CLIs promise.
  'parseCSV', 'toCSV', 'jsonAdapter', 'csvAdapter', 'eloAdapter',
  'defaultFormats', 'getFormat', 'FormatAdapter', 'FormatRegistry',
  // Diagnostic plumbing the compiler uses to position a refusal.
  'locate', 'isLocated', 'formatSourceLocation', 'assertDistinctNames',
  // Parser internals. `parse` is the entry point.
  'Parser', 'TRAILING_INPUT', 'splitProgramHeader', 'ProgramHeaderSplit',
  // Emission metadata and checker internals.
  'compileToJavaScriptWithMeta', 'JavaScriptCompileResult',
  'typecheckWithType', 'typecheckStructural', 'describeType', 'projectType',
  'CheckType',
  // The raw JavaScript helper sources, for a host assembling its own prelude.
  'JS_HELPERS',
];

const TIERS: Record<string, readonly string[]> = { PUBLIC, PROTECTED, PRIVATE };
const CLASSIFIED = new Set([...PUBLIC, ...PROTECTED, ...PRIVATE]);

const INDEX = fs.readFileSync(path.join(process.cwd(), 'src/index.ts'), 'utf-8');

/**
 * Every name `src/index.ts` exports, values and types alike.
 *
 * Read from the source rather than from the module, because a type export
 * leaves nothing behind at runtime — and `EloFailure` and `DiagnosticCode` are
 * exactly the kind of promise that would otherwise go unpinned.
 */
function declaredExports(): string[] {
  const names: string[] = [];
  const block = /export\s+(?:type\s+)?\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = block.exec(INDEX)) !== null) {
    for (const entry of match[1].split(',')) {
      const name = entry.trim();
      if (!name) continue;
      // `Target as PreludeTarget` is exported under the alias.
      const renamed = /\bas\s+([A-Za-z_$][\w$]*)$/.exec(name);
      names.push(renamed ? renamed[1] : name.replace(/^type\s+/, ''));
    }
  }
  return names;
}

describe('public surface - the list is explicit', () => {
  it('src/index.ts has no wildcard export', () => {
    const wildcards = [...INDEX.matchAll(/export\s+\*\s+from\s+'([^']+)'/g)].map((m) => m[1]);
    assert.deepStrictEqual(
      wildcards, [],
      `src/index.ts re-exports all of ${wildcards.join(', ')}. A wildcard publishes ` +
      `whatever those modules happen to export, which is how 33 names became public ` +
      `by accident. List the names instead, and classify them in this test.`
    );
  });

  it('declares every name exactly once', () => {
    const seen = new Set<string>();
    const twice = declaredExports().filter((name) => seen.size === seen.add(name).size);
    assert.deepStrictEqual(twice, [], `exported more than once: ${twice.join(', ')}`);
  });
});

describe('public surface - every export is classified', () => {
  it('has no unclassified export', () => {
    const unclassified = declaredExports().filter((name) => !CLASSIFIED.has(name));
    assert.deepStrictEqual(
      unclassified, [],
      `these names are exported but in no tier: ${unclassified.join(', ')}. ` +
      `Add each to PUBLIC, PROTECTED or PRIVATE — deciding what a new export ` +
      `promises is the point of this test.`
    );
  });

  it('has no classified name that is not exported', () => {
    const declared = new Set(declaredExports());
    const missing = [...CLASSIFIED].filter((name) => !declared.has(name));
    assert.deepStrictEqual(
      missing, [],
      `these names are classified but no longer exported: ${missing.join(', ')}. ` +
      `Removing a public or protected name is a breaking change; drop it from the ` +
      `list here once the version reflects that.`
    );
  });

  it('puts each name in exactly one tier', () => {
    const where = new Map<string, string[]>();
    for (const [tier, names] of Object.entries(TIERS)) {
      for (const name of names) where.set(name, [...(where.get(name) ?? []), tier]);
    }
    const ambiguous = [...where].filter(([, tiers]) => tiers.length > 1);
    assert.deepStrictEqual(
      ambiguous.map(([name, tiers]) => `${name}: ${tiers.join(' and ')}`), [],
      'a name cannot be in two tiers'
    );
  });
});

describe('public surface - the runtime agrees', () => {
  it('exports every classified value, and no value it does not classify', () => {
    const runtime = Object.keys(elo).sort();
    // A type disappears at runtime, so the runtime view is the values only.
    const classifiedValues = [...CLASSIFIED].filter((name) => name in elo).sort();
    assert.deepStrictEqual(
      runtime.filter((name) => !CLASSIFIED.has(name)), [],
      'a value is reachable from the package entry but classified in no tier'
    );
    assert.deepStrictEqual(runtime, classifiedValues);
  });
});

describe('public surface - the README agrees', () => {
  const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf-8');
  const section = readme.slice(readme.indexOf('## Versioning and the public interface'));
  const versioning = section.slice(0, section.indexOf('\n## ', 1));

  it('documents the surface', () => {
    assert.ok(versioning.length > 0, 'README has no Versioning section');
    for (const tier of ['Public', 'Protected', 'Private']) {
      assert.ok(versioning.includes(tier), `README's Versioning section never mentions ${tier}`);
    }
  });

  // The section names entry points inline. Each has to exist, and has to be in
  // the tier the prose puts it in — otherwise the documentation drifts from the
  // lists above and a reader is told the wrong promise.
  it('names only public things in its public tier', () => {
    const publicPart = versioning.slice(0, versioning.indexOf('**Protected'));
    const named = [...publicPart.matchAll(/`([A-Za-z_$][\w$]*)`/g)].map((m) => m[1]);
    const claimed = named.filter((name) => CLASSIFIED.has(name));
    assert.ok(claimed.length >= 5, `expected the README to name public entry points, found ${claimed}`);
    for (const name of claimed) {
      assert.ok(
        PUBLIC.includes(name),
        `README's public tier names '${name}', which this test classifies as ` +
        `${PROTECTED.includes(name) ? 'protected' : 'private'}`
      );
    }
  });
});
