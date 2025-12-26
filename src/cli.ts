#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { parse } from './parser';
import { compileToRuby } from './compilers/ruby';
import { compileToJavaScript } from './compilers/javascript';
import { compileToSQL } from './compilers/sql';
import { getPrelude, Target as PreludeTarget } from './preludes';

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
  prelude?: boolean;
  preludeOnly?: boolean;
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
        if (target !== 'ruby' && target !== 'js' && target !== 'sql') {
          console.error(`Invalid target: ${target}. Must be one of: ruby, js, sql`);
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
Elo Compiler (eloc) - Compile Elo expressions to Ruby, JavaScript, or SQL

Usage:
  eloc [options] [input-file]

Options:
  -e, --expression <expr>   Expression to compile (like ruby -e)
  -t, --target <lang>       Target language: ruby, js (default), sql
  -p, --prelude             Include necessary library imports/requires
  --prelude-only            Output only the prelude (no expression needed)
  -f, --file <path>         Output to file instead of stdout
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
`);
}

function compile(source: string, target: Target, includePrelude: boolean = false): string {
  const ast = parse(source);

  let result: string;
  switch (target) {
    case 'ruby':
      result = compileToRuby(ast);
      break;
    case 'js':
      result = compileToJavaScript(ast);
      break;
    case 'sql':
      result = compileToSQL(ast);
      break;
  }

  if (includePrelude) {
    const preludeContent = getPrelude(toPreludeTarget(target));
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
      const content = readFileSync(options.inputFile, 'utf-8');
      // Split into lines and filter out empty lines
      sources = content.split('\n').filter(line => line.trim() !== '');
    } catch (error) {
      console.error(`Error reading file ${options.inputFile}: ${error}`);
      process.exit(1);
    }
  } else {
    console.error('Error: Must provide either -e <expression> or an input file');
    printHelp();
    process.exit(1);
  }

  // Compile each expression
  let outputs: string[];
  try {
    outputs = sources.map((source, index) => {
      try {
        return compile(source.trim(), options.target, index === 0 && options.prelude);
      } catch (error) {
        throw new Error(`Line ${index + 1}: ${error}`);
      }
    });
  } catch (error) {
    console.error(`Compilation error: ${error}`);
    process.exit(1);
  }

  const output = outputs.join('\n');

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
