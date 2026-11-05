/**
 * The reference implementation of the formula bundle — see
 * `../formulas/BUNDLE.md` for the format it reads.
 *
 * A bundle is five files: `types.elo` (`Input` and `Output`, the data the
 * formula takes and answers), `formula.elo` (the doc comment and the exported
 * `formula`), `fields.elo` (the input form, as data), `cases.elo` (the cases,
 * as data) and `bundle.json` (the metadata). This module turns one into what a
 * catalogue needs:
 *
 *   loadBundle()         the documentation, the sources, the form, the cases
 *   runCases()           the case table with its results
 *   serviceSource()      the expression a web service compiles
 *   generateFieldsFile() `fields.elo` from `Input`, keeping what was written
 *   validateBundle()     whether the bundle keeps the format's rules
 *
 * Nothing here belongs in the compiler: a bundle is a convention over files,
 * and the only thing it asks of Elo is to read a program's type prelude, which
 * `loadProgram` already does. That is why it is a contrib rather than part of
 * `src/` — it is a host's code, and a host may copy it.
 *
 * It imports Elo over a relative path because it lives in this repository and
 * is built by its `tsconfig.json`. Copied into a project of your own, the two
 * imports below become `@enspirit/elo` and `@enspirit/elo/node`.
 *
 * Run it over a bundle:
 *
 *     npm run build && contrib/formula-service/bin/elo-formulas iban
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { DateTime, Duration, Interval } from 'luxon';
import { compile, loadProgram, toEloCode } from '../../../src';
import type { TypeExpr } from '../../../src';
import { nodeLoader } from '../../../src/node';
import type { AnswerShape } from './answer';

const RUNTIME = { DateTime, Duration, Interval };

// ---------------------------------------------------------------------------
// What a bundle is
// ---------------------------------------------------------------------------

/** `bundle.json`: the metadata, and nothing a form or a type could say. */
export interface BundleManifest {
  bundle: number;
  version: string;
  tags?: string[];
  license?: string;
  author?: string;
  homepage?: string;
}

/**
 * One field of the input form, as `fields.elo` holds it.
 *
 * Half of it is what `Input` declares — `type`, `required`, `repeated`,
 * `constraints` — and half is what only a human knows: the label, the help,
 * the widget, the options of a choice. The derived half is generated and then
 * *checked* against `Input` rather than trusted, which is what lets a form
 * builder read this file alone and never walk a type.
 */
export interface FieldDescriptor {
  /** Dotted path into the input, e.g. `customer.name`. */
  path: string;
  /** What to call it on screen. */
  label: string;
  /** The Elo type the value is read as: `Int`, `Date`, `Any`, … */
  type: string;
  /** What to render it with. */
  widget: string;
  /** False for a `:?` field, and for one whose type accepts Null. */
  required: boolean;
  /** True for a `[T]` field. */
  repeated?: boolean;
  /** The names of the constraints that may refuse a value. */
  constraints?: string[];
  /** The values of a choice field, for the widget. */
  options?: unknown[];
  help?: string;
  placeholder?: string;
}

/** One case of `cases.elo`. */
export interface FormulaCase {
  name: string;
  input: unknown;
  expect: unknown;
}

/** One case, run. */
export interface CaseResult extends FormulaCase {
  got: unknown;
  ok: boolean;
}

export interface Bundle {
  /**
   * The formula's identifier: its directory, relative to the catalogue it was
   * read from, slash-separated — `age`, or `tax/be/vat`. A bundle read on its
   * own has its directory name for an id.
   */
  id: string;
  dir: string;
  manifest: BundleManifest;
  /** The doc comment of `formula.elo`: its first line, then the rest. */
  title: string;
  doc: string;
  /** The sources, for display. */
  source: string;
  typesSource: string;
  fieldsSource: string;
  casesSource: string;
  /** The input form, as `fields.elo` holds it. */
  form: FieldDescriptor[];
  cases: FormulaCase[];
  /**
   * What `types.elo` declares, by name, `Input` and `Output` among them.
   *
   * These are AST type expressions — Elo's protected tier, so a host reading
   * them pins the minor version. A catalogue needs them for one thing only:
   * checking `fields.elo` against `Input`, and generating it.
   */
  types: Map<string, TypeExpr>;
}

// ---------------------------------------------------------------------------
// Reading one
// ---------------------------------------------------------------------------

/** The `#` lines a file opens with, as Markdown. */
export function docComment(source: string): { title: string; doc: string } {
  const lines: string[] = [];
  for (const line of source.split('\n')) {
    if (!line.startsWith('#')) break;
    lines.push(line.replace(/^#\s?/, ''));
  }
  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  const title = lines.length > 0 ? lines[0].trim() : '';
  const doc = lines.slice(1).join('\n').trim();
  return { title, doc };
}

export function loadBundle(dir: string, root?: string): Bundle {
  // Under a catalogue, a formula is identified by its path rather than by its
  // last segment: `tax/be/vat` and `tax/fr/vat` are two formulas.
  const id = root ? relative(root, dir).split(sep).join('/') : basename(dir);
  const typesFile = join(dir, 'types.elo');
  const formulaFile = join(dir, 'formula.elo');
  const fieldsFile = join(dir, 'fields.elo');
  const casesFile = join(dir, 'cases.elo');
  const manifestFile = join(dir, 'bundle.json');
  for (const file of [typesFile, formulaFile, fieldsFile, casesFile, manifestFile]) {
    if (!existsSync(file)) throw new Error(`${id}: ${basename(file)} is missing`);
  }

  const source = readFileSync(formulaFile, 'utf-8');
  const typesSource = readFileSync(typesFile, 'utf-8');
  const fieldsSource = readFileSync(fieldsFile, 'utf-8');
  const casesSource = readFileSync(casesFile, 'utf-8');
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf-8')) as BundleManifest;
  const { title, doc } = docComment(source);

  // The type prelude of `types.elo` is what the bundle declares. A catalogue
  // reads it without looking at the formula at all — which is the point of it
  // being its own file.
  const program = loadProgram(typesSource, { loader: nodeLoader(), file: typesFile });
  const types = new Map(program.typeDefs.map(t => [t.name, t.typeExpr]));
  const input = types.get('Input');
  const output = types.get('Output');
  if (!input) throw new Error(`${id}: types.elo does not declare 'Input'`);
  if (!output) throw new Error(`${id}: types.elo does not declare 'Output'`);

  const cases = (compile<(input: null) => { cases?: unknown }>(casesSource, { runtime: RUNTIME })(null)
    ?.cases ?? []) as FormulaCase[];
  const form = (compile<(input: null) => { fields?: unknown }>(fieldsSource, { runtime: RUNTIME })(null)
    ?.fields ?? []) as FieldDescriptor[];

  return {
    id,
    dir,
    manifest,
    title,
    doc,
    source,
    typesSource,
    fieldsSource,
    casesSource,
    form,
    cases,
    types,
  };
}

/** `Input`, which `loadBundle` has already made sure is there. */
function inputOf(bundle: Bundle): TypeExpr {
  const input = bundle.types.get('Input');
  if (!input) throw new Error(`${bundle.id}: types.elo does not declare 'Input'`);
  return input;
}

/** `Output`, likewise. */
function outputOf(bundle: Bundle): TypeExpr {
  const output = bundle.types.get('Output');
  if (!output) throw new Error(`${bundle.id}: types.elo does not declare 'Output'`);
  return output;
}

/**
 * This repository's own catalogue — the bundles beside this file.
 *
 * `__dirname` is the *built* module, under `dist/`, while a bundle is source
 * rather than build output: the path climbs out of `dist/` and back down the
 * tree it mirrors. A host serving its own catalogue passes its directory
 * instead, which is what the `ELO_FORMULAS` of the CLI below does.
 */
export const EXAMPLE_CATALOGUE = join(
  __dirname, '..', '..', '..', '..', 'contrib', 'formula-service', 'formulas'
);

/**
 * Every bundle under a catalogue directory, in id order.
 *
 * A directory holding a `bundle.json` is a bundle; one that does not is a
 * folder of them, however deep — so a catalogue may be organised by subject
 * (`tax/be/vat`) and a formula's id is its path.
 */
export function loadCatalogue(dir: string, root: string = dir): Bundle[] {
  return readdirSync(dir)
    .filter(entry => statSync(join(dir, entry)).isDirectory())
    .sort()
    .flatMap(entry => {
      const child = join(dir, entry);
      return existsSync(join(child, 'bundle.json'))
        ? [loadBundle(child, root)]
        : loadCatalogue(child, root);
    });
}

// ---------------------------------------------------------------------------
// The fields: derived from Input, written down in fields.elo
// ---------------------------------------------------------------------------

const WIDGETS: Record<string, string> = {
  Int: 'number',
  Float: 'number',
  Bool: 'checkbox',
  String: 'text',
  Date: 'date',
  Datetime: 'datetime',
  Duration: 'duration',
  Data: 'json',
  Any: 'json',
};

/** What a type expression resolves to, once prelude names and `T(v | …)` are followed. */
interface Resolved {
  type: string;
  constraints: string[];
  nullable: boolean;
  repeated: boolean;
  schema?: TypeExpr;
}

function resolve(expr: TypeExpr, types: Map<string, TypeExpr>, seen: Set<string> = new Set()): Resolved {
  switch (expr.kind) {
    case 'type_ref': {
      const target = types.get(expr.name);
      // A name of the prelude resolves to what it was declared as; a builtin
      // resolves to itself. The guard is for a prelude that names itself.
      if (target && !seen.has(expr.name)) {
        seen.add(expr.name);
        return resolve(target, types, seen);
      }
      return { type: expr.name, constraints: [], nullable: expr.name === 'Null', repeated: false };
    }
    case 'subtype_constraint': {
      const base = resolve(expr.baseType, types, seen);
      const named = expr.constraints.map((c, i) => c.label ?? `constraint ${i + 1}`);
      return { ...base, constraints: [...base.constraints, ...named] };
    }
    case 'array_type': {
      const element = resolve(expr.elementType, types, seen);
      return { ...element, repeated: true };
    }
    case 'union_type': {
      const members = expr.types.map(t => resolve(t, types, new Set(seen)));
      const real = members.filter(m => m.type !== 'Null');
      const nullable = members.length !== real.length;
      // A union of several real types has no one widget; the form takes it as
      // data, which is what `Any` means here.
      if (real.length === 1) return { ...real[0], nullable: nullable || real[0].nullable };
      return { type: 'Any', constraints: [], nullable, repeated: false };
    }
    case 'type_schema':
      return { type: 'Object', constraints: [], nullable: false, repeated: false, schema: expr };
  }
}

/**
 * What `Input` says about the form: one field per declared property, in
 * declaration order, carrying the type, whether a value is required, and the
 * names of the constraints that may refuse one.
 *
 * This is the derived half of `fields.elo`. It is what `generateFieldsFile`
 * writes and what the lint compares the file against — never what a form
 * builder has to run, which is the point of the file existing.
 *
 * Bounds are deliberately absent: they live in predicates, and the formula
 * enforces them — a failure names the field in `path` and the rule in `label`.
 */
export function describeFields(
  declared: TypeExpr,
  types: Map<string, TypeExpr>,
  prefix = ''
): FieldDescriptor[] {
  const schema = resolve(declared, types).schema;
  if (!schema || schema.kind !== 'type_schema') {
    // A type that is not a schema still has one field: the value itself. That
    // is a formula taking a single number rather than a record of them.
    return [field(prefix || 'value', resolve(declared, types), false)];
  }
  const fields: FieldDescriptor[] = [];
  for (const property of schema.properties) {
    const path = prefix ? `${prefix}.${property.key}` : property.key;
    const resolved = resolve(property.typeExpr, types);
    if (resolved.schema && !resolved.repeated) {
      fields.push(...describeFields(property.typeExpr, types, path));
      continue;
    }
    fields.push(field(path, resolved, property.optional === true));
  }
  return fields;
}

/**
 * One key of the answer: what a client renders a result with.
 *
 * It is not a form — `Output` has none, an answer being rendered rather than
 * filled in — so there is no label and no widget here. It is the column list,
 * and the same walk `Input` gets, which is what keeps the two readings of a
 * type the same one.
 */
export interface AnswerDescriptor {
  path: string;
  type: string;
  required: boolean;
  repeated?: boolean;
}

/** What `Output` says about the answer. */
export function describeAnswers(bundle: Bundle): AnswerDescriptor[] {
  return describeFields(outputOf(bundle), bundle.types).map(answer => ({
    path: answer.path,
    type: answer.type,
    required: answer.required,
    ...(answer.repeated ? { repeated: true } : {}),
  }));
}

/**
 * How to write the answer as JSON, from `Output` — see `./answer`, which
 * applies it where the answer is produced.
 *
 * Driven by the declared type on purpose: a `Date` and a `Datetime` are the
 * same runtime value on JavaScript, and only the type says which was meant.
 */
export function answerShape(bundle: Bundle): AnswerShape {
  return shapeOf(outputOf(bundle), bundle.types);
}

/**
 * The same walk over `Input`, which is what a *format* has to ask about.
 *
 * A tabular format encodes a table, so it only means something where the
 * formula's own type is one — and `describeFields` cannot answer that: for
 * `Input = [Line]` it reports the fields of a *row*, which is the right thing
 * for a form's column labels and the wrong thing for this question. The type
 * is where the answer is.
 */
export function inputShape(bundle: Bundle): AnswerShape {
  return shapeOf(inputOf(bundle), bundle.types);
}

/**
 * A declared type as **JSON Schema** — the third reading of the same type, and
 * the same walk `describeFields` and `answerShape` do.
 *
 * It is JSON Schema as OpenAPI 3.0 speaks it, which is why a nullable type is
 * `nullable: true` rather than a union with `"null"`: the broader half of the
 * tooling reads 3.0, and the mapping below is the one §9 of the plan wrote.
 *
 * The honest line of that table is the last one: **a predicate becomes
 * nothing**. A constraint is an Elo expression, so JSON Schema cannot carry it
 * — a generated client validates shape, and the formula validates meaning. It
 * would be easy and wrong to emit a `minimum` for the constraints that happen
 * to look like one.
 */
export function jsonSchemaOf(
  expr: TypeExpr,
  types: Map<string, TypeExpr>,
  seen: Set<string> = new Set()
): Record<string, unknown> {
  switch (expr.kind) {
    case 'type_ref': {
      const target = types.get(expr.name);
      if (target && !seen.has(expr.name)) {
        seen.add(expr.name);
        return jsonSchemaOf(target, types, seen);
      }
      return { ...(JSON_SCHEMAS[expr.name] ?? {}) };
    }
    case 'subtype_constraint':
      return jsonSchemaOf(expr.baseType, types, seen);
    case 'array_type':
      return { type: 'array', items: jsonSchemaOf(expr.elementType, types, seen) };
    case 'union_type': {
      const real = expr.types.filter(member => !(member.kind === 'type_ref' && member.name === 'Null'));
      const nullable = real.length !== expr.types.length;
      // A union of several real types has no one JSON Schema worth writing —
      // `oneOf` over coerced types would promise more than Elo does — so it
      // is left open, which is what `Any` means here too.
      const schema = real.length === 1 ? jsonSchemaOf(real[0], types, new Set(seen)) : {};
      return nullable ? { ...schema, nullable: true } : schema;
    }
    case 'type_schema': {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const property of expr.properties) {
        properties[property.key] = jsonSchemaOf(property.typeExpr, types, new Set(seen));
        if (property.optional !== true) required.push(property.key);
      }
      return {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
        // Elo's schemas are closed: an attribute the type does not declare is
        // a refusal rather than an extra, and a generated client should know
        // that before it sends one.
        additionalProperties: false,
      };
    }
  }
}

const JSON_SCHEMAS: Record<string, Record<string, unknown>> = {
  Int: { type: 'integer' },
  Float: { type: 'number' },
  String: { type: 'string' },
  Bool: { type: 'boolean' },
  Date: { type: 'string', format: 'date' },
  Datetime: { type: 'string', format: 'date-time' },
  Duration: { type: 'string', format: 'duration' },
  // `Any` and `Data` carry whatever the caller sends, and so does their schema.
  Any: {},
  Data: {},
};

const TEMPORAL_SHAPES: Record<string, AnswerShape> = {
  Date: { kind: 'date' },
  Datetime: { kind: 'datetime' },
  Duration: { kind: 'duration' },
};

function shapeOf(expr: TypeExpr, types: Map<string, TypeExpr>, seen: Set<string> = new Set()): AnswerShape {
  switch (expr.kind) {
    case 'type_ref': {
      const target = types.get(expr.name);
      if (target && !seen.has(expr.name)) {
        seen.add(expr.name);
        return shapeOf(target, types, seen);
      }
      return TEMPORAL_SHAPES[expr.name] ?? { kind: 'value' };
    }
    case 'subtype_constraint':
      return shapeOf(expr.baseType, types, seen);
    case 'array_type':
      return { kind: 'list', of: shapeOf(expr.elementType, types, seen) };
    case 'union_type': {
      // `T|Null` is a `T` that may be absent, and absent needs no writing. A
      // union of several real types has no one writing, so it gets none.
      const real = expr.types.filter(t => !(t.kind === 'type_ref' && t.name === 'Null'));
      return real.length === 1 ? shapeOf(real[0], types, new Set(seen)) : { kind: 'value' };
    }
    case 'type_schema': {
      const properties: Record<string, AnswerShape> = {};
      for (const property of expr.properties) {
        properties[property.key] = shapeOf(property.typeExpr, types, new Set(seen));
      }
      return { kind: 'object', properties };
    }
  }
}

function field(path: string, resolved: Resolved, optional: boolean): FieldDescriptor {
  return {
    path,
    label: path,
    type: resolved.type,
    widget: WIDGETS[resolved.type] ?? 'text',
    required: !optional && !resolved.nullable,
    ...(resolved.repeated ? { repeated: true } : {}),
    ...(resolved.constraints.length > 0 ? { constraints: resolved.constraints } : {}),
  };
}

/** The keys of a field a human writes, and the lint does not check. */
const WRITTEN_BY_HAND = ['label', 'widget', 'options', 'help', 'placeholder'] as const;

/**
 * `fields.elo`, generated from `Input` — keeping every label, widget, option,
 * help and placeholder the bundle already had, since those are the half no
 * static analysis can produce.
 *
 * So this is a *refresh*: run it after changing `Input` and the derived keys
 * catch up without touching what was written by hand. The order is the file's
 * own, not the type's: a form may put its fields in any order, and a field the
 * type no longer declares drops out.
 */
export function generateFieldsFile(bundle: Bundle): string {
  const derived = describeFields(inputOf(bundle), bundle.types);
  const written = new Map(bundle.form.map(f => [f.path, f]));
  const ordered = [
    ...bundle.form.map(f => derived.find(d => d.path === f.path)).filter((d): d is FieldDescriptor => !!d),
    ...derived.filter(d => !written.has(d.path)),
  ];
  const fields = ordered.map(field => {
    const previous = written.get(field.path);
    const merged: Record<string, unknown> = { ...field };
    for (const key of WRITTEN_BY_HAND) {
      const value = previous?.[key];
      if (value !== undefined) merged[key] = value;
    }
    return merged;
  });
  const entries = fields.map(eloObject).join(',\n');
  return `{\n  fields: [\n${entries}\n  ]\n}\n`;
}

/**
 * Generate a bundle's `fields.elo` and write it back, which is the whole
 * workflow: change `Input`, refresh, fill in the labels.
 *
 * It writes rather than printing on purpose. `--fields x > x/fields.elo` would
 * truncate the file before the generator could read the labels out of it — the
 * shell opens the redirect first — so the one command that must not lose them
 * does not go through a redirect at all. A bundle that has no `fields.elo` yet
 * starts from an empty one, which is how a new formula gets its form.
 */
export function refreshFieldsFile(dir: string): { file: string; changed: boolean } {
  const file = join(dir, 'fields.elo');
  if (!existsSync(file)) writeFileSync(file, '{\n  fields: []\n}\n');
  const before = readFileSync(file, 'utf-8');
  const after = generateFieldsFile(loadBundle(dir));
  if (after !== before) writeFileSync(file, after);
  return { file, changed: after !== before };
}

/** One field as Elo source, a key per line, because a human edits this file. */
function eloObject(field: Record<string, unknown>): string {
  const keys = Object.entries(field).map(([key, value]) => `      ${key}: ${toEloCode(value)}`);
  return `    {\n${keys.join(',\n')}\n    }`;
}

// ---------------------------------------------------------------------------
// Running it
// ---------------------------------------------------------------------------

/**
 * The case runner, generated rather than stored: it is the same program for
 * every bundle, and a copy of it in each would be the duplication the format
 * exists to remove.
 *
 * With `assert`, a wrong row raises instead of being reported — which is what
 * a test run wants, and what a catalogue showing the table does not.
 */
export function caseRunnerSource(options: { assert?: boolean } = {}): string {
  const check = options.assert
    ? "  check 'every case passes': all(rows, fn( r ~> r.ok ))\n"
    : '';
  return `import { Input, Output } from './types'
import { formula } from './formula'
import { cases } from './cases'

let
  rows = map(cases, fn( c ~>
    let got = formula(c.input |> Input) |> Output
    in { name: c.name, input: c.input, got: got, expect: c.expect, ok: got == c.expect }
  ))
${check}in
  rows
`;
}

/**
 * The expression a web service compiles: JSON in, the answer out, both of them
 * through the declared type — so a wrong answer is refused where it is
 * produced rather than reported where it is read.
 */
export function serviceSource(): string {
  return `import { Input, Output } from './types'
import { formula } from './formula'

formula(_ |> Input) |> Output
`;
}

/** Compile a source against a bundle's directory, so `./formula` resolves. */
export function compileInBundle<T>(bundle: Bundle, source: string): (input: unknown) => T {
  return compile<(input: unknown) => T>(source, {
    runtime: RUNTIME,
    loader: nodeLoader(),
    file: join(bundle.dir, '_generated.elo'),
  });
}

export function runCases(bundle: Bundle): CaseResult[] {
  return compileInBundle<CaseResult[]>(bundle, caseRunnerSource())(null);
}

/** Apply the formula to one input, as the web service would. */
export function apply(bundle: Bundle, input: unknown): unknown {
  return compileInBundle<unknown>(bundle, serviceSource())(input);
}

// ---------------------------------------------------------------------------
// Validity
// ---------------------------------------------------------------------------

function isJsonShaped(value: unknown): boolean {
  if (value === null) return true;
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return true;
    case 'object':
      return Array.isArray(value)
        ? value.every(isJsonShaped)
        : Object.getPrototypeOf(value) === Object.prototype
          && Object.values(value as Record<string, unknown>).every(isJsonShaped);
    default:
      return false;
  }
}

/** The derived keys of a field: what `Input` says, and the lint re-derives. */
const DERIVED = ['type', 'required', 'repeated', 'constraints'] as const;

/**
 * `fields.elo` against `Input`.
 *
 * The file restates the type's half on purpose — so that a form builder reads
 * one data file and never walks an AST — which is only safe because this
 * compares the two. Generated, then checked: the rule is not "never state
 * twice" but "never state twice unchecked".
 */
export function checkFieldsAgainstInput(bundle: Bundle): string[] {
  const problems: string[] = [];
  const say = (problem: string) => problems.push(`${bundle.id}: ${problem}`);

  const derived = new Map(describeFields(inputOf(bundle), bundle.types).map(f => [f.path, f]));
  const declared = declaredTypes(bundle);
  const seen = new Set<string>();

  for (const field of bundle.form) {
    const expected = derived.get(field.path);
    if (!expected) {
      say(`fields.elo has a field '${field.path}' that Input does not declare`);
      continue;
    }
    if (seen.has(field.path)) say(`fields.elo has '${field.path}' twice`);
    seen.add(field.path);
    if (!field.label) say(`fields.elo gives '${field.path}' no label`);
    if (!field.widget) say(`fields.elo gives '${field.path}' no widget`);
    for (const key of DERIVED) {
      const mine = JSON.stringify(field[key] ?? null);
      const theirs = JSON.stringify(expected[key] ?? null);
      if (mine !== theirs) {
        say(`fields.elo says ${key} ${mine} for '${field.path}', Input says ${theirs}`);
      }
    }
    problems.push(...checkOptions(bundle, field, declared.get(field.path)));
  }

  for (const path of derived.keys()) {
    if (!seen.has(path)) say(`fields.elo has no field for '${path}', which Input declares`);
  }

  return problems;
}

/**
 * The type expression each field path was declared as, however deep it is —
 * the same walk `describeFields` does, keeping the type rather than describing
 * it. What it is for: knowing whether a field's type has a *name*, which is
 * what makes its options checkable.
 */
export function declaredTypes(bundle: Bundle, declared = inputOf(bundle), prefix = ''): Map<string, TypeExpr> {
  const paths = new Map<string, TypeExpr>();
  const schema = resolve(declared, bundle.types).schema;
  if (!schema || schema.kind !== 'type_schema') {
    paths.set(prefix || 'value', declared);
    return paths;
  }
  for (const property of schema.properties) {
    const path = prefix ? `${prefix}.${property.key}` : property.key;
    const resolved = resolve(property.typeExpr, bundle.types);
    if (resolved.schema && !resolved.repeated) {
      for (const [key, type] of declaredTypes(bundle, property.typeExpr, path)) paths.set(key, type);
      continue;
    }
    paths.set(path, property.typeExpr);
  }
  return paths;
}

/**
 * Every option of a choice field, against the type that accepts it.
 *
 * This only works where the field's type has a *name* — `tier: Tier` — because
 * a name is what can be imported and applied on its own. A field typed inline
 * is unchecked, which is the argument for declaring a choice as a named type.
 */
function checkOptions(bundle: Bundle, field: FieldDescriptor, declared?: TypeExpr): string[] {
  if (!field.options) return [];
  const named = declared?.kind === 'type_ref' && bundle.types.has(declared.name)
    ? declared.name
    : undefined;
  if (!named) return [];

  const accepts = compileInBundle<unknown>(
    bundle,
    `import { ${named} } from './types'\n\n_ |> ${named}\n`
  );
  return field.options.flatMap(option => {
    try {
      accepts(option);
      return [];
    } catch {
      return [`${bundle.id}: fields.elo offers '${String(option)}' for '${field.path}', which ${named} refuses`];
    }
  });
}

/**
 * The rules of BUNDLE.md, as a list of what this bundle breaks. Empty is
 * valid. Running the cases is not in here: that is `runCases`, and a test
 * does it on every target.
 */
export function validateBundle(bundle: Bundle): string[] {
  const problems: string[] = [];
  const say = (problem: string) => problems.push(`${bundle.id}: ${problem}`);

  if (bundle.title === '') say('formula.elo does not open with a doc comment');
  if (bundle.manifest.bundle !== 1) say(`bundle.json declares format ${bundle.manifest.bundle}, not 1`);
  if (!/^\d+\.\d+\.\d+/.test(bundle.manifest.version ?? '')) say('bundle.json has no semver version');

  try {
    compileInBundle<boolean>(bundle, "import { formula } from './formula'\n\ntrue\n")(null);
  } catch (error) {
    say(`formula.elo does not export what a bundle must (${(error as Error).message})`);
  }

  problems.push(...checkFieldsAgainstInput(bundle));

  if (bundle.cases.length === 0) say('cases.elo has no cases');
  bundle.cases.forEach((testCase, index) => {
    const where = testCase.name ? `case '${testCase.name}'` : `case ${index + 1}`;
    if (typeof testCase.name !== 'string' || testCase.name === '') say(`case ${index + 1} has no name`);
    if (!('expect' in testCase)) say(`${where} has no expect`);
    if (!isJsonShaped(testCase.input)) say(`${where} has an input that is not JSON-shaped`);
  });

  return problems;
}

// ---------------------------------------------------------------------------
// Showing one, which is what a catalogue page does
// ---------------------------------------------------------------------------

function show(bundle: Bundle): void {
  console.log(`# ${bundle.title}   (${bundle.id} ${bundle.manifest.version})`);
  if (bundle.manifest.tags) console.log(`tags: ${bundle.manifest.tags.join(', ')}`);
  console.log(`\n${bundle.doc}\n`);

  const line = (f: FieldDescriptor, bits: string[]) =>
    console.log(`  ${f.label.padEnd(24)} ${f.path.padEnd(20)} ${f.type.padEnd(9)} ${bits.join('; ')}`);

  console.log('## The form');
  for (const f of bundle.form) {
    const bits = [f.widget, f.required ? 'required' : 'optional'];
    if (f.repeated) bits.push('repeated');
    if (f.options) bits.push(`options: ${f.options.join(' | ')}`);
    if (f.constraints && f.constraints.length > 0) bits.push(`refused by: ${f.constraints.join(', ')}`);
    line(f, bits);
  }

  console.log('\n## The cases');
  for (const row of runCases(bundle)) {
    console.log(`  ${row.ok ? '✓' : '✗'} ${row.name}`);
    console.log(`      in   ${JSON.stringify(row.input)}`);
    console.log(`      out  ${toEloCode(row.got)}`);
    if (!row.ok) console.log(`      want ${toEloCode(row.expect)}`);
  }

  const problems = validateBundle(bundle);
  console.log(`\n## Validity\n  ${problems.length === 0 ? 'valid' : problems.join('\n  ')}`);
}

/**
 * The command line over a catalogue: `bin/elo-formulas`. It is exported rather
 * than run on load because this module is a library first — the service of
 * `./service.ts` imports it — and a `require.main` check would not see the two
 * lines of `bin/` that call it.
 */
export function main(args: string[]): void {
  const root = process.env.ELO_FORMULAS ?? EXAMPLE_CATALOGUE;
  const id = args[0];
  if (id === '--runner') {
    // For a runner that is not a TypeScript host: the acceptance script writes
    // this into a bundle and compiles it, rather than keeping a second copy.
    process.stdout.write(caseRunnerSource({ assert: true }));
  } else if (id === '--service') {
    process.stdout.write(serviceSource());
  } else if (id === '--fields') {
    // Refresh a bundle's fields.elo from its Input, keeping what was written by
    // hand. Writes the file:  elo-formulas --fields iban
    const { file, changed } = refreshFieldsFile(join(root, args[1]));
    console.log(changed ? `${file} refreshed` : `${file} was already up to date`);
  } else if (id?.startsWith('--')) {
    console.error('usage: elo-formulas [<bundle-id> | --fields <bundle-id> | --runner | --service]');
    process.exitCode = 1;
  } else if (!id) {
    for (const bundle of loadCatalogue(root)) {
      const failures = runCases(bundle).filter(row => !row.ok).length;
      const problems = validateBundle(bundle);
      console.log(
        `${bundle.id.padEnd(24)} ${String(bundle.cases.length).padStart(2)} cases` +
        `${failures === 0 ? '' : `, ${failures} wrong`}` +
        `${problems.length === 0 ? '' : `, ${problems.length} problems`}  ${bundle.title}`
      );
    }
  } else {
    show(loadBundle(join(root, id), root));
  }
}

if (require.main === module) main(process.argv.slice(2));
