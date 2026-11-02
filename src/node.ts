/**
 * The Node entry point: `@enspirit/elo/node`.
 *
 * Everything `@enspirit/elo` offers, plus what needs a filesystem. The main
 * entry point must stay importable in a browser — the playground bundles the
 * compiler in-page, where there are no files to read and an import is simply
 * refused — so the loader that reads `.elo` files off disk is here rather than
 * there. `test/unit/browser-entry.unit.test.ts` keeps that separation honest.
 */

export * from './index';
export { nodeLoader } from './node-loader';
