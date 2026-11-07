# Two workflows, two Node versions

> "After that, fix the github actions (fails on github pages, nodejs version).
> Then upgrade dependencies in contrib/."

## The Pages failure

`deploy-pages.yml` pinned `node-version: '20'`. `ci.yml` pinned `'22'`. The
1.2.3 dependency upgrade moved the website to **Astro 7.3.8**, whose
`engines.node` is `>=22.12.0` — so the Pages build started failing on a Node
version nobody had thought to change, while CI stayed green on a different one.

The version mismatch is the actual bug; the Astro upgrade only exposed it. So
the fix is not "write 22 in the other file" but a single source of truth:

- **`.nvmrc`** holds `22`, and both workflows use `node-version-file: '.nvmrc'`.
  They can no longer drift.
- **`web/package.json` gains `engines.node: '>=22.12.0'`**, so the requirement
  is recorded where the thing that has it lives, and `npm install` in `web/`
  warns rather than failing opaquely later.
- **Not** added to the root `package.json`: the compiler itself runs on older
  Node, and an `engines` field there would constrain every library consumer for
  a website toolchain's benefit.
- `actions/configure-pages@v4` → `v5` while in the file.

Verified by reproducing the Pages build locally — `contrib/codemirror-lang-elo`
`npm ci && npm run prepare`, then `web && npm run build` — which completes, 25
pages, on Node 22.18.

## contrib dependencies

Three of the four contrib packages have a `package.json` (`sandboxes` is
reference code, no manifest). `npm audit` found real advisories in two, all in
**dev** dependencies and all denial-of-service:

| package | advisory | resolution |
|---|---|---|
| codemirror-lang-elo | `brace-expansion` — seven DoS advisories, high | `npm audit fix` |
| codemirror-lang-elo | `diff` — DoS in parsePatch/applyPatch | mocha 11 → 12 |
| codemirror-lang-elo | `glob`, `minimatch` — DoS, moderate | `overrides` |
| vscode-elo | `minimatch` via `@vscode/vsce` — DoS, moderate | `overrides` |

`glob` and `minimatch` arrive through mocha 12 and `@vscode/vsce`, which both
still resolve to affected ranges — upgrading the top-level package does not
help, so both manifests carry an `overrides` block pinning `minimatch ^11.0.5`
and `glob ^14.0.4`. Both packages' own test suites still pass afterwards (35
mocha tests; 57 TextMate scopes), which is the only thing that makes an
override safe to leave in place.

`highlight.js` was already current at 11.12.0; its lock needed nothing.

**TypeScript was deliberately left at 5.9.3** in `codemirror-lang-elo` although
7.0.2 is out. It should move when the root compiler moves: a contrib package
compiling Elo's own grammar with a different major than the compiler is asking
for a divergence nobody is testing for. Worth its own task when TS 7 is
considered for the root.

All four of root, `web/`, `codemirror-lang-elo` and `vscode-elo` now report
`found 0 vulnerabilities`.

## State

No `src/` change. Unit 2308, integration 4243.
