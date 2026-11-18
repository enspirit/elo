# Plans, HTML and compiled checks

`eloForm(source)` does everything in the page: it reads the schema with Elo, builds the form, and
compiles Elo's checks with `new Function`. That takes Elo and Luxon in the browser, and a
Content-Security-Policy that allows `'unsafe-eval'`.

The same three steps are also available apart, so that a server does the reading and compiling
and a page only builds:

| Step | Function | From | Needs |
| --- | --- | --- | --- |
| Read the schema | `planForm(source)` → a plan, plain JSON | `@enspirit/elo-form/plan` | Elo, Luxon. No page. Runs nothing of the schema. |
| Compile the checks | `compileChecks(source)` → a JavaScript module, as text | `@enspirit/elo-form/plan` | Elo. No page. |
| Write the form | `renderHtml(plan, options)` → HTML text | `@enspirit/elo-form/render` | Nothing. |
| Read a post | `readPosted(plan, posted, options)` → a result | `@enspirit/elo-form/render` | Nothing. |
| Build the form | `renderForm(plan, options)`, `hydrateForm(target, plan, options)` | `@enspirit/elo-form/render` | A page. Neither Elo nor Luxon; evaluates nothing. |

A working example of every row, over HTTP, is [../demo/server.mjs](../demo/server.mjs) with the
pages in `demo/pages/`: `npm run demo`.

`@enspirit/elo-form/render` imports nothing. Its options are those of [options.md](options.md),
minus the three about reading a schema.

## The plan

```js
import { planForm } from '@enspirit/elo-form/plan';

const plan = planForm(`
  Qty   = Int(q | q > 0)
  Order = { customer: String, qty: Qty, due: Date(d | d >= TODAY) }`);
// { version: 1, name: 'Order', root: { kind: 'tuple', id: 1, rules: [], props: [ … ] } }
```

A plan is a tree of nodes. It holds no syntax tree and no code: `JSON.stringify` it, store it,
send it.

| Key of a node | |
| --- | --- |
| `kind` | `string`, `int`, `float`, `bool`, `null`, `date`, `datetime`, `duration`, `any`, `data`, `tuple`, `array`, `union`, or `json` (ask for a file) |
| `id` | What the compiled checks know this position's type by |
| `alias`, `aliases` | The type names it was written as, outermost first |
| `rules` | Its constraints, innermost first: `{ id, label?, atoms, source? }` |
| `props`, `extras` | Of a tuple: `{ key, optional, node }[]`, and `'closed'`, `'ignored'` or a node |
| `element` | Of a list |
| `alts` | Of a union |

A rule's `atoms` hold one entry per `and`-ed condition: what a form can use of it, or `null`.
`{ a: 'cmp', op: '>', x: { t: 'number', v: 0 } }`, `{ a: 'length', op: '<=', n: 80 }`,
`{ a: 'filled' }`, `{ a: 'oneOf', values: ['S', 'M'] }`. Hints, drop-downs, `maxlength` and picker
bounds are made from them, in the language of the `messages` the form is given: a plan has no
language.

| Option of `planForm` | Default | |
| --- | --- | --- |
| `type`, `loader`, `file` | | As for `eloForm` ([options.md](options.md#which-type)) |
| `evaluate` | `false` | Work out constants that are not literals (`D2026-01-01 + P1D`, `2 * 5`) by running them. Off, numbers, texts, dates, durations, `TODAY` and `NOW` are read as written and **nothing of the schema is executed**; a condition on any other constant is still enforced by the checks, and shown as its Elo source. |
| `maxNodes` | `5000` | A plan is a tree: a type used in two places is written out twice. Past this many tuples, lists and unions, the rest is asked for as JSON files. |

`TODAY` and `NOW` are kept as such in the plan and worked out by the page, on the reader's clock.

## Checks

```js
import { compileChecks } from '@enspirit/elo-form/plan';

writeFileSync('order.checks.js', compileChecks(source));
```

The module holds Elo's own compiled output — one program per group of definitions, returning one
function per type the form asks about — and a table from the ids of the plan to those functions.
The source and the options (`type`, `loader`, `evaluate`, `maxNodes`) must be those the plan was
made with: that is what makes the ids agree.

Elo's output needs Luxon when it runs. Two ways to give it:

```js
// format: 'factory' (default): the page hands Luxon over
import checksFor from './order.checks.js';
import { DateTime, Duration, Interval } from 'luxon';
const form = renderForm(plan, { checks: checksFor({ DateTime, Duration, Interval }) });

// format: 'module': the module imports it, from wherever `luxon` says (default 'luxon')
compileChecks(source, { format: 'module', luxon: '/vendor/luxon.js' });
import checks from './order.checks.js';
const form = renderForm(plan, { checks });
```

A script loaded from a file is not `eval`: this works under a policy without `'unsafe-eval'`, and
`result.enforced` is `true`. What the functions can do is what Elo's compiled code can do; see
[security.md](security.md).

Checks may be loaded after the form is on screen: build it without, and replace it with
`hydrateForm(form.element, plan, { ...options, checks, value: form.getRaw() })` when they arrive.

### In a worker

The module of checks is the schema's constraints as JavaScript. Loaded by the page, it runs with
the page. For a schema you did not write, let a worker load it instead:

```js
import { renderForm, workerChecks } from '@enspirit/elo-form/render';

const worker = new Worker('/lib/elo-form.worker.js', { type: 'module' });   // '@enspirit/elo-form/worker'
const checks = await workerChecks(worker, { checks: '/order/checks.js' }).catch(() => undefined);
const form = renderForm(plan, { checks });

button.onclick = async () => {
  const { valid } = await form.validated({ focus: true });
  if (valid) send(form.getRaw());
};
```

- The checks must be written with `format: 'module'`: the worker imports them, and they import Luxon.
- **Answers come later.** The form asks, shows nothing wrong yet, and says it again when the
  worker answers: `onChange` listeners are called then too. Meanwhile `result.pending` is `true`
  and `result.valid` is `false`. `await form.validated()` is `validate()` once everything is
  answered. `result.value` is never set: what Elo made of the data stays in the worker.
- **Serve the worker's script with a policy of its own**: `Content-Security-Policy: default-src
  'none'; script-src 'self'`. A worker obeys the headers its script came with, not the page's.
  With these it can import the checks and Luxon from your origin, and fetch nothing. The page's
  policy needs `worker-src 'self'`.
- `timeout` (default 2000 ms): a round of questions not answered by then terminates the worker.
  The form goes on with `result.enforced` false, and the server decides. `loadTimeout` (default
  10000 ms) bounds loading the checks; `workerChecks` rejects when they cannot be loaded.
- A form that has no value yet for a choice between alternatives (`A|B`) picks the alternative by
  shape when data is loaded into it, since Elo's answer is not there yet.

## Writing the form as HTML

```js
import { renderHtml } from '@enspirit/elo-form/render';

const html = renderHtml(plan, { names: true, value, labels, messages });
// <form method="get" action="/orders">${html}<button>Send</button></form>
```

The HTML is what `renderForm` would have built with the same plan and options, written out by the
same code. With [`names`](options.md#names) its plain fields post by themselves. Buttons that need
a script — add an item, pick another alternative — are there and do nothing until the page takes
over; a schema with lists or choices needs the script to be filled in completely.

To send a refused form back, give what was posted as `value` and what was wrong as
[`problems`](options.md#problems).

## Reading a post

```js
import { readPosted } from '@enspirit/elo-form/render';

const { raw, problems } = readPosted(plan, new URL(request.url).searchParams, { names: true });
```

`posted` is anything that iterates `[name, value]` pairs: `URLSearchParams`, `FormData`. The
fields are read back the way the form reads them: a number as a number, an empty optional box as
absent, an unticked checkbox as `false`. What cannot be read is handed on as typed (`"many"` for a
number), so that Elo refuses it in its own words. `options` must be those the form was rendered
with; `value` supplies what a plain form cannot post (lists, choices).

`raw` is then what to give the schema: `raw |> Type`. `problems` holds only what the form itself
can tell — a required field left empty, a number that is not one — unless `checks` are given.

## Taking the HTML over in the page

```js
import { hydrateForm } from '@enspirit/elo-form/render';

const form = hydrateForm(document.querySelector('#order'), plan, { names: true, value, labels, messages, checks });
```

`target` is the `.elo-form` element or something that holds it. The live form is built from the
same plan and options, takes what was already typed into the named fields, and replaces the HTML.
From there it is the form object of [options.md](options.md#the-form-object).
