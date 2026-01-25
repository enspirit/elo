/**
 * Elo - A small expression language that compiles to JavaScript
 */

export * from "./ast";
export * from "./parser";
export { compile } from "./compile";
export type { CompileOptions, EloRuntime } from "./compile";
export {
  compileToJavaScript,
  compileToJavaScriptWithMeta,
} from "./compilers/javascript";
export type {
  JavaScriptCompileOptions,
  JavaScriptCompileResult,
} from "./compilers/javascript";
export { JS_HELPERS } from "./runtime";
export { getPrelude } from "./preludes";
export type { Target as PreludeTarget } from "./preludes";
export { toEloCode } from "./serialize";
export { parseCSV, toCSV } from "./csv";
export type { FormatAdapter, FormatRegistry } from "./formats";
export * from "./embed";
export * from "./json";
export {
  jsonAdapter,
  csvAdapter,
  eloAdapter,
  defaultFormats,
  getFormat,
} from "./formats";
