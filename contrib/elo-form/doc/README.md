# elo-form documentation

Reference for using and adjusting elo-form. Written to be acted on directly: every option, token
and class name here is checked against the code by `npm test`.

| File | Read it to |
| --- | --- |
| [options.md](options.md) | Call `eloForm(source, options)`: every option, paths, labels, **units**, the form object and its result |
| [messages.md](messages.md) | Change or translate any built-in text |
| [server.md](server.md) | Split the work: a plan as JSON, the form as HTML, Elo's checks as a module, for a page with no Elo and no `eval` |
| `npm run demo`, then http://localhost:4173 | See the six integration modes live, each with its policy and its security profile; [../demo/server.mjs](../demo/server.mjs) and `demo/pages/*.js` are the code to copy |
| [security.md](security.md) | Take a schema you did not write, or run under a Content-Security-Policy |
| [css.md](css.md) | Restyle: the `--elo-*` tokens, where to set them, the DOM structure and class names, recipes |
| [../README.md](../README.md) | What the library does, which widget each Elo type becomes, known limits |

## Common tasks

| I want to… | Do this |
| --- | --- |
| Rename a field | `labels: { qty: 'Quantity' }` ([options.md](options.md#labels)) |
| Show a unit | `units: { unitPrice: '€', Percent: '%' }` ([options.md](options.md#units)) |
| Rename list items or alternatives | Name the type in the schema (`Line = {…}`), or change `messages` ([options.md](options.md#labels)) |
| Change a button text or an error | `messages: { add: '…', required: '…' }` ([messages.md](messages.md)) |
| Change colors, radius, spacing | Set `--elo-*` tokens on `:root` or a wrapper ([css.md](css.md#setting-tokens)) |
| Style one field | `.elo-form [data-elo-path=".shipTo.zip"] { --elo-control-width: 7em }` ([css.md](css.md#setting-tokens)) |
| Change layout | Write rules against the classes in [css.md](css.md#structure) |
| Ask for a JSON file for some part | `fallback: ({ path }) => path === '.lines'` ([options.md](options.md#fallback)) |
| Show a server's refusal on its field | `form.setProblems([{ path: '.qty', message }])` ([options.md](options.md#problems)) |
| Work under a strict Content-Security-Policy | `planForm`, `compileChecks`, `renderForm` ([server.md](server.md)) |
| Work with no JavaScript at all | `renderHtml(plan, { names: true })`, then `readPosted` ([server.md](server.md#writing-the-form-as-html)) |
| Pre-fill or edit a record | `value: record`, then `form.getRaw()` ([options.md](options.md#value)) |

## Where things are in the source

| File | Holds |
| --- | --- |
| `src/index.ts` | `eloForm`: schema, plan and in-page checks in one call |
| `src/planner.ts` | `planForm`, `compileChecks`: the entry `@enspirit/elo-form/plan` |
| `src/render.ts` | The entry `@enspirit/elo-form/render`: no Elo, no Luxon |
| `src/plan.ts` | The plan as JSON, reading its rules into hints, the `Checker` a form asks, dates without a library |
| `src/checks.ts` | Writing Elo's checks as a JavaScript module |
| `src/dom.ts` | `h()`, and the stand-in for a page that `renderHtml` and `readPosted` build into |
| `src/form.ts` | The `EloForm` class, `FormOptions`, validation flow, `renderForm`, `renderHtml`, `hydrateForm`, `readPosted` |
| `src/widgets.ts` | One class per widget; `make()` at the bottom maps Elo kinds to widgets; `WidgetOptions`; label and unit lookup |
| `src/schema.ts` | Reading a schema with Elo, turning it into a plan, compiling checks in the page |
| `src/messages.ts` | `Messages` and `defaultMessages` |
| `src/elo-form.css` | The token block, then the rules |
| `scripts/docs.mjs` | Regenerates the token and message tables in this folder (`npm run docs`) |
| `test/` | Behaviour tests, random-schema tests, hostile input (`hostile.test.mjs`), a page without `'unsafe-eval'` (`csp.test.mjs`), and `docs.test.mjs`, which fails when this folder and the code disagree |

## Keeping this folder true

- After changing `src/elo-form.css` or `src/messages.ts`: `npm run docs`.
- After adding an option: add a `### \`name\`` section and a summary row to `options.md`.
- `npm test` checks all three, and that no CSS rule bypasses the tokens.
