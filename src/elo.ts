#!/usr/bin/env node

import { readFileSync } from "fs";
import { parse } from "./parser";
import { compileToJavaScriptWithMeta } from "./compilers/javascript";
import { DateTime, Duration } from "luxon";
import { defaultFormats, getFormat, FormatRegistry } from "./formats";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require("../../package.json");

type InputFormat = "json" | "csv";
type OutputFormat = "json" | "elo" | "csv";

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
}

function parseArgs(args: string[]): Options {
  const options: Options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "-e":
      case "--expression":
        options.expression = args[++i];
        break;

      case "-d":
      case "--data":
        options.inputData = args[++i];
        break;

      case "--stdin":
        options.stdinData = true;
        break;

      case "-f":
      case "--input-format":
        options.inputFormat = args[++i] as InputFormat;
        if (options.inputFormat !== "json" && options.inputFormat !== "csv") {
          console.error(
            `Invalid input format: ${options.inputFormat}. Use 'json' or 'csv'.`,
          );
          process.exit(1);
        }
        break;

      case "-o":
      case "--output-format":
        options.outputFormat = args[++i] as OutputFormat;
        if (
          options.outputFormat !== "json" &&
          options.outputFormat !== "elo" &&
          options.outputFormat !== "csv"
        ) {
          console.error(
            `Invalid output format: ${options.outputFormat}. Use 'json', 'elo', or 'csv'.`,
          );
          process.exit(1);
        }
        break;

      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
        break;

      case "-v":
      case "--version":
        console.log(`Elo ${pkg.version}`);
        process.exit(0);
        break;

      case "-":
        // Read expression from stdin
        options.inputFile = "-";
        break;

      default:
        // If it doesn't start with -, treat it as input file
        if (!arg.startsWith("-") && !options.inputFile && !options.expression) {
          options.inputFile = arg;
        } else if (!arg.startsWith("-")) {
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
  -f, --input-format <fmt>  Input data format: json (default) or csv
  -o, --output-format <fmt> Output format: json (default), elo, or csv
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
  elo expressions.elo

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
  if (filePath.endsWith(".csv")) {
    return "csv";
  }
  return "json";
}

/**
 * Parse input data from CLI option (JSON/CSV string or @file path)
 */
function parseInputData(
  inputData: string,
  format: InputFormat | undefined,
  formats: FormatRegistry,
): unknown {
  let dataString = inputData;
  let detectedFormat = format;

  // If starts with @, read from file
  if (inputData.startsWith("@")) {
    const filePath = inputData.slice(1);
    // Auto-detect format from extension if not specified
    if (!detectedFormat) {
      detectedFormat = detectInputFormat(filePath);
    }
    try {
      dataString = readFileSync(filePath, "utf-8");
    } catch (error) {
      console.error(`Error reading input file ${filePath}: ${error}`);
      process.exit(1);
    }
  }

  // Default to JSON if not specified
  if (!detectedFormat) {
    detectedFormat = "json";
  }

  try {
    return getFormat(formats, detectedFormat).parse(dataString);
  } catch (error) {
    console.error(
      `Error parsing input ${detectedFormat.toUpperCase()}: ${error}`,
    );
    process.exit(1);
  }
}

/**
 * Compile and evaluate a single Elo expression
 */
function evaluate(source: string, inputValue: unknown): unknown {
  const ast = parse(source);
  const result = compileToJavaScriptWithMeta(ast);

  // Create function with luxon DateTime and Duration in scope
  // The compiled code is always a function that takes _ as input
  const execFn = new Function("DateTime", "Duration", `return ${result.code}`);
  const fn = execFn(DateTime, Duration);

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

  // Get the source expression(s)
  let sources: string[];
  if (options.expression) {
    sources = [options.expression];
  } else if (options.inputFile) {
    try {
      // Use file descriptor 0 for stdin when input is '-'
      const content =
        options.inputFile === "-"
          ? readFileSync(0, "utf-8")
          : readFileSync(options.inputFile, "utf-8");
      // Split into lines - keep all lines but mark empty/comment lines as null
      sources = content.split("\n").map((line) => {
        const trimmed = line.trim();
        return trimmed === "" || trimmed.startsWith("#") ? "" : line;
      });
    } catch (error) {
      console.error(
        `Error reading ${options.inputFile === "-" ? "stdin" : `file ${options.inputFile}`}: ${error}`,
      );
      process.exit(1);
    }
  } else {
    console.error(
      "Error: Must provide either -e <expression>, an input file, or - for stdin",
    );
    printHelp();
    process.exit(1);
  }

  // Get input data
  let inputValue: unknown = null;
  const inputFormat = options.inputFormat || "json";

  if (options.stdinData) {
    try {
      const stdinContent = readFileSync(0, "utf-8");
      inputValue = getFormat(formats, inputFormat).parse(stdinContent);
    } catch (error) {
      console.error(`Error reading/parsing stdin: ${error}`);
      process.exit(1);
    }
  } else if (options.inputData) {
    inputValue = parseInputData(
      options.inputData,
      options.inputFormat,
      formats,
    );
  }

  // Evaluate each expression
  const outputFormat = options.outputFormat || "json";
  const outputAdapter = getFormat(formats, outputFormat);
  const outputs: string[] = [];
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const trimmed = source.trim();

    // Skip empty lines and comments
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    try {
      const result = evaluate(trimmed, inputValue);
      outputs.push(outputAdapter.serialize(result));
    } catch (error) {
      console.error(`Error on line ${i + 1}: ${error}`);
      process.exit(1);
    }
  }

  // Output results
  console.log(outputs.join("\n"));
}

main();
