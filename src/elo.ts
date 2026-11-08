#!/usr/bin/env node

import { readFileSync } from 'fs';
import { parse, TRAILING_INPUT } from './parser';
import { isLocated } from './ast';
import { loadProgram, scopeProgram, hasNoExpression, readProgram } from './modules';
import type { LoadedProgram } from './modules';
import { nodeLoader } from './node-loader';
import { compileToJavaScriptWithMeta } from './compilers/javascript';
import { DateTime, Duration, Interval } from 'luxon';
import { defaultFormats, getFormat, FormatRegistry } from './formats';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json');

type InputFormat = 'json' | 'csv' | 'elo';
type OutputFormat = 'json' | 'elo' | 'csv';

interface Options {
  expression?: string;
  inputFile?: string;
  /** Input data to pass as _ (can be JSON/CSV string or @file path) */
  inputData?: string;
  /** Read input data from stdin */
  stdinData?: boolean;
  /** Input data format (json or csv, default: auto-detect or json) */
  inputFormat?: InputFormat;
  /** Output format (json, elo, or csv, default: json) */
  outputFormat?: OutputFormat;
  /**
   * If true, read the source as one expression per line rather than as one
   * program, printing one result per line.
   */
  lines?: boolean;
  /** The IANA zone NOW and TODAY are read in. Defaults to UTC (0259 D2). */
  timezone?: string;
}

function parseArgs(args: string[]): Options {
  const options: Options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-e':
      case '--expression':
        options.expression = args[++i];
        break;

      case '-d':
      case '--data':
        options.inputData = args[++i];
        break;

      case '--stdin':
        options.stdinData = true;
        break;

      case '-f':
      case '--input-format':
        options.inputFormat = args[++i] as InputFormat;
        if (options.inputFormat !== 'json' && options.inputFormat !== 'csv' && options.inputFormat !== 'elo') {
          console.error(`Invalid input format: ${options.inputFormat}. Use 'json', 'csv', or 'elo'.`);
          process.exit(1);
        }
        break;

      case '-o':
      case '--output-format':
        options.outputFormat = args[++i] as OutputFormat;
        if (options.outputFormat !== 'json' && options.outputFormat !== 'elo' && options.outputFormat !== 'csv') {
          console.error(`Invalid output format: ${options.outputFormat}. Use 'json', 'elo', or 'csv'.`);
          process.exit(1);
        }
        break;

      case '--timezone':
        options.timezone = args[++i];
        break;
      case '--lines':
        options.lines = true;
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
        // Read expression from stdin
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
Elo Evaluator (elo) v${pkg.version} - Evaluate Elo expressions

Usage:
  elo [options] [input-file]

Options:
  -e, --expression <expr>   Expression to evaluate (like ruby -e)
  -d, --data <data>         Input data for _ variable (or @file to read from file)
  --stdin                   Read input data from stdin
  -f, --input-format <fmt>  Input data format: json (default), csv, or elo
  -o, --output-format <fmt> Output format: json (default), elo, or csv
  --lines                   Evaluate each line as its own expression, instead
                            of the whole source as one program
  --timezone <IANA>         The zone NOW and TODAY are read in, e.g.
                            Europe/Brussels. Defaults to UTC.
  -v, --version             Show version number
  -h, --help                Show this help message

Examples:
  # Evaluate a simple expression
  elo -e "2 + 3 * 4"

  # Evaluate with JSON input data
  elo -e "_.x + _.y" -d '{"x": 1, "y": 2}'

  # Evaluate with CSV input data
  elo -e "map(_, fn(r ~> r.name))" -d @data.csv -f csv

  # Output as Elo code
  elo -e "{a: 1, b: 2}" -o elo

  # Output as CSV
  elo -e "[{name: 'Alice', age: 30}]" -o csv

  # Evaluate with input data from file (format auto-detected from extension)
  elo -e "_.name" -d @data.json

  # Evaluate from .elo file
  elo program.elo

  # Evaluate a file of one-line expressions, one result per line
  elo expressions.elo --lines

  # Pipe data through stdin
  echo '{"x": 10}' | elo -e "_.x * 2" --stdin

  # Read expression from stdin
  echo "2 + 3" | elo -
`);
}

/**
 * Detect input format from file extension
 */
function detectInputFormat(filePath: string): InputFormat {
  if (filePath.endsWith('.csv')) {
    return 'csv';
  }
  if (filePath.endsWith('.elo')) {
    return 'elo';
  }
  return 'json';
}

/**
 * Parse input data from CLI option (JSON/CSV string or @file path)
 */
function parseInputData(inputData: string, format: InputFormat | undefined, formats: FormatRegistry): unknown {
  let dataString = inputData;
  let detectedFormat = format;

  // If starts with @, read from file
  if (inputData.startsWith('@')) {
    const filePath = inputData.slice(1);
    // Auto-detect format from extension if not specified
    if (!detectedFormat) {
      detectedFormat = detectInputFormat(filePath);
    }
    try {
      dataString = readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(`Error reading input file ${filePath}: ${error}`);
      process.exit(1);
    }
  }

  // Default to JSON if not specified
  if (!detectedFormat) {
    detectedFormat = 'json';
  }

  try {
    return getFormat(formats, detectedFormat).parse(dataString);
  } catch (error) {
    console.error(`Error parsing input ${detectedFormat.toUpperCase()}: ${error}`);
    process.exit(1);
  }
}

/** The file a source came from, for a diagnostic to name. */
function fileOf(options: Options): string | undefined {
  return options.inputFile && options.inputFile !== '-' ? options.inputFile : undefined;
}

/**
 * Compile and evaluate a single Elo expression, under what the file's header
 * declares — its imports and its type prelude, if any.
 */
function evaluate(
  source: string,
  inputValue: unknown,
  scope?: LoadedProgram,
  where: { file?: string; firstLine?: number } = {},
  timezone?: string
): unknown {
  // Positions are recorded so that a refusal says which line of which file it
  // is about, which is the only thing an author can act on.
  const ast = scopeProgram(scope, parse(source, { locations: true, ...where }));
  const result = compileToJavaScriptWithMeta(ast, { timezone });

  // Create function with luxon DateTime, Duration, and Interval in scope
  // The compiled code is always a function that takes _ as input
  const execFn = new Function('DateTime', 'Duration', 'Interval', `return ${result.code}`);
  const fn = execFn(DateTime, Duration, Interval);

  return fn(inputValue);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const options = parseArgs(args);

  // Use default formats (can be extended by users in programmatic usage)
  const formats = defaultFormats;

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

  // The source is one program: a header — its imports, then its type prelude —
  // and one expression whose newlines mean nothing. A program that declares
  // types and nothing else evaluates to nothing. A module path is resolved
  // against the file that imported it; with -e or stdin, against the working
  // directory.
  let scope: LoadedProgram | undefined;
  let sources: string[];
  try {
    scope = loadProgram(source, {
      loader: nodeLoader(),
      file: fileOf(options),
      locations: true,
    });
    sources = readProgram(scope.body, options.lines);
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }

  // Get input data
  let inputValue: unknown = null;
  const inputFormat = options.inputFormat || 'json';

  if (options.stdinData) {
    try {
      const stdinContent = readFileSync(0, 'utf-8');
      inputValue = getFormat(formats, inputFormat).parse(stdinContent);
    } catch (error) {
      console.error(`Error reading/parsing stdin: ${error}`);
      process.exit(1);
    }
  } else if (options.inputData) {
    inputValue = parseInputData(options.inputData, options.inputFormat, formats);
  }

  // Evaluate each expression
  const outputFormat = options.outputFormat || 'json';
  const outputAdapter = getFormat(formats, outputFormat);
  const outputs: string[] = [];
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];

    // Skip blank lines and comment-only sources
    if (hasNoExpression(source)) {
      continue;
    }

    try {
      // Not trimmed: the lexer skips leading whitespace itself, and keeping it
      // means a reported column matches the column in the file.
      const result = evaluate(source, inputValue, scope, {
        file: fileOf(options),
        firstLine: options.lines ? i + 1 : 1,
      }, options.timezone);
      outputs.push(outputAdapter.serialize(result));
    } catch (error) {
      // Every compile-time refusal carries its own line and column; a runtime
      // one does not yet, and a line read on its own has to be told which.
      console.error(options.lines && !isLocated(error) ? `Error on line ${i + 1}: ${error}` : `Error: ${error}`);
      if (!options.lines && String(error).includes(TRAILING_INPUT)) {
        console.error(
          'hint: a source is one expression, newlines included. Pass --lines to ' +
          'read it as one expression per line instead.'
        );
      }
      process.exit(1);
    }
  }

  // Output results
  console.log(outputs.join('\n'));
}

main();
