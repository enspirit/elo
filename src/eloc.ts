#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { parse } from './parser';
import { compileToRubyWithMeta } from './compilers/ruby';
import { compileToJavaScriptWithMeta } from './compilers/javascript';
import { compileToSQLWithMeta } from './compilers/sql';
import { compileToPythonWithMeta } from './compilers/python';
import { getPrelude, Target as PreludeTarget } from './preludes';

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
  --prelude-only            Output only the prelude (no expression needed)
  --strip-guards            Strip guard/check assertions from output
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

For evaluating expressions, use the 'elo' command instead.
`);
}

interface CompileOptions {
  includePrelude?: boolean;
  execute?: boolean;
  stripGuards?: boolean;
}

function compile(source: string, target: Target, options: CompileOptions = {}): string {
  const ast = parse(source);
  const { includePrelude = false, execute = false, stripGuards = false } = options;

  let code: string;
  switch (target) {
    case 'ruby': {
      const result = compileToRubyWithMeta(ast, { execute, stripGuards });
      code = result.code;
      break;
    }
    case 'js': {
      const result = compileToJavaScriptWithMeta(ast, { execute, stripGuards });
      code = result.code;
      break;
    }
    case 'sql': {
      // SQL doesn't support execute option (no function wrapping)
      // and guards already throw an error, so stripGuards is not needed
      const result = compileToSQLWithMeta(ast);
      code = result.code;
      break;
    }
    case 'python': {
      const result = compileToPythonWithMeta(ast, { execute, stripGuards });
      code = result.code;
      break;
    }
  }

  if (includePrelude) {
    const preludeContent = getPrelude(toPreludeTarget(target));
    if (preludeContent) {
      code = `${preludeContent}\n\n${code}`;
    }
  }

  return code;
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

  // Get the source expression(s)
  let sources: string[];
  if (options.expression) {
    sources = [options.expression];
  } else if (options.inputFile) {
    try {
      // Use file descriptor 0 for stdin when input is '-'
      const content = options.inputFile === '-'
        ? readFileSync(0, 'utf-8')
        : readFileSync(options.inputFile, 'utf-8');
      // Split into lines - keep all lines but mark empty/comment lines as null
      // so we can output empty lines for them to preserve line numbers
      sources = content.split('\n').map(line => {
        const trimmed = line.trim();
        return (trimmed === '' || trimmed.startsWith('#')) ? '' : line;
      });
    } catch (error) {
      console.error(`Error reading ${options.inputFile === '-' ? 'stdin' : `file ${options.inputFile}`}: ${error}`);
      process.exit(1);
    }
  } else {
    console.error('Error: Must provide either -e <expression>, an input file, or - for stdin');
    printHelp();
    process.exit(1);
  }

  // Compile each expression
  let results: string[];
  try {
    results = sources.map((source, index) => {
      try {
        const trimmed = source.trim();
        // Skip empty lines and comment lines - return empty result
        if (trimmed === '' || trimmed.startsWith('#')) {
          return '';
        }
        return compile(trimmed, options.target, {
          includePrelude: index === 0 && options.prelude,
          execute: options.execute,
          stripGuards: options.stripGuards
        });
      } catch (error) {
        throw new Error(`Line ${index + 1}: ${error}`);
      }
    });
  } catch (error) {
    console.error(`Compilation error: ${error}`);
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
}

main();
