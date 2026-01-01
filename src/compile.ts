/**
 * High-level compile API for Elo
 *
 * Compiles Elo expressions to callable JavaScript functions with
 * runtime dependency injection.
 */

import { parse } from './parser';
import { compileToJavaScript } from './compilers/javascript';

/**
 * Runtime dependencies that can be injected into compiled functions.
 * All dependencies used by the JS compiler should be listed here.
 */
export interface EloRuntime {
  dayjs?: unknown;
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
const RUNTIME_DEPS = ['dayjs'] as const;

/**
 * Compiles an Elo expression to a callable JavaScript function.
 *
 * The expression should typically be a lambda, e.g.:
 *   compile('fn(x ~> x * 2)')
 *   compile('fn(x ~> x in SOW ... EOW)')
 *
 * @example
 * ```typescript
 * import { compile } from '@enspirit/elo';
 * import dayjs from 'dayjs';
 *
 * const double = compile<(x: number) => number>(
 *   'fn(x ~> x * 2)',
 *   { runtime: { dayjs } }
 * );
 * double(21); // => 42
 *
 * const inThisWeek = compile<(x: Date) => boolean>(
 *   'fn(x ~> x in SOW ... EOW)',
 *   { runtime: { dayjs } }
 * );
 * inThisWeek(new Date()); // => true or false
 * ```
 */
export function compile<T = unknown>(
  source: string,
  options?: CompileOptions
): T {
  const ast = parse(source);
  const jsCode = compileToJavaScript(ast);

  // Extract runtime dependencies
  const runtime = options?.runtime ?? {};

  // Build parameter list and argument list for dependency injection
  const paramNames = RUNTIME_DEPS.join(', ');
  const args = RUNTIME_DEPS.map(dep => runtime[dep]);

  // Create a function that injects all dependencies into scope
  // The compiled code is always a function taking _ as input, so call it with null
  const factory = new Function(paramNames, `return (${jsCode})(null);`);

  return factory(...args) as T;
}
