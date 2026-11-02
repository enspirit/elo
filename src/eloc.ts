#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { parse, parseTypeExpr, splitTypePrelude, TRAILING_INPUT } from './parser';
import { withTypeDefs } from './ast';
import type { TypeBinding, TypeExpr } from './ast';
import { compileToRubyWithMeta } from './compilers/ruby';
import { compileToJavaScriptWithMeta } from './compilers/javascript';
import { compileToSQLWithMeta } from './compilers/sql';
import { compileToPythonWithMeta } from './compilers/python';
import { getPrelude, isPreludePrependable, Target as PreludeTarget } from './preludes';
import { typecheckWithAnnotations, formatDiagnostic, TypeAnnotations } from './typecheck';
import type { Expr } from './ast';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json');

type Target = 'ruby' | 'js' | 'sql' | 'python';

// Map CLI target names to prelude target names
function toPreludeTarget(target: Target): PreludeTarget {
  if (target === 'js') return 'javascript';
  return target;
}

interface Options {
  expression?: string;
  inputFile?: string;
  outputFile?: string;
  target: Target;
  prelude?: boolean;
  preludeOnly?: boolean;
  /** If true, output self-executing code (calls function with null/nil) */
  execute?: boolean;
  /** If true, strip guard/check assertions from output */
  stripGuards?: boolean;
  /**
   * If true, read the source as one expression per line rather than as one
   * program. The fixture corpus is written that way: one line of source, one
   * line of emitted code, so the two can be compared and executed line-wise.
   */
  lines?: boolean;
  /** If true, report static type diagnostics to stderr */
  typecheck?: boolean;
  /** If true, also require every call to be fully typed (implies typecheck) */
  strict?: boolean;
  /** Elo type expression declaring the shape of the input `_` */
  inputType?: string;
  /**
   * If true, compile with the checker's types (implies typecheck).
   *
   * What the author declared, the emitter gets to use: a field of a declared
   * schema becomes a typed operation instead of a runtime dispatcher.
   */
  optimize?: boolean;
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    target: 'js'        // default target
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-e':
      case '--expression':
        options.expression = args[++i];
        break;

      case '-f':
      case '--file':
        options.outputFile = args[++i];
        break;

      case '-t':
      case '--target':
        const target = args[++i];
        if (target !== 'ruby' && target !== 'js' && target !== 'sql' && target !== 'python') {
          console.error(`Invalid target: ${target}. Must be one of: ruby, js, sql, python`);
          process.exit(1);
        }
        options.target = target;
        break;

      case '-p':
      case '--prelude':
        options.prelude = true;
        break;

      case '--prelude-only':
        options.preludeOnly = true;
        break;

      case '-x':
      case '--execute':
        options.execute = true;
        break;

      case '--strip-guards':
        options.stripGuards = true;
        break;

      case '--lines':
        options.lines = true;
        break;

      case '--typecheck':
        options.typecheck = true;
        break;

      case '--strict':
        // Strict without checking would have nothing to be strict about.
        options.strict = true;
        options.typecheck = true;
        break;

      case '--optimize':
        // One pass over the AST serves both: there is no point annotating from
        // a checker run whose diagnostics nobody looked at.
        options.optimize = true;
        options.typecheck = true;
        break;

      case '--input-type':
        options.inputType = args[++i];
        options.typecheck = true;
        break;

      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
        break;

      case '-v':
      case '--version':
        console.log(`Elo ${pkg.version}`);
        process.exit(0);
        break;

      case '-':
        // Read from stdin
        options.inputFile = '-';
        break;

      default:
        // If it doesn't start with -, treat it as input file
        if (!arg.startsWith('-') && !options.inputFile && !options.expression) {
          options.inputFile = arg;
        } else if (!arg.startsWith('-')) {
          console.error(`Unknown argument: ${arg}`);
          printHelp();
          process.exit(1);
        }
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Elo Compiler (eloc) v${pkg.version} - Compile Elo expressions to Ruby, JavaScript, or SQL

Usage:
  eloc [options] [input-file]

Options:
  -e, --expression <expr>   Expression to compile (like ruby -e)
  -t, --target <lang>       Target language: ruby, js (default), sql, python
  -x, --execute             Output self-executing code (calls function with null/nil)
  -p, --prelude             Include necessary library imports/requires
                            (not for sql: install its prelude in the database)
  --prelude-only            Output only the prelude (no expression needed).
                            For sql, the runtime helpers to install once:
                            eloc --prelude-only -t sql | psql "$DATABASE_URL"
  --strip-guards            Strip guard/check assertions from output
  --lines                   Compile each line as its own expression, instead
                            of the whole source as one program
  --typecheck               Report static type errors to stderr, and exit
                            non-zero if any were found
  --strict                  With --typecheck, also report anything the checker
                            cannot type (implies --typecheck)
  --input-type <type>       Declare the type of the input _, as an Elo type
                            expression (implies --typecheck)
  --optimize                Compile with the checker's types, so a declared
                            field or coerced value gets a typed operation
                            instead of a runtime dispatcher. Refuses to
                            annotate a program the checker reported on
                            (implies --typecheck)
  -f, --file <path>         Output to file instead of stdout
  -v, --version             Show version number
  -h, --help                Show this help message

Examples:
  # Compile expression to JavaScript (default)
  eloc -e "2 + 3 * 4"

  # Compile expression to Ruby
  eloc -e "2 + 3 * 4" -t ruby

  # Compile expression to SQL
  eloc -e "2 + 3 * 4" -t sql

  # Compile with prelude (includes required libraries)
  eloc -e "NOW + PT2H" -t ruby -p

  # Compile from file
  eloc input.elo -t ruby

  # Compile to file
  eloc -e "2 + 3" -t ruby -f output.rb

  # Compile file to file
  eloc input.elo -t js -f output.js

  # Compile from stdin
  echo "2 + 3 * 4" | eloc -
  cat input.elo | eloc - -t ruby

  # Report type errors (compiles anyway, exits non-zero)
  eloc --typecheck -e "'hello' - 5"

  # Check against a declared input shape
  eloc --input-type '{ total: Int }' -e "upper(_.total)"

For evaluating expressions, use the 'elo' command instead.
`);
}

interface CompileOptions {
  includePrelude?: boolean;
  execute?: boolean;
  stripGuards?: boolean;
  /** The AST the checker walked, when its annotations are being reused. */
  ast?: Expr;
  /** The checker's types, keyed on the nodes of `ast`. */
  types?: TypeAnnotations;
  /** The type definitions of the file's type prelude, which scope every line. */
  typeDefs?: TypeBinding[];
}

function compile(source: string, target: Target, options: CompileOptions = {}): string {
  const { includePrelude = false, execute = false, stripGuards = false, types } = options;
  // Reuse the checker's tree when there is one: the annotations are keyed on
  // node identity, so a second parse would produce a map that matches nothing.
  const ast = options.ast ?? withTypeDefs(options.typeDefs ?? [], parse(source));

  let code: string;
  switch (target) {
    case 'ruby': {
      const result = compileToRubyWithMeta(ast, { execute, stripGuards, types });
      code = result.code;
      break;
    }
    case 'js': {
      const result = compileToJavaScriptWithMeta(ast, { execute, stripGuards, types });
      code = result.code;
      break;
    }
    case 'sql': {
      // SQL doesn't support execute option (no function wrapping)
      // and guards already throw an error, so stripGuards is not needed
      const result = compileToSQLWithMeta(ast, { types });
      code = result.code;
      break;
    }
    case 'python': {
      const result = compileToPythonWithMeta(ast, { execute, stripGuards, types });
      code = result.code;
      break;
    }
  }

  // SQL's prelude is installed in the database, never prepended; `main`
  // refuses `-p` for it, so this stays a prepend-only path.
  if (includePrelude && isPreludePrependable(toPreludeTarget(target))) {
    const preludeContent = getPrelude(toPreludeTarget(target));
    if (preludeContent) {
      code = `${preludeContent}\n\n${code}`;
    }
  }

  return code;
}

/**
 * True when a source carries no expression at all: every line is blank or a
 * comment. Applied to the whole source, not to its first line — a multi-line
 * expression passed with -e may perfectly well open with a comment.
 */
function isBlankSource(source: string): boolean {
  return source.split('\n').every(line => {
    const trimmed = line.trim();
    return trimmed === '' || trimmed.startsWith('#');
  });
}

/**
 * The expressions to compile, out of what follows a source's type prelude.
 *
 * One program by default: the source is a single expression whose newlines
 * mean nothing, and a source with nothing under its prelude holds none. With
 * `lines`, every line is its own expression — the convention the fixture
 * corpus is written in, where one line of source must give one line of
 * emitted code.
 */
function readProgram(body: string, lines?: boolean): string[] {
  if (!lines) {
    return isBlankSource(body) ? [] : [body];
  }
  // Keep every line, blanking the ones that carry no expression, so that the
  // emitted code keeps the line numbering of the source.
  return body.split('\n').map(line => {
    const trimmed = line.trim();
    return (trimmed === '' || trimmed.startsWith('#')) ? '' : line;
  });
}

/**
 * Point at `--lines` when a source turns out to hold more than one
 * expression, which is what a file written in the fixture convention looks
 * like to a compiler expecting one program.
 */
function hintAboutLines(error: unknown, options: Options): void {
  if (options.lines || !String(error).includes(TRAILING_INPUT)) return;
  console.error(
    'hint: a source is one expression, newlines included. Pass --lines to ' +
    'read it as one expression per line instead.'
  );
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const options = parseArgs(args);

  // Handle --prelude-only: just output the prelude and exit
  if (options.preludeOnly) {
    const prelude = getPrelude(toPreludeTarget(options.target));
    console.log(prelude);
    return;
  }

  // `-p` means "prepend the prelude", which SQL cannot do: its prelude is a
  // set of CREATE OR REPLACE FUNCTION statements, and a pure SQL expression
  // has nowhere to define a function. Prepending them would emit something no
  // host can run, so say what to do instead rather than emit it.
  if (options.prelude && !isPreludePrependable(toPreludeTarget(options.target))) {
    console.error(
      "eloc: -t sql has no prependable prelude: its runtime helpers are " +
      "CREATE OR REPLACE FUNCTION statements that a SQL expression cannot " +
      "define.\n" +
      "Install them in the database once, then compile without -p:\n" +
      "  eloc --prelude-only -t sql | psql \"$DATABASE_URL\""
    );
    process.exit(1);
  }

  // Get the source
  let source: string;
  if (options.expression) {
    source = options.expression;
  } else if (options.inputFile) {
    try {
      // Use file descriptor 0 for stdin when input is '-'
      source = options.inputFile === '-'
        ? readFileSync(0, 'utf-8')
        : readFileSync(options.inputFile, 'utf-8');
    } catch (error) {
      console.error(`Error reading ${options.inputFile === '-' ? 'stdin' : `file ${options.inputFile}`}: ${error}`);
      process.exit(1);
    }
  } else {
    console.error('Error: Must provide either -e <expression>, an input file, or - for stdin');
    printHelp();
    process.exit(1);
  }

  // The source is one program: a type prelude, then one expression whose
  // newlines mean nothing. The definitions are lifted off the top so that the
  // expression can be read on its own, and so that a program which declares
  // types and nothing else is accepted and compiles to nothing.
  let typeDefs: TypeBinding[] = [];
  let sources: string[];
  try {
    const program = splitTypePrelude(source);
    typeDefs = program.typeDefs;
    sources = readProgram(program.body, options.lines);
  } catch (error) {
    console.error(`Compilation error: ${error}`);
    process.exit(1);
  }

  // Type-check before compiling, so a type error is reported even when
  // compilation then fails for the same reason on some targets.
  let typeErrorsFound = false;
  let checked: CheckedSource[] = [];
  if (options.typecheck) {
    const result = reportTypeDiagnostics(sources, options, typeDefs);
    typeErrorsFound = result.found;
    checked = result.checked;
  }

  // Compile each expression
  let results: string[];
  try {
    results = sources.map((source, index) => {
      try {
        const trimmed = source.trim();
        // Skip blank lines and comment-only sources
        if (isBlankSource(source)) {
          return '';
        }
        return compile(trimmed, options.target, {
          includePrelude: index === 0 && options.prelude,
          execute: options.execute,
          stripGuards: options.stripGuards,
          typeDefs,
          // The annotations are keyed on AST node identity, so they only mean
          // anything against the tree the checker walked.
          ...(options.optimize ? checked[index] : {}),
        });
      } catch (error) {
        throw options.lines ? new Error(`Line ${index + 1}: ${error}`) : error;
      }
    });
  } catch (error) {
    console.error(`Compilation error: ${error}`);
    hintAboutLines(error, options);
    process.exit(1);
  }

  // Join lines with newlines
  const output = results.join('\n');

  // Output the result
  if (options.outputFile) {
    try {
      // Only add trailing newline if output doesn't already end with one
      const finalOutput = output.endsWith('\n') ? output : output + '\n';
      writeFileSync(options.outputFile, finalOutput, 'utf-8');
      console.error(`Compiled to ${options.outputFile}`);
    } catch (error) {
      console.error(`Error writing file ${options.outputFile}: ${error}`);
      process.exit(1);
    }
  } else {
    console.log(output);
  }

  // Type errors do not withhold the output — the emitted code is the same
  // whether or not the checker ran — but they do make the run fail, so a build
  // step or a host saving a formula can act on them.
  if (typeErrorsFound) {
    process.exit(1);
  }
}

/** A source line the checker walked, and what it found for its nodes. */
interface CheckedSource {
  ast?: Expr;
  types?: TypeAnnotations;
}

/**
 * Report type diagnostics for every source line to stderr.
 *
 * Also returns, per line, the tree the checker walked and the types it found,
 * so `--optimize` can compile from that single pass. A line the checker
 * reported on comes back with no annotations — `typecheckWithAnnotations`
 * refuses them — so the emission falls back to what it would have been, and
 * the non-zero exit says why.
 */
function reportTypeDiagnostics(
  sources: string[],
  options: Options,
  typeDefs: TypeBinding[] = []
): { found: boolean; checked: CheckedSource[] } {
  // A bare name is a column reference in SQL, so undefined variables are
  // legitimate there and the checker must not be stricter than the compiler.
  const allowUndefinedVariables = options.target === 'sql';
  const multiLine = sources.length > 1;
  let found = false;

  let inputType: TypeExpr | undefined;
  if (options.inputType !== undefined) {
    try {
      inputType = parseTypeExpr(options.inputType);
    } catch (error) {
      console.error(`Invalid --input-type: ${error}`);
      process.exit(1);
    }
  }

  const checked: CheckedSource[] = sources.map(() => ({}));

  sources.forEach((source, index) => {
    if (isBlankSource(source)) return;
    let diagnostics;
    try {
      // Locations are opt-in at parse time, and this is exactly what they are
      // for: a diagnostic the author can act on points at a column.
      // Not trimmed: the lexer skips leading whitespace itself, and keeping it
      // means the reported column matches the column in the file.
      const ast = withTypeDefs(typeDefs, parse(source, { locations: true }));
      const result = typecheckWithAnnotations(ast, {
        allowUndefinedVariables,
        strict: options.strict,
        inputType,
      });
      diagnostics = result.diagnostics;
      checked[index] = { ast, types: result.types };
    } catch {
      // A parse error is not the checker's business; compilation below will
      // report it with its own message.
      return;
    }
    for (const diagnostic of diagnostics) {
      found = true;
      // A single -e expression is always line 1, so its own line number adds
      // nothing; a file's lines are numbered from the source.
      const formatted = formatDiagnostic(
        multiLine && diagnostic.loc
          ? { ...diagnostic, loc: { ...diagnostic.loc, line: index + 1 } }
          : diagnostic
      );
      console.error(multiLine && !diagnostic.loc ? `${index + 1}: ${formatted}` : formatted);
    }
  });

  // Saying it out loud: without this, `--optimize` on a reported program would
  // silently emit exactly what it emits without the flag.
  if (found && options.optimize) {
    console.error(
      'error: --optimize will not compile from the types of a program the ' +
      'checker reported on; the output above is unannotated [optimize-refused]'
    );
  }

  return { found, checked };
}

main();
