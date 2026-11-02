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
 * module: two imports resolving to the same id are the same module, loaded and
 * inlined once, and it is what a diagnostic names.
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
  /** One binding per imported module value, then one per imported name. */
  bindings: LetBinding[];
  /** The source with its header blanked out, so lines and columns still hold. */
  body: string;
}

const DEFAULT_MAX_IMPORT_DEPTH = 32;

/**
 * How many modules one program may inline.
 *
 * Inlining duplicates: a module imported by two others appears in both, so a
 * graph that is a diamond at every level costs two inlinings per level — a
 * handful of small files could otherwise ask the compiler for billions of
 * copies. The depth guard alone does not bound that, and this does.
 */
const MAX_INLINED_MODULES = 200;

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
  // The source itself is on the stack, so a module that imports it back is a
  // cycle named from where the author started.
  return loadProgramIn(source, options, options.file ? [options.file] : [], { inlined: 0 });
}

/** What the whole load shares, as opposed to what one frame of it has. */
interface Budget {
  /** Modules inlined so far, across the graph. */
  inlined: number;
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
}

function loadProgramIn(
  source: string,
  options: LoadOptions,
  stack: string[],
  budget: Budget
): LoadedProgram {
  const { imports, typeDefs, body } = splitProgramHeader(source, parserOptions(options));
  const resolved = resolveImports(imports, options, stack, budget);
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
  budget: Budget
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

  // A module is loaded once and bound once, however many imports name it.
  const loaded = new Map<string, Module>();
  const boundAs = new Map<string, string>();

  const moduleOf = (decl: ImportDecl): Module => {
    const { id, source } = loader(decl.path, options.file);
    const already = loaded.get(id);
    if (already) return already;
    const module = loadModule(id, source, options, stack, budget);
    loaded.set(id, module);
    return module;
  };

  // The alias form first, so that a module imported both ways is bound under
  // the name its author chose rather than under one of ours.
  for (const decl of imports) {
    if (!decl.alias) continue;
    const module = moduleOf(decl);
    const bound = boundAs.get(module.id);
    // A second alias for the same module is that one binding under a second name.
    bindings.push({
      name: decl.alias,
      value: bound === undefined ? requireValue(module, decl) : variable(bound),
    });
    if (bound === undefined) {
      boundAs.set(module.id, decl.alias);
    }
  }

  for (const decl of imports) {
    if (decl.alias) continue;
    const module = moduleOf(decl);

    for (const name of decl.names) {
      if (isTypeName(name)) {
        typeDefs.push({ name, typeExpr: exportedType(module, name, decl) });
        continue;
      }
      let bound = boundAs.get(module.id);
      if (bound === undefined) {
        bound = `_module_${bindings.length}`;
        boundAs.set(module.id, bound);
        bindings.push({ name: bound, value: requireValue(module, decl) });
      }
      bindings.push({ name, value: memberAccess(variable(bound), name) });
    }
  }

  return { typeDefs, bindings };
}

function loadModule(
  id: string,
  source: string,
  options: LoadOptions,
  stack: string[],
  budget: Budget
): Module {
  if (stack.includes(id)) {
    throw new ImportError(`Import cycle: ${[...stack, id].join(' -> ')}`);
  }
  if (++budget.inlined > MAX_INLINED_MODULES) {
    throw new ImportError(
      `This program inlines more than ${MAX_INLINED_MODULES} modules, at ${[...stack, id].join(' -> ')}. ` +
      `A module imported by two others is inlined in both, so a graph that branches at every ` +
      `level costs far more than it looks.`
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
    const program = loadProgramIn(source, nested, [...stack, id], budget);
    // A module with no value is never checked by `typeDef`, so its own scope
    // is checked here: a name defined twice is refused wherever it is written.
    assertDistinctNames(program.typeDefs.map((type) => type.name), 'type definition');
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

function requireValue(module: Module, decl: ImportDecl): Expr {
  if (!module.value) {
    throw new ImportError(
      `'${module.id}' has no expression, so it exports no value, imported from '${decl.path}'`
    );
  }
  return module.value;
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
