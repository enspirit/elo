import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { DateTime, Duration, Interval } from 'luxon';
import { parse, splitTypePrelude } from '../../src/parser';
import { withTypeDefs } from '../../src/ast';
import type { TypeBinding } from '../../src/ast';
import { typecheckWithAnnotations } from '../../src/typecheck';
import { compileToJavaScript } from '../../src/compilers/javascript';
import { compileToRuby } from '../../src/compilers/ruby';
import { compileToPython } from '../../src/compilers/python';
import { compileToSQL } from '../../src/compilers/sql';

/**
 * Equivalence of the annotated and unannotated emissions.
 *
 * This is the property that makes `--optimize` safe to have at all. Until it
 * existed, a bug in the type checker produced a false diagnostic: annoying,
 * visible, harmless. With the checker's types feeding codegen, the same bug
 * produces **wrong emitted code, silently**. So the one thing worth asserting
 * is not that the annotated output is smaller — it is that it does the same
 * thing.
 *
 * Every line of every fixture is an `assert(...)`, so executing the compiled
 * JavaScript *is* the equivalence check: the two compilations must agree on
 * the value, and on the error when there is one. JavaScript is executed here
 * because it can be, in process; the same corpus is executed on all four
 * targets by `test/acceptance` with `ELO_OPTIMIZE=1`.
 *
 * The other three targets are compiled rather than run, which still catches
 * the failure mode where an annotation picks a signature a binding does not
 * implement.
 */

const FIXTURES = join(__dirname, '../../../test/fixtures');

/**
 * Fixtures that cannot be executed with a null input: they read `_`, or they
 * throw on purpose. The acceptance runners skip the same three. They are still
 * *compiled* both ways below — only the execution is skipped.
 */
const NOT_EXECUTABLE = ['member-access', 'variables', 'fail'];

function findEloFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...findEloFiles(full));
    else if (entry.endsWith('.elo')) files.push(full);
  }
  return files.sort();
}

/**
 * A fixture read the way eloc reads it: its type prelude, then its expression
 * lines with their 1-based line numbers.
 */
function programOf(path: string): {
  typeDefs: TypeBinding[];
  expressions: Array<{ line: number; source: string }>;
} {
  const { typeDefs, body } = splitTypePrelude(readFileSync(path, 'utf-8'));
  const expressions = body
    .split('\n')
    .map((source, i) => ({ line: i + 1, source }))
    .filter(({ source }) => {
      const trimmed = source.trim();
      return trimmed !== '' && !trimmed.startsWith('#');
    });
  return { typeDefs, expressions };
}

/** What the fixture runners do: run the expression with a null input. */
function runJS(code: string): { value?: unknown; error?: string } {
  try {
    const factory = new Function('DateTime', 'Duration', 'Interval', `return ${code}`);
    return { value: factory(DateTime, Duration, Interval) };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

const TARGETS = {
  js: compileToJavaScript,
  ruby: compileToRuby,
  python: compileToPython,
} as const;

describe('--optimize is equivalent, not merely smaller', () => {
  const files = findEloFiles(FIXTURES);

  for (const path of files) {
    const name = relative(FIXTURES, path);
    const executable = !NOT_EXECUTABLE.some(skip => name.split(/[/\\]/).pop()!.startsWith(skip));

    it(`${name} compiles and behaves the same with the checker's types`, () => {
      const { typeDefs, expressions } = programOf(path);
      for (const { line, source } of expressions) {
        const where = `${name}:${line}`;
        const ast = withTypeDefs(typeDefs, parse(source));
        const { types } = typecheckWithAnnotations(ast);

        for (const [target, compileTo] of Object.entries(TARGETS)) {
          // A target that refuses the program must refuse it either way: an
          // annotation that makes a program stop compiling is the bug this
          // catches.
          const plain = attempt(() => compileTo(ast));
          const annotated = attempt(() => compileTo(ast, { types }));
          assert.strictEqual(
            annotated.error,
            plain.error,
            `${where} on ${target}: annotating changed whether it compiles`
          );
        }

        // SQL has its own transform options, so it is compiled separately.
        const sqlAst = withTypeDefs(typeDefs, parse(source));
        const { types: sqlTypes } = typecheckWithAnnotations(sqlAst, {
          allowUndefinedVariables: true,
        });
        assert.strictEqual(
          attempt(() => compileToSQL(sqlAst, { types: sqlTypes })).error,
          attempt(() => compileToSQL(sqlAst)).error,
          `${where} on sql: annotating changed whether it compiles`
        );

        if (!executable) continue;

        const plain = runJS(compileToJavaScript(ast, { execute: true }));
        const annotated = runJS(compileToJavaScript(ast, { execute: true, types }));
        assert.deepStrictEqual(
          describeOutcome(annotated),
          describeOutcome(plain),
          `${where}: the annotated emission behaves differently\n\n` +
          `  plain:     ${compileToJavaScript(ast, { execute: true })}\n` +
          `  annotated: ${compileToJavaScript(ast, { execute: true, types })}`
        );
      }
    });
  }
});

function attempt(compile: () => string): { code?: string; error?: string } {
  try {
    return { code: compile() };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

/**
 * Compare outcomes by shape rather than identity: a Luxon DateTime is a fat
 * object whose fields differ harmlessly between two equal instants.
 */
function describeOutcome(outcome: { value?: unknown; error?: string }): unknown {
  if (outcome.error !== undefined) return { error: outcome.error };
  return { value: describeValue(outcome.value) };
}

function describeValue(value: unknown): unknown {
  if (DateTime.isDateTime(value)) return `datetime:${value.toMillis()}`;
  if (Duration.isDuration(value)) return `duration:${value.toMillis()}`;
  if (Interval.isInterval(value)) return `interval:${value.start?.toMillis()}-${value.end?.toMillis()}`;
  if (Array.isArray(value)) return value.map(describeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, describeValue(v)])
    );
  }
  return value;
}
