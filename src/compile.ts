/**
 * High-level compile API for Elo
 *
 * Compiles Elo expressions to callable JavaScript functions with
 * runtime dependency injection.
 */

import { parse } from './parser';
import { compileToJavaScript } from './compilers/javascript';
import { loadProgram, scopeProgram } from './modules';
import type { LoadedProgram, ModuleLoader } from './modules';

/**
 * Runtime dependencies that can be injected into compiled functions.
 * All dependencies used by the JS compiler should be listed here.
 */
export interface EloRuntime {
  DateTime?: unknown;
  Duration?: unknown;
  Interval?: unknown;
}

/**
 * Options for the compile function
 */
export interface CompileOptions {
  runtime?: EloRuntime;
  /**
   * How to find and read an imported module.
   *
   * Without one, an import is refused — there is nothing for the compiler to
   * read from, and reading files is a capability a host grants rather than
   * one the compiler takes. `nodeLoader` from `@enspirit/elo/node` reads the
   * filesystem; a host may pass its own over a map of sources, a database or
   * a bundler's virtual filesystem.
   */
  loader?: ModuleLoader;
  /**
   * Which file the source came from.
   *
   * An import is resolved against it, and a diagnostic names it. Without one,
   * a path is resolved against the loader's own base.
   */
  file?: string;
  /**
   * What a header already resolved to, from `loadProgram`.
   *
   * For a source read one expression per line — `readProgram(body, true)` —
   * where the header was lifted off the top once and scopes every line. With
   * it, the source is read as an expression under that scope and may hold no
   * header of its own.
   */
  scope?: LoadedProgram;
}

/**
 * List of runtime dependency names to inject.
 * Must match the keys in EloRuntime.
 */
const RUNTIME_DEPS = ['DateTime', 'Duration', 'Interval'] as const;

/**
 * Compiles an Elo expression to a callable JavaScript function.
 *
 * Every Elo expression compiles to a function that takes `_` (the implicit input) as parameter.
 * You call the returned function with your input value.
 *
 * @example
 * ```typescript
 * import { compile } from '@enspirit/elo';
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
 *
 * // A source that imports, given something to read from
 * import { nodeLoader } from '@enspirit/elo/node';
 *
 * const greet = compile<(input: null) => unknown>(
 *   "import { double } from './helpers'\nfn( n ~> double(n) + 1 )",
 *   { runtime: { DateTime, Duration }, loader: nodeLoader(), file: 'main.elo' }
 * );
 * ```
 */
export function compile<T = unknown>(
  source: string,
  options?: CompileOptions
): T {
  const { file } = options ?? {};
  // Positions are recorded so that a refusal says which line of which file it
  // is about — including the file, when the source came from one or from a
  // module it imported.
  const parserOptions = { locations: true, file };

  // A scope already resolved is a program whose header was read once, for a
  // source read one expression per line; otherwise this source is the program
  // and its own header is read here.
  const scope = options?.scope
    ?? loadProgram(source, { loader: options?.loader, file, locations: true });
  const body = options?.scope ? source : scope.body;
  const ast = scopeProgram(scope, parse(body, parserOptions));

  const jsCode = compileToJavaScript(ast);

  // Extract runtime dependencies
  const runtime = options?.runtime ?? {};

  // Build parameter list and argument list for dependency injection
  const paramNames = RUNTIME_DEPS.join(', ');
  const args = RUNTIME_DEPS.map(dep => runtime[dep]);

  // Create a function that injects all dependencies into scope
  // The compiled code is a function taking _ as input
  const factory = new Function(paramNames, `return ${jsCode};`);

  return factory(...args) as T;
}
