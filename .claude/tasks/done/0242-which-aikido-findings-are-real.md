# Which Aikido findings are real

> "Can you now check .claude/tasks/security/aikido_issues.csv and see whether
> some of them can be fixed?"

24 findings exported from aikido.dev (`.claude/tasks/security/aikido_issues.csv`),
scanned against `main`. Most are the scanner flagging the compiler for doing the
one thing a compiler does — turn text into code and run it — which is by design
and defended. The job was to separate those from the few that are real.

## Fixed

| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| 12 | high | 3rd-party GitHub Action not pinned (`ci.yml`) | `ruby/setup-ruby@v1` pinned to commit `b3aaceae` (v1.338.0); the mutable `@v1` tag can be repointed by a compromised upstream |
| 19, 20 | low | `actions/checkout` persists git credentials (`ci.yml`, `deploy-pages.yml`) | `persist-credentials: false` on both — neither workflow pushes, so the token need not linger in `.git/config` for a later step to read |
| 10, 11 | low | dangerous `assert` (python reference sandbox) | the `__main__` self-test used `assert`, which `python -O` strips; replaced with an explicit check that raises. Not sandbox security logic, but a reference example others copy should be robust |

## Already resolved by the dependency upgrade (same session)

| # | Sev | Finding |
|---|-----|---------|
| 21 | high | `@enspirit/elo` 0.9.14 in `web/package-lock.json` — CVE-2026-44265 |
| 22, 23 | critical | same — CVE-2026-44266 / 44267 |

The web lock pinned a published **0.9.14** of Elo itself (the versions these
CVEs were fixed in is 1.0.1). Upgrading Astro regenerated the lockfile, which
now links the local workspace (`"@enspirit/elo": "file:.."`, `"link": true`) —
no 0.9.14 pin remains. Both of the export's criticals fell out of that upgrade;
a re-scan clears them.

## Not present in current `main`

| # | Sev | Finding |
|---|-----|---------|
| 0, 1, 2 | low/med/low | "leaked secret" in `examples/formulas/password-strength/cases.elo` |

That file is not on `main` (it lives on an unmerged branch, commits
`4b6f59a`/`9b57b3a`, which are not ancestors of `main`). A stale scan; nothing
to fix here.

## False positives / by-design — suppress with a reason, do not "fix"

Each of these would require breaking the compiler's purpose to silence, so they
belong in an Aikido *ignore-with-reason*, not a code change.

- **#9, #13, #15, #16–18** — `eval` / `Function` (two rated critical). This is
  the compiler executing its **own** trusted compiled output (`formats.ts`,
  `compile.ts`, the ruby sandbox) or the playground running the **user's own**
  code in **their own** browser (`exercises_controller.ts`). It is the core of
  how Elo evaluates; the reference sandboxes wrap it in a forked process under
  `RLIMIT_CPU` / `RLIMIT_AS` plus a wall-clock reaper. #16–18 are already marked
  ignored.
- **#5–8** — path traversal in `eloc.ts` / `elo.ts`. The CLI reads the file
  whoever runs it names — the documented purpose of the `eloc`/`elo` tools
  ("they read the filesystem, as the tools of whoever runs them"). The library
  path (`loadProgram`, `parse()`) takes no loader and reads nothing.
- **#3, #4** — highlighter `innerHTML` XSS (`web/src/scripts/highlighter.ts`).
  False positive: every token's text passes through `escapeHtml`, and the class
  names are internal enum values, so no unescaped input reaches the DOM.
- **#14** — open redirect; already ignored.

## Net effect

The three criticals and one high are resolved (dependency upgrade); one more
high and two lows fixed here; the remaining four classes are by-design per
Elo's documented threat model and should be suppressed in Aikido with the
reasons above. No `src/` behaviour changed in this task — the fixes touch only
`.github/workflows/` and the python reference sandbox — so the test suite is
unaffected.

## Lesson

A SAST scanner reads a compiler as a pile of `eval` and file reads, because
that is literally what a compiler is. The signal is not "does it call `eval`"
but "**whose** code reaches the `eval`, and **whose** filesystem the read
touches." The threat-model table on the security page is the thing that answers
that, and it answered every by-design flag here — which is a small vote of
confidence in having written it down.
