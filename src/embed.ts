import {
  parse,
  type ParserOptions,
  type PluginProgram,
  parsePluginProgram,
} from "./parser";
import { transform } from "./transform";
import {
  compileToJavaScriptWithMeta,
  type JavaScriptCompileOptions,
  type JavaScriptCompileResult,
} from "./compilers/javascript";
import type { Expr } from "./ast";

export type DiagnosticSeverity = "error" | "warning";

export type Diagnostic = {
  message: string;
  severity: DiagnosticSeverity;
  location?: { line: number; column: number };
};

export function parseWithMeta(
  source: string,
  options: ParserOptions = {},
): { ast: Expr | null; diagnostics: Diagnostic[] } {
  try {
    const ast = parse(source, options);
    return { ast, diagnostics: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const m = /line\s+(\d+),\s*column\s+(\d+)/i.exec(message);
    const location = m
      ? { line: Number(m[1]), column: Number(m[2]) }
      : undefined;
    return {
      ast: null,
      diagnostics: [{ message, severity: "error", location }],
    };
  }
}

export function compileFromAst(
  ast: Expr,
  options?: JavaScriptCompileOptions,
): JavaScriptCompileResult {
  // Ensure closed-world transform rules apply
  // (transform will throw on undefined vars; do_call is rejected in transform.ts)
  // Compile JS from AST
  return compileToJavaScriptWithMeta(ast, options);
}

export function compileExpression(
  source: string,
  options?: JavaScriptCompileOptions & ParserOptions,
): JavaScriptCompileResult {
  const ast = parse(source, options);
  return compileFromAst(ast, options);
}

export type CompiledPlugin = {
  program: PluginProgram;
  score: JavaScriptCompileResult;
};

export function compilePlugin(
  source: string,
  options?: JavaScriptCompileOptions & ParserOptions,
): CompiledPlugin {
  const program = parsePluginProgram(source, options);
  // Validate score cannot contain do_call by compiling score with transform enforcement
  const score = compileFromAst(program.score, options);
  return { program, score };
}
