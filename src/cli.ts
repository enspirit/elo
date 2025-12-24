#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { parse } from './parser';
import { compileToRuby, RubyCompileOptions } from './compilers/ruby';
import { compileToJavaScript, JavaScriptCompileOptions } from './compilers/javascript';
import { compileToSQL, SQLCompileOptions } from './compilers/sql';
import { getPrelude, Target as PreludeTarget, Mode } from './preludes';

type Target = 'ruby' | 'js' | 'sql';

// Map CLI target names to prelude target names
function toPreludeTarget(target: Target): PreludeTarget {
  return target === 'js' ? 'javascript' : target;
}

interface Options {
  expression?: string;
  inputFile?: string;
  outputFile?: string;
  target: Target;
  mode: Mode;
  prelude?: boolean;
  preludeOnly?: boolean;
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    target: 'js',        // default target
    mode: 'production'   // default mode
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
        if (target !== 'ruby' && target !== 'js' && target !== 'sql') {
          console.error(`Invalid target: ${target}. Must be one of: ruby, js, sql`);
          process.exit(1);
        }
        options.target = target;
        break;

      case '-m':
      case '--mode':
        const mode = args[++i];
        if (mode !== 'production' && mode !== 'testable') {
          console.error(`Invalid mode: ${mode}. Must be one of: production, testable`);
          process.exit(1);
        }
        options.mode = mode;
        break;

      case '-p':
      case '--prelude':
        options.prelude = true;
        break;

      case '--prelude-only':
        options.preludeOnly = true;
        break;

      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
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
Klang Compiler (kc) - Compile Klang expressions to Ruby, JavaScript, or SQL

Usage:
  kc [options] [input-file]

Options:
  -e, --expression <expr>   Expression to compile (like ruby -e)
  -t, --target <lang>       Target language: ruby, js (default), sql
  -m, --mode <mode>         Compilation mode: production (default), testable
  -p, --prelude             Include necessary library imports/requires
  --prelude-only            Output only the prelude (no expression needed)
  -f, --file <path>         Output to file instead of stdout
  -h, --help                Show this help message

Modes:
  production   Uses native temporal functions (Date.today, dayjs(), CURRENT_DATE)
               Minimal prelude with just library imports
  testable     Uses injectable temporal functions (Klang.today, klang.today(), klang_today())
               Full prelude with time injection support via KLANG_NOW env var

Examples:
  # Compile expression to JavaScript (default)
  kc -e "2 + 3 * 4"

  # Compile expression to Ruby
  kc -e "2 + 3 * 4" -t ruby

  # Compile expression to SQL
  kc -e "2 + 3 * 4" -t sql

  # Compile with prelude (includes required libraries)
  kc -e "NOW + PT2H" -t ruby -p

  # Compile in testable mode (for deterministic testing)
  kc -e "TODAY == D2025-01-01" -t ruby -m testable -p

  # Compile from file
  kc input.klang -t ruby

  # Compile to file
  kc -e "2 + 3" -t ruby -f output.rb

  # Compile file to file
  kc input.klang -t js -f output.js
`);
}

function compile(source: string, target: Target, mode: Mode, includePrelude: boolean = false): string {
  const ast = parse(source);
  const temporalMode = mode;

  let result: string;
  switch (target) {
    case 'ruby': {
      const options: RubyCompileOptions = { temporalMode };
      result = compileToRuby(ast, options);
      break;
    }
    case 'js': {
      const options: JavaScriptCompileOptions = { temporalMode };
      result = compileToJavaScript(ast, options);
      break;
    }
    case 'sql': {
      const options: SQLCompileOptions = { temporalMode };
      result = compileToSQL(ast, options);
      break;
    }
  }

  if (includePrelude) {
    const preludeContent = getPrelude(toPreludeTarget(target), mode);
    if (preludeContent) {
      result = `${preludeContent}\n\n${result}`;
    }
  }

  return result;
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
    const prelude = getPrelude(toPreludeTarget(options.target), options.mode);
    console.log(prelude);
    return;
  }

  // Get the source expression
  let source: string;
  if (options.expression) {
    source = options.expression;
  } else if (options.inputFile) {
    try {
      source = readFileSync(options.inputFile, 'utf-8').trim();
    } catch (error) {
      console.error(`Error reading file ${options.inputFile}: ${error}`);
      process.exit(1);
    }
  } else {
    console.error('Error: Must provide either -e <expression> or an input file');
    printHelp();
    process.exit(1);
  }

  // Compile the expression
  let output: string;
  try {
    output = compile(source, options.target, options.mode, options.prelude);
  } catch (error) {
    console.error(`Compilation error: ${error}`);
    process.exit(1);
  }

  // Output the result
  if (options.outputFile) {
    try {
      writeFileSync(options.outputFile, output + '\n', 'utf-8');
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
