/**
 * OpenAPI — §9.
 *
 * Two documents, because two audiences:
 *
 * - **one formula**, for a client generating a typed call to it: the request
 *   body from `Input`, the response from `Output`, the errors from §5, and the
 *   examples from `cases.elo`;
 * - **the whole catalogue**, for a gateway, a Postman collection or an SDK
 *   over everything: one path per formula, scoped by `?prefix` and `?tag`
 *   because a thousand formulas is a document no tool enjoys.
 *
 * Both are derived, never written: the schemas are `jsonSchemaOf` over the
 * same type AST the form and the answer writer walk, so there is no third copy
 * of what a formula takes to fall out of step. And the examples are the cases,
 * which were already a request body and a response body by construction.
 *
 * It is **3.0.3**, with `nullable: true` for a `T|Null`. 3.1 would let a
 * nullable type be a union with `"null"`, which is cleaner JSON Schema and
 * read by less of the tooling this document exists for.
 */

import { jsonSchemaOf, type FieldDescriptor, type FormulaCase } from './bundle';
import type { ServedFormula } from './catalogue';

/** What §5 answers with, as a schema — one for the whole document. */
const ERROR_SCHEMA: Record<string, unknown> = {
  type: 'object',
  description: 'What a refusal carries. `kind`, `path` and `label` are what Elo promises; '
    + 'the wording of `message` is not part of the contract.',
  properties: {
    message: { type: 'string', description: 'For a human.' },
    kind: {
      type: 'string',
      enum: ['schema', 'missing', 'constraint', 'guard', 'check'],
      description: 'Which construct refused the value.',
    },
    path: { type: 'string', description: 'Where in the input, as a dotted path.' },
    field: { type: 'string', description: 'The key of `fields.elo` that `path` names.' },
    label: { type: 'string', description: 'The name the constraint, guard or check was written under.' },
    cap: { type: 'string', enum: ['time', 'memory'], description: 'Which cap a 503 hit.' },
  },
  required: ['message'],
};

/** Every failure a call can answer, and the one body each answers with. */
const FAILURES: [string, string][] = [
  ['400', 'The body is not readable in the content type it was sent as.'],
  ['404', 'No such formula, or no such version.'],
  ['406', 'Nothing to serve for that `Accept`.'],
  ['413', 'The body is past the cap.'],
  ['415', 'A content type this call does not read — a tabular body for a record input, say.'],
  ['422', 'The formula refused the input, or refused to answer. `kind` says which.'],
  ['503', 'The call hit its time or memory cap and was stopped.'],
];

/**
 * A component key: `iban@1.0.0` is not one.
 *
 * OpenAPI restricts a key under `components` to `[a-zA-Z0-9._-]`, and both the
 * `@` of a version and the `/` of a nested id are outside it.
 */
export function componentKey(formula: ServedFormula): string {
  return `${formula.id}_${formula.version}`.replace(/[^a-zA-Z0-9]/g, '_');
}

/** The document for one formula. */
export function formulaOpenapi(formula: ServedFormula): Record<string, unknown> {
  const key = componentKey(formula);
  return {
    openapi: '3.0.3',
    info: {
      title: formula.descriptor.title,
      version: formula.version,
      description: formula.descriptor.doc,
      ...(formula.descriptor.license ? { license: { name: formula.descriptor.license } } : {}),
    },
    paths: { [formula.descriptor.links.call]: callPath(formula, key) },
    components: { schemas: { ...schemasOf(formula, key), Error: ERROR_SCHEMA } },
  };
}

/** The document for a catalogue, or for the part of one a client asked about. */
export function catalogueOpenapi(formulas: ServedFormula[]): Record<string, unknown> {
  const paths: Record<string, unknown> = {};
  const schemas: Record<string, unknown> = {};
  for (const formula of formulas) {
    const key = componentKey(formula);
    paths[formula.descriptor.links.call] = callPath(formula, key);
    Object.assign(schemas, schemasOf(formula, key));
  }
  return {
    openapi: '3.0.3',
    info: {
      title: 'Formulas',
      version: '1.0.0',
      description: 'A catalogue of Elo formulas, each one a question with an answer. '
        + 'Every path here applies one formula to one input.',
    },
    paths,
    components: { schemas: { ...schemas, Error: ERROR_SCHEMA } },
  };
}

function schemasOf(formula: ServedFormula, key: string): Record<string, unknown> {
  const types = formula.bundle.types;
  const input = types.get('Input');
  const output = types.get('Output');
  return {
    [`${key}_Input`]: jsonSchemaOf(input as NonNullable<typeof input>, types),
    [`${key}_Output`]: jsonSchemaOf(output as NonNullable<typeof output>, types),
  };
}

function callPath(formula: ServedFormula, key: string): Record<string, unknown> {
  return {
    post: postOperation(formula, key),
    // A query string cannot carry a table, so a formula that takes one has no
    // GET call to document. Saying nothing is better than documenting a call
    // that answers 422 to everything.
    ...(formula.tabular.input ? {} : { get: getOperation(formula, key) }),
  };
}

function postOperation(formula: ServedFormula, key: string): Record<string, unknown> {
  const { descriptor } = formula;
  return {
    operationId: `call_${key}`,
    summary: descriptor.title,
    description: descriptor.doc,
    tags: descriptor.tags.length > 0 ? descriptor.tags : ['formulas'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: `#/components/schemas/${key}_Input` },
          ...examplesOf(descriptor.cases, testCase => testCase.input),
        },
        // The prose goes on the *schema*: a Media Type Object has no
        // `description` of its own, which the suite's OpenAPI parser says so
        // loudly that it is worth not learning twice.
        ...(formula.tabular.input
          ? {
            'text/csv': {
              schema: {
                type: 'string',
                description: 'The same input as a table: one row per element, '
                  + 'every cell a string that `Input` coerces.',
              },
            },
          }
          : {}),
      },
    },
    responses: responses(formula, key),
  };
}

function getOperation(formula: ServedFormula, key: string): Record<string, unknown> {
  const { descriptor } = formula;
  return {
    operationId: `get_${key}`,
    summary: `${descriptor.title} — as a URL`,
    description: 'The same call, with the input in the query string, so that the answer is '
      + 'linkable. Every parameter is read as a string and coerced by the formula\'s own '
      + '`Input`; a nested field uses its dotted path, and a repeated field repeats.',
    tags: descriptor.tags.length > 0 ? descriptor.tags : ['formulas'],
    parameters: descriptor.fields.map(parameterOf),
    responses: responses(formula, key),
  };
}

/**
 * One query parameter per field of the form.
 *
 * Its schema is `string` whatever the field's type is, and that is not
 * laziness: a query string carries strings, and the coercion into a `Date` or
 * an `Int` is the formula's own — `_ |> Input` is where it happens. Declaring
 * `integer` here would describe a validation this endpoint does not do.
 */
function parameterOf(field: FieldDescriptor): Record<string, unknown> {
  const description = [field.label, field.help].filter(part => part !== undefined).join(' — ');
  return {
    name: field.path,
    in: 'query',
    required: field.required,
    description,
    schema: {
      type: 'string',
      ...(field.options ? { enum: field.options } : {}),
      ...(field.repeated ? {} : {}),
    },
    ...(field.repeated ? { explode: true, style: 'form' } : {}),
  };
}

function responses(formula: ServedFormula, key: string): Record<string, unknown> {
  const answered: Record<string, unknown> = {
    '200': {
      description: 'The answer, and nothing around it.',
      content: {
        'application/json': {
          schema: { $ref: `#/components/schemas/${key}_Output` },
          ...examplesOf(formula.descriptor.cases, testCase => testCase.expect),
        },
        ...(formula.tabular.output
          ? {
            'text/csv': {
              schema: {
                type: 'string',
                description: 'The same answer as a table, its header the keys of `Output`.',
              },
            },
          }
          : {}),
      },
    },
  };
  for (const [status, description] of FAILURES) {
    answered[status] = {
      description,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
    };
  }
  return answered;
}

/**
 * The cases, as examples.
 *
 * Nothing is invented here: a case's input *is* a request body and its expect
 * *is* a response body, which is what makes the documentation of a formula its
 * test suite. A generated client's "try it" button is a case.
 */
function examplesOf(
  cases: FormulaCase[],
  pick: (testCase: FormulaCase) => unknown
): Record<string, unknown> {
  if (cases.length === 0) return {};
  const examples: Record<string, unknown> = {};
  for (const testCase of cases) {
    examples[testCase.name] = { value: pick(testCase) };
  }
  return { examples };
}
