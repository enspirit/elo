/**
 * Imports: turning a program's header into the scope it stands for.
 *
 * Elo compiles to one self-contained expression per target, with no runtime to
 * link against, so an import can only be **compile-time inlining**. A module
 * is an ordinary `.elo` source — imports, a type prelude, then one expression —
 * and that is already everything an import needs:
 *
 * - its **type prelude** is what it exports as types;
 * - its **expression** is what it exports as a value.
 *
 * `import { Person, double } from './m'` reads both halves, case deciding
 * which: `Person` is a prelude type of `./m`, `double` a property of its
 * value. `import './m' as r` binds the value alone.
 *
 * Inlining is **once per program**, not once per import: the modules of a
 * program are bound at its root, in dependency order, and every import of one
 * is a reference to its binding. A shared helper is therefore emitted once and
 * evaluated once, which is what makes a small module free to write.
 *
 * This file reads no files. It is given a `ModuleLoader`, so the same linking
 * runs under a filesystem (`src/node-loader.ts`), under a map of sources in a
 * test, or not at all in a host that has no modules to offer — the web
 * playground imports this and must not pull `fs` in behind it.
 */

import {
  assertDistinctNames,
  Expr,
  ImportDecl,
  LetBinding,
  TypeBinding,
  TypeExpr,
  locate,
  memberAccess,
  variable,
  withLetBindings,
  withTypeDefs,
} from './ast';
import { parse, ParserOptions, splitProgramHeader } from './parser';

/**
 * Finds a module and reads it.
 *
 * `path` is what the import wrote, `from` the id of the module it was written
 * in (absent for the program itself). The `id` that comes back identifies the
 * module: two imports resolving to the same id are the same module, read and
 * bound once, and it is what a diagnostic names.
 */
export interface ModuleLoader {
  (path: string, from: string | undefined): { id: string; source: string };
}

export interface LoadOptions {
  /** How to find and read a module. Without one, any import is refused. */
  loader?: ModuleLoader;
  /** The id of the source being loaded, for resolving its imports. */
  file?: string;
  /** Record source locations, as `parse` does, and tag them with their file. */
  locations?: boolean;
  /**
   * How deep the import graph may go. A cycle is refused by name, so this only
   * catches a chain that is honestly that long — a mistake of its own, and a
   * compiler that recurses per module owes the host a bound.
   */
  maxImportDepth?: number;
}

/**
 * What a program's header declares, resolved.
 *
 * `scopeProgram` puts an expression under it — or leaves it alone, given
 * nothing, which is a source compiled on its own. The two halves are kept
 * apart because a
 * `.elo` read one expression per line scopes every line under the same
 * declarations.
 */
export interface LoadedProgram {
  /** Imported types, then the source's own prelude, each in scope for the next. */
  typeDefs: TypeBinding[];
  /**
   * One binding per module in the graph, in dependency order, then one per
   * name the source's own header brings in.
   */
  bindings: LetBinding[];
  /** The source with its header blanked out, so lines and columns still hold. */
  body: string;
}

const DEFAULT_MAX_IMPORT_DEPTH = 32;

/**
 * How many modules one program may import.
 *
 * A module counts once however many importers name it, so this is reached by a
 * program that honestly reads that many distinct files — a graph's size, not
 * its shape. The depth guard does not bound it, and this does.
 */
const MAX_MODULES = 200;

/**
 * The prefix of the names module values are bound under.
 *
 * These bindings are the compiler's, at the root of the program, and what a
 * module reaches its own imports through. An import that bound one of these
 * names would redirect the imports written after it, so a name of this shape
 * is refused there. Nowhere else can: a module's expression is scoped *under*
 * the bindings that reference the modules, so what it binds for itself is
 * invisible to them.
 */
const MODULE_BINDING_PREFIX = '_module_';

const MODULE_BINDING_NAME = new RegExp(`^${MODULE_BINDING_PREFIX}\\d+$`);

/**
 * A refusal that already says which module it is about.
 *
 * Rethrown as it is by the frames above, so a cycle or a missing export is
 * reported once rather than once per module it was imported through.
 */
class ImportError extends Error {}

/**
 * Read a source's header and resolve its imports.
 *
 * Every name the header brings in becomes either a type definition or a let
 * binding, so nothing downstream of here knows that imports exist: the tree is
 * one a single source could have produced.
 */
export function loadProgram(source: string, options: LoadOptions = {}): LoadedProgram {
  const linking: Linking = { modules: new Map(), bindings: [], read: 0 };
  // The source itself is on the stack, so a module that imports it back is a
  // cycle named from where the author started.
  const program = loadProgramIn(source, options, options.file ? [options.file] : [], linking);
  // The module values are the outermost bindings of the whole program: one per
  // distinct module, in dependency order, and the header's own names after.
  return { ...program, bindings: [...linking.bindings, ...program.bindings] };
}

/**
 * What the whole load shares, as opposed to what one frame of it has.
 *
 * A module is read, parsed and bound once, and every import of it — from the
 * program or from another module — becomes a reference to that one binding.
 * Inlining it per importer gave the same answer, at a cost that grew with the
 * square of the graph: a shared helper was copied once per path reaching it,
 * and its expression evaluated once per copy.
 */
interface Linking {
  /** Every module read so far, by the id its loader gave it. */
  modules: Map<string, Module>;
  /** One binding per module value, in dependency order. */
  bindings: LetBinding[];
  /** How many modules have been read, including the ones still being read. */
  read: number;
}

/**
 * Scope an expression under what a header declared.
 *
 * The module values are bound outermost: a module's expression is inlined
 * where it can see nothing of the importer, which is what makes it a module
 * rather than a macro. Its `_` is the program's input, as any `_` at that
 * level is.
 */
export function scopeProgram(program: LoadedProgram | undefined, expr: Expr): Expr {
  if (!program) return expr;
  return withLetBindings(program.bindings, withTypeDefs(program.typeDefs, expr));
}

/**
 * The expressions a program's body holds, out of what follows its header.
 *
 * One expression by default: a source is a single expression whose newlines
 * mean nothing, and a source with nothing under its prelude holds none. With
 * `lines`, every line is its own expression — the reading `--lines` serves and
 * the convention the fixture corpus is written in, where one line of source
 * must give one line of emitted code, so a line carrying no expression comes
 * back blank rather than dropped.
 */
export function readProgram(body: string, lines?: boolean): string[] {
  if (!lines) {
    return hasNoExpression(body) ? [] : [body];
  }
  return body.split('\n').map((line) => (hasNoExpression(line) ? '' : line));
}

/**
 * True when a source holds no expression — all that is left under its header
 * is blank lines and comments. Such a module exports types and no value.
 */
export function hasNoExpression(body: string): boolean {
  return body.split('\n').every((line) => {
    const trimmed = line.trim();
    return trimmed === '' || trimmed.startsWith('#');
  });
}

/** One module, read and parsed. */
interface Module {
  id: string;
  /** Its type scope: what it imported, then its own prelude. */
  types: TypeBinding[];
  /** Its value, scoped under its own imports and types. Absent if it has none. */
  value?: Expr;
  /**
   * The root binding its value is bound under, once something asks for it.
   * A module imported for its types alone is never bound, and costs nothing.
   */
  binding?: string;
}

function loadProgramIn(
  source: string,
  options: LoadOptions,
  stack: string[],
  linking: Linking
): LoadedProgram {
  const { imports, typeDefs, body } = splitProgramHeader(source, parserOptions(options));
  const resolved = resolveImports(imports, options, stack, linking);
  return {
    typeDefs: [...resolved.typeDefs, ...typeDefs],
    bindings: resolved.bindings,
    body,
  };
}

function resolveImports(
  imports: ImportDecl[],
  options: LoadOptions,
  stack: string[],
  linking: Linking
): { typeDefs: TypeBinding[]; bindings: LetBinding[] } {
  const typeDefs: TypeBinding[] = [];
  const bindings: LetBinding[] = [];

  if (imports.length === 0) {
    return { typeDefs, bindings };
  }
  const loader = options.loader;
  if (!loader) {
    throw new ImportError(
      `Cannot import '${imports[0].path}': this host has no module loader, so it cannot read a module`
    );
  }

  const moduleOf = (decl: ImportDecl): Module => {
    const { id, source } = loader(decl.path, options.file);
    // A module already read is the same module: there is nothing to read again
    // and nothing to bind again, whoever imported it first.
    const already = linking.modules.get(id);
    if (already) return already;
    const module = loadModule(id, source, options, stack, linking);
    linking.modules.set(id, module);
    return module;
  };

  for (const decl of imports) {
    // Every refusal an import can raise is about this declaration, so one
    // `locate` here positions them all at the line the author wrote — and a
    // refusal from inside a module keeps the position it already has.
    try {
      const module = moduleOf(decl);

      if (decl.alias) {
        bindings.push({ name: refuseModuleName(decl.alias, decl), value: valueOf(module, decl, linking) });
        continue;
      }

      for (const name of decl.names) {
        if (isTypeName(name)) {
          typeDefs.push({ name, typeExpr: exportedType(module, name, decl) });
          continue;
        }
        bindings.push({
          name: refuseModuleName(name, decl),
          value: memberAccess(valueOf(module, decl, linking), assertExported(module, name, decl)),
        });
      }
    } catch (error) {
      throw locate(error, decl.loc);
    }
  }

  return { typeDefs, bindings };
}

function loadModule(
  id: string,
  source: string,
  options: LoadOptions,
  stack: string[],
  linking: Linking
): Module {
  if (stack.includes(id)) {
    throw new ImportError(`Import cycle: ${[...stack, id].join(' -> ')}`);
  }
  if (++linking.read > MAX_MODULES) {
    throw new ImportError(
      `This program imports more than ${MAX_MODULES} modules, at ${[...stack, id].join(' -> ')}. ` +
      `A module counts once however many importers name it, so this is that many distinct files.`
    );
  }
  const maxDepth = options.maxImportDepth ?? DEFAULT_MAX_IMPORT_DEPTH;
  if (stack.length >= maxDepth) {
    throw new ImportError(
      `Imports go more than ${maxDepth} modules deep: ${[...stack, id].join(' -> ')}`
    );
  }

  const nested: LoadOptions = { ...options, file: id };
  try {
    const program = loadProgramIn(source, nested, [...stack, id], linking);
    // A module with no value is never checked by `typeDef`, so its own scope
    // is checked here: a name defined twice is refused wherever it is written.
    assertDistinctNames(program.typeDefs, 'type definition');
    const value = hasNoExpression(program.body)
      ? undefined
      : scopeProgram(program, parse(program.body, parserOptions(nested)));
    return { id, types: program.typeDefs, value };
  } catch (error) {
    // A refusal that already names its module says it once, however many
    // modules it was imported through.
    if (error instanceof ImportError) throw error;
    throw new ImportError(`Cannot import '${id}': ${messageOf(error)}`);
  }
}

/**
 * The type a module exports under `name`, with the module's own type names
 * substituted into it.
 *
 * Expanding rather than renaming is what keeps an import from leaking: the
 * importer gets one self-contained type, and no name of the module's becomes
 * visible just because something it exports is built on it. A prelude is
 * ordered — a type can only name one defined before it — so expanding always
 * terminates.
 */
function exportedType(module: Module, name: string, decl: ImportDecl): TypeExpr {
  const index = module.types.findIndex((type) => type.name === name);
  if (index < 0) {
    throw new ImportError(
      `'${module.id}' defines no type '${name}', imported from '${decl.path}'`
    );
  }
  const scope = new Map(module.types.slice(0, index).map((type) => [type.name, type.typeExpr]));
  return expandTypeRefs(module.types[index].typeExpr, scope);
}

function expandTypeRefs(typeExpr: TypeExpr, scope: Map<string, TypeExpr>): TypeExpr {
  switch (typeExpr.kind) {
    case 'type_ref': {
      const defined = scope.get(typeExpr.name);
      // A name the module did not define is a built-in, and stays a reference.
      return defined ? expandTypeRefs(defined, scope) : typeExpr;
    }
    case 'array_type':
      return { ...typeExpr, elementType: expandTypeRefs(typeExpr.elementType, scope) };
    case 'union_type':
      return { ...typeExpr, types: typeExpr.types.map((type) => expandTypeRefs(type, scope)) };
    case 'subtype_constraint':
      return { ...typeExpr, baseType: expandTypeRefs(typeExpr.baseType, scope) };
    case 'type_schema':
      return {
        ...typeExpr,
        properties: typeExpr.properties.map((property) => ({
          ...property,
          typeExpr: expandTypeRefs(property.typeExpr, scope),
        })),
        extras:
          typeExpr.extras && typeof typeExpr.extras === 'object'
            ? expandTypeRefs(typeExpr.extras, scope)
            : typeExpr.extras,
      };
  }
}

/**
 * A reference to the module's value, binding it at the root on first need.
 *
 * The binding is made here rather than when the module was read, so a module
 * imported for its types alone is not bound at all. Its dependencies were
 * bound while it was being read, which is before this, so the bindings come
 * out in dependency order.
 */
function valueOf(module: Module, decl: ImportDecl, linking: Linking): Expr {
  if (!module.value) {
    throw new ImportError(
      `'${module.id}' has no expression, so it exports no value, imported from '${decl.path}'`
    );
  }
  if (module.binding === undefined) {
    module.binding = `${MODULE_BINDING_PREFIX}${linking.bindings.length}`;
    linking.bindings.push({ name: module.binding, value: module.value });
  }
  return variable(module.binding);
}

/**
 * The names a module provably exports as values, or `undefined` when they
 * cannot be known.
 *
 * A module exports each property of its expression, so a module ending in an
 * object literal has its exports written down and a typo in an import can be
 * refused. Anything else — a coercion, an `if`, a member read, `_` — has keys
 * that only exist at run time, and is accepted as today: refusing only what is
 * provably absent is what keeps this from becoming a static type system for
 * data, which Elo deliberately is not.
 *
 * A `let` and a type prelude are seen through, since `scopeProgram` wraps the
 * expression in them and an author writes them too. Only the one expression
 * the module ends on is read, so nothing here evaluates anything.
 */
function exportedNames(value: Expr): Set<string> | undefined {
  let expr = value;
  while (expr.type === 'let' || expr.type === 'typedef') expr = expr.body;
  if (expr.type !== 'object') return undefined;
  return new Set(expr.properties.map((property) => property.key));
}

/**
 * Refuses a value name the module is known not to export.
 *
 * It is the one way an import can go wrong that was silent: everything else —
 * a module that is not there, a cycle, a module with no expression, a type it
 * does not define — already names the module, while a misspelled value name
 * produced `undefined`, `nil`, `None` or `NULL`, which is the failure mode Elo
 * exists to avoid.
 */
function assertExported(module: Module, name: string, decl: ImportDecl): string {
  const names = module.value && exportedNames(module.value);
  if (names && !names.has(name)) {
    throw new ImportError(
      `'${module.id}' defines no name '${name}', imported from '${decl.path}'`
    );
  }
  return name;
}

/**
 * A name an import may not bring in.
 *
 * An import's bindings sit between the module bindings and the importer's own
 * expression, and are what carries a reference to a module value, so one of
 * them taking a module binding's name would redirect the imports written after
 * it. Nothing else can: a module's expression is scoped under those bindings,
 * so whatever it binds for itself is invisible to them.
 */
function refuseModuleName(name: string, decl: ImportDecl): string {
  if (MODULE_BINDING_NAME.test(name)) {
    throw new ImportError(
      `'${name}' cannot name an import from '${decl.path}': the compiler binds ` +
      `the modules of a program under '${MODULE_BINDING_PREFIX}<n>'`
    );
  }
  return name;
}

function parserOptions(options: LoadOptions): ParserOptions {
  return { locations: options.locations, file: options.file };
}

function isTypeName(name: string): boolean {
  return /^[A-Z]/.test(name);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
