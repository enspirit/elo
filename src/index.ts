/**
 * Elo - A small expression language that compiles to Ruby, JavaScript, Python
 * and PostgreSQL.
 *
 * This file *is* the public surface of `@enspirit/elo`, so it lists every name
 * it exports rather than re-exporting a module wholesale. A wildcard publishes
 * whatever the module happens to export, which is how 33 compiler internals
 * became part of the package's interface without anyone deciding they should
 * be — and left "is this a breaking change?" unanswerable.
 *
 * The three tiers below are documented in README.md under "Versioning and the
 * public interface", and pinned by test/unit/public-surface.unit.test.ts,
 * which fails on an export in no tier and on a tier naming something no longer
 * exported. Adding an export means deciding what it promises.
 *
 * Anything reading the filesystem lives in `./node`, so this entry stays
 * importable in a browser (test/unit/browser-entry.unit.test.ts).
 */

// ===========================================================================
// PUBLIC — breaking any of these requires a major release.
//
// What you need to use Elo as a black box: parse, compile, evaluate,
// type-check. The option and result types come with the functions, since a
// function whose arguments you cannot name is not usable from TypeScript.
// ===========================================================================

export { compile } from './compile';
export type { CompileOptions, EloRuntime } from './compile';

export { parse } from './parser';
export type { ParserOptions } from './parser';

export { compileToRuby } from './compilers/ruby';
export type { RubyCompileOptions } from './compilers/ruby';
export { compileToJavaScript } from './compilers/javascript';
export type { JavaScriptCompileOptions } from './compilers/javascript';
export { compileToSQL } from './compilers/sql';
export type { SQLCompileOptions } from './compilers/sql';
export { compileToPython } from './compilers/python';
export type { PythonCompileOptions } from './compilers/python';

// `formatDiagnostic` is public with `typecheck` on purpose: it renders a
// diagnostic the way the CLI does, which is what lets a host report one
// without reading `DiagnosticCode`, the part that may be renamed.
export { typecheck, formatDiagnostic } from './typecheck';
export type { Diagnostic, TypecheckOptions } from './typecheck';

export { getPrelude, isPreludePrependable } from './preludes';
export type { Target as PreludeTarget } from './preludes';

// Reading a program that imports, and the loader a host supplies for it.
export { loadProgram, scopeProgram, hasNoExpression, readProgram } from './modules';
export type { ModuleLoader, LoadOptions, LoadedProgram } from './modules';

// The failure a compiled expression raises. Its `kind`, `path` and `label` are
// promised; the `message` prose is not, which is why the kinds exist.
export type { EloFailure } from './runtime';

// ===========================================================================
// PROTECTED — may change in a minor release, announced in the changelog.
//
// The AST: its factories, its node shapes, and anything keyed on a node or
// naming a diagnostic. A host that builds or reads one should pin the minor.
// ===========================================================================

export {
  literal,
  nullLiteral,
  stringLiteral,
  dateLiteral,
  dateTimeLiteral,
  durationLiteral,
  variable,
  binary,
  unary,
  temporalKeyword,
  functionCall,
  apply,
  memberAccess,
  letExpr,
  ifExpr,
  lambda,
  objectLiteral,
  arrayLiteral,
  alternative,
  dataPath,
  typeRef,
  typeSchema,
  typeDef,
  withTypeDefs,
  withLetBindings,
  subtypeConstraint,
  arrayType,
  unionType,
  guardExpr,
} from './ast';

export type {
  Expr,
  SourceLocation,
  Located,
  Literal,
  NullLiteral,
  StringLiteral,
  DateLiteral,
  DateTimeLiteral,
  DurationLiteral,
  TemporalKeyword,
  Variable,
  BinaryOp,
  UnaryOp,
  FunctionCall,
  Apply,
  MemberAccess,
  LetBinding,
  LetExpr,
  IfExpr,
  Lambda,
  ObjectProperty,
  ObjectLiteral,
  ArrayLiteral,
  Alternative,
  DataPath,
  TypeExpr,
  TypeRef,
  TypeSchema,
  Constraint,
  SubtypeConstraint,
  ArrayType,
  UnionType,
  TypeSchemaProperty,
  TypeBinding,
  ImportDecl,
  TypeDef,
  GuardExpr,
} from './ast';

// Produces an AST node, so it moves with the AST.
export { parseTypeExpr } from './parser';

// The checker-to-codegen seam behind `--optimize`: the annotations are keyed
// on AST nodes, so they move with the AST.
export { typecheckWithAnnotations } from './typecheck';
export type { TypeAnnotations } from './typecheck';

// A closed set a host switches on. The checker keeps reporting; which code it
// uses for a given mistake may be renamed.
export type { DiagnosticCode } from './typecheck';

// ===========================================================================
// PRIVATE — reachable, and no promise at all.
//
// Exported because unexporting buys nothing — private already means no
// promise — and because this repository's own playground and CLIs use some of
// them. Being importable is not a promise: expect a patch release to break
// these.
// ===========================================================================

// The function is private; the Elo literal syntax it emits stays public
// through the binaries.
export { toEloCode } from './serialize';

// Data formats: the same split. Private names over formats the CLIs promise.
export { parseCSV, toCSV } from './csv';
export { jsonAdapter, csvAdapter, eloAdapter, defaultFormats, getFormat } from './formats';
export type { FormatAdapter, FormatRegistry } from './formats';

// How the compiler positions a refusal.
export { locate, isLocated, formatSourceLocation, assertDistinctNames } from './ast';

// Parser internals. `parse` is the entry point.
export { Parser, TRAILING_INPUT, splitProgramHeader } from './parser';
export type { ProgramHeaderSplit } from './parser';

// Emission metadata and checker internals.
export { compileToJavaScriptWithMeta } from './compilers/javascript';
export type { JavaScriptCompileResult } from './compilers/javascript';
export { typecheckWithType, typecheckStructural, describeType, projectType } from './typecheck';
export type { CheckType } from './typecheck';

// The raw JavaScript helper sources, for a host assembling its own prelude.
export { JS_HELPERS } from './runtime';
