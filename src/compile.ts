/**
 * High-level compile API for Elo
 *
 * Compiles Elo expressions to callable JavaScript functions with
 * runtime dependency injection.
 */

import { parse } from "./parser";
import { compileToJavaScript } from "./compilers/javascript";

/**
 * Runtime dependencies that can be injected into compiled functions.
 * All dependencies used by the JS compiler should be listed here.
 */
export interface EloRuntime {
  DateTime?: unknown;
  Duration?: unknown;
  // Future dependencies can be added here
}

/**
 * Options for the compile function
 */
export interface CompileOptions {
  runtime?: EloRuntime;
}

/**
 * List of runtime dependency names to inject.
 * Must match the keys in EloRuntime.
 */
const RUNTIME_DEPS = ["DateTime", "Duration"] as const;

/**
 * Compiles an Elo expression to a callable JavaScript function.
 *
 * Every Elo expression compiles to a function that takes `_` (the implicit input) as parameter.
 * You call the returned function with your input value.
 *
 * @example
 * ```typescript
 * import { compile } from '@contextvm/elo';
 * import { DateTime, Duration } from 'luxon';
 *
 * // Simple expression using _ (implicit input)
 * const addTen = compile<(x: number) => number>(
 *   '_ + 10',
 *   { runtime: { DateTime, Duration } }
 * );
 * addTen(5); // => 15
 *
 * // Temporal expression
 * const inThisWeek = compile<(d: unknown) => boolean>(
 *   '_ in SOW ... EOW',
 *   { runtime: { DateTime, Duration } }
 * );
 * inThisWeek(DateTime.now()); // => true or false
 * ```
 */
export function compile<T = unknown>(
  source: string,
  options?: CompileOptions,
): T {
  const ast = parse(source);
  const jsCode = compileToJavaScript(ast);

  // Extract runtime dependencies
  const runtime = options?.runtime ?? {};

  // Build parameter list and argument list for dependency injection
  const paramNames = RUNTIME_DEPS.join(", ");
  const args = RUNTIME_DEPS.map((dep) => runtime[dep]);

  // Create a function that injects all dependencies into scope
  // The compiled code is a function taking _ as input
  const factory = new Function(paramNames, `return ${jsCode};`);

  return factory(...args) as T;
}
