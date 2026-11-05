/**
 * The catalogue a service serves: every bundle, read, checked and compiled,
 * once, at boot.
 *
 * Three things happen here and nowhere else:
 *
 * - **A bundle is validated.** An invalid one is a refusal to start rather
 *   than a 500 per request: a catalogue serving a formula whose form disagrees
 *   with its type is worse than one that does not come up, and the error
 *   belongs to whoever published it.
 * - **Every case is run.** On boot, in process — the cases are trusted content
 *   and this is a few hundred evaluations. A service that is up has therefore
 *   demonstrated that every formula in it answers what its documentation says.
 * - **The service program is compiled**, once per formula and target. Never
 *   per request: a compiled Elo expression is a function, and reusing it is
 *   both faster and the only way a timeout measures what it means to.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  compileToJavaScript,
  compileToPython,
  compileToRuby,
  getPrelude,
  loadProgram,
  parse,
  readProgram,
  scopeProgram,
  toEloCode,
} from '../../../src';
import type { Expr } from '../../../src';
import { nodeLoader } from '../../../src/node';
import { toJson, type AnswerShape } from './answer';
import {
  answerShape,
  describeAnswers,
  loadCatalogue,
  runCases,
  serviceSource,
  validateBundle,
  type AnswerDescriptor,
  type Bundle,
  type FieldDescriptor,
  type FormulaCase,
} from './bundle';

/** The targets a formula is served compiled to, in the order a client sees. */
export const TARGETS = ['js', 'ruby', 'python'] as const;
export type Target = (typeof TARGETS)[number];

/** The five files of a bundle, as the sub-resources that serve them. */
export const BUNDLE_FILES = ['types.elo', 'formula.elo', 'fields.elo', 'cases.elo', 'bundle.json'] as const;

/** §3: the bundle, flattened — what `GET /{id}@{version}` answers. */
export interface FormulaDescriptor {
  id: string;
  version: string;
  title: string;
  doc: string;
  tags: string[];
  license?: string;
  deprecated: boolean;
  fields: FieldDescriptor[];
  answers: AnswerDescriptor[];
  cases: FormulaCase[];
  targets: Target[];
  links: Record<string, string>;
}

/** §7: one line of the index. A thousand formulas is a thousand file reads. */
export interface IndexEntry {
  id: string;
  version: string;
  title: string;
  tags: string[];
  versions: string[];
  links: Record<string, string>;
}

/** One formula, at one version, ready to serve and to run. */
export interface ServedFormula {
  id: string;
  version: string;
  bundle: Bundle;
  /** Strong validator: the content of the five files. */
  etag: string;
  descriptor: FormulaDescriptor;
  entry: IndexEntry;
  /** The five files, verbatim, by name. */
  files: Record<string, string>;
  /** The service program, as Elo and compiled — what `Accept` chooses between. */
  representations: Record<string, string>;
  /** The JavaScript the sandbox runs: no prelude, luxon bound by the worker. */
  code: string;
  /** How to write the answer, from `Output`. */
  shape: AnswerShape;
}

export interface ServedCatalogue {
  dir: string;
  formulas: ServedFormula[];
  /**
   * By id, which is unique: a formula's id is its directory, and a directory
   * holds one bundle, which declares one version. Serving several versions of
   * one formula is the publishing step of §2, and waits for it — so there is
   * nothing to choose between here, and no choosing code to get wrong.
   */
  byId: Map<string, ServedFormula>;
  /** Changes when anything in the catalogue does. */
  etag: string;
}

/**
 * Read, check and compile a catalogue directory.
 *
 * It throws on the first bundle it cannot stand behind, listing everything
 * wrong with it rather than the first thing: a publisher fixing a bundle wants
 * the list.
 */
export function loadServedCatalogue(dir: string): ServedCatalogue {
  const formulas = loadCatalogue(dir).map(serveBundle);
  return {
    dir,
    formulas,
    byId: new Map(formulas.map(formula => [formula.id, formula])),
    etag: strongETag(formulas.map(formula => formula.etag).join('\n')),
  };
}

function serveBundle(bundle: Bundle): ServedFormula {
  const problems = validateBundle(bundle);
  if (problems.length > 0) {
    throw new Error(`the catalogue holds a bundle that cannot be served:\n  ${problems.join('\n  ')}`);
  }

  for (const row of runCases(bundle)) {
    if (!row.ok) {
      throw new Error(
        `${bundle.id}: case '${row.name}' answers ${toEloCode(row.got)}, not ${toEloCode(row.expect)}`
      );
    }
  }

  const version = bundle.manifest.version;
  const files = Object.fromEntries(
    BUNDLE_FILES.map(name => [name, readFileSync(join(bundle.dir, name), 'utf-8')])
  );

  const elo = serviceSource();
  const compiled = compileRepresentations(bundle, elo);
  const targets = TARGETS.filter(target => compiled[target] !== undefined);
  if (compiled.js === undefined) {
    throw new Error(`${bundle.id}: the service program does not compile to JavaScript, which is what runs it`);
  }

  // A case is a request body and the response body that goes with it, which is
  // what makes "try this example" worth offering: a client POSTs the input and
  // compares with the expect. So the expect is written by `Output`, exactly as
  // the call's own answer is — `cases.elo` holds an Elo value, and a `Date` in
  // it is a `Date` rather than a moment in whatever timezone the server is in.
  const shape = answerShape(bundle);
  const cases = bundle.cases.map(testCase => ({
    ...testCase,
    expect: toJson(testCase.expect, shape),
  }));

  const descriptor: FormulaDescriptor = {
    id: bundle.id,
    version,
    title: bundle.title,
    doc: bundle.doc,
    tags: bundle.manifest.tags ?? [],
    ...(bundle.manifest.license ? { license: bundle.manifest.license } : {}),
    deprecated: false,
    fields: bundle.form,
    answers: describeAnswers(bundle),
    cases,
    targets,
    links: {
      self: `/${bundle.id}@${version}`,
      latest: `/${bundle.id}`,
      call: `/${bundle.id}@${version}/call`,
      form: `/${bundle.id}@${version}/form`,
      openapi: `/${bundle.id}@${version}/openapi.json`,
    },
  };

  return {
    id: bundle.id,
    version,
    bundle,
    etag: strongETag(BUNDLE_FILES.map(name => files[name]).join('\n')),
    descriptor,
    entry: {
      id: bundle.id,
      version,
      title: bundle.title,
      tags: descriptor.tags,
      versions: [version],
      links: { self: descriptor.links.self, latest: descriptor.links.latest, call: descriptor.links.call },
    },
    files,
    representations: { elo, ...withPrelude(compiled) },
    code: compiled.js,
    shape,
  };
}

/**
 * The service program, compiled to each target that takes it.
 *
 * Which targets those are is found by compiling, never declared — SQL is
 * absent because a formula is a lambda and `Input` is a type definition, and
 * that target takes neither. A target that refuses the program is left out of
 * `targets` rather than failing the boot: a formula that runs on two of three
 * is still a formula, and the descriptor says which two.
 */
function compileRepresentations(bundle: Bundle, source: string): Partial<Record<Target, string>> {
  const file = join(bundle.dir, '_service.elo');
  const scope = loadProgram(source, { loader: nodeLoader(), file, locations: true });
  const [body] = readProgram(scope.body, false);
  const compiled: Partial<Record<Target, string>> = {};
  for (const target of TARGETS) {
    try {
      // One tree per target: the compilers are free to annotate what they walk.
      const ast = scopeProgram(scope, parse(body, { locations: true, file }));
      compiled[target] = EMIT[target](ast);
    } catch {
      // Left out of `targets`, which is what the descriptor then reports.
    }
  }
  return compiled;
}

const EMIT: Record<Target, (ast: Expr) => string> = {
  js: ast => compileToJavaScript(ast, { asFunction: true }),
  ruby: ast => compileToRuby(ast),
  python: ast => compileToPython(ast),
};

const PRELUDE_OF: Record<Target, 'javascript' | 'ruby' | 'python'> = {
  js: 'javascript',
  ruby: 'ruby',
  python: 'python',
};

/**
 * The compiled representations as a host would run them: prelude included.
 *
 * §3 is about algorithmic transparency — `Accept: text/x-ruby` answers the
 * exact program that ran, and a paraphrase of it would be worth nothing — so
 * what is served is self-contained. The copy the *sandbox* runs has no prelude:
 * the worker binds luxon itself, which the prelude's `require` could not do
 * inside an evaluated string.
 */
function withPrelude(compiled: Partial<Record<Target, string>>): Record<string, string> {
  const representations: Record<string, string> = {};
  for (const target of TARGETS) {
    const code = compiled[target];
    if (code === undefined) continue;
    representations[target] = `${getPrelude(PRELUDE_OF[target])}\n\n${code}`;
  }
  return representations;
}

export function strongETag(content: string): string {
  return `"${createHash('sha256').update(content).digest('base64url').slice(0, 27)}"`;
}
