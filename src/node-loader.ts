/**
 * Finding and reading modules on a filesystem.
 *
 * Kept apart from `src/modules.ts` so that the linker stays free of `fs`: the
 * web playground bundles the compiler for a browser, where there are no files
 * to read and an import is simply refused.
 */

import { readFileSync } from 'fs';
import { dirname, isAbsolute, relative, resolve } from 'path';
import { ModuleLoader } from './modules';

/** The extension a module path is spelled without. */
const EXTENSION = '.elo';

/**
 * Reads modules from the filesystem, each path resolved against the file that
 * imported it.
 *
 * A path must be relative (`./types`, `../shared/types`) or absolute. A bare
 * `'types'` is refused: that spelling reads as a package name, and Elo has no
 * packages — leaving it free is cheaper than taking it back later.
 */
export function nodeLoader(base: string = process.cwd()): ModuleLoader {
  return (path, from) => {
    if (!path.startsWith('./') && !path.startsWith('../') && !isAbsolute(path)) {
      throw new Error(
        `Cannot import '${path}': a module path must be relative ('./${path}') or absolute`
      );
    }

    const file = path.endsWith(EXTENSION) ? path : path + EXTENSION;
    const id = identify(resolve(from ? dirname(from) : base, file));

    let source: string;
    try {
      source = readFileSync(id, 'utf-8');
    } catch {
      throw new Error(
        `Cannot import '${path}': no module at ${id}${from ? `, imported from ${from}` : ''}`
      );
    }
    return { id, source };
  };
}

/**
 * How a module is named in a diagnostic, and how two imports of it are told to
 * be the same module: its path from the working directory when it is under it,
 * and its absolute path otherwise.
 */
function identify(absolute: string): string {
  const fromHere = relative(process.cwd(), absolute);
  return fromHere.startsWith('..') || isAbsolute(fromHere) ? absolute : fromHere;
}
