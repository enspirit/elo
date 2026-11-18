# Security and Content-Security-Policy

What a form does with the three things it is given (a schema, data, options), what a schema you
did not write can and cannot do, and what is left on a page whose policy forbids evaluating code.
The claims below that can be tested are, in `test/hostile.test.mjs` and `test/csp.test.mjs`.

## What a form does with its inputs

**Everything becomes text.** The DOM is built with `createElement`, `setAttribute` on a fixed list
of attribute names, and text nodes. There is no `innerHTML`, no inline style, no inline event
handler, and no element that takes a URL (`href`, `src`, `action`). A field name, a type name, a
constraint label, a string in a constraint, a unit, a message, a value loaded with `setValue`, the
name of an uploaded file: each is shown as written, markup included, and none of it is parsed.

**Constraints are run by Elo, and only by Elo.** To check a value, the form hands the type to
`@enspirit/elo`, which compiles it to JavaScript, and runs the result with `new Function`. This is
the only place a schema turns into code, and what that code can do is Elo's promise, not this
library's: an Elo expression has no access to the page, the network, storage or the host's objects
(see [elo-lang.org/security](https://elo-lang.org/security)). The form adds nothing to the compiled
program but two fixed names.

**Data is data.** Keys such as `__proto__` and `constructor` are stored and read as ordinary
keys, in the form as in Elo. An uploaded or pasted file goes through `JSON.parse` and nowhere else.

## If you did not write the schema

A form builder, a tenant's configuration, a schema fetched from somewhere: the schema is then
somebody else's program. It cannot inject markup or script, and it cannot reach outside Elo. What
it can still do:

| It can | Because | What to do |
| --- | --- | --- |
| Say anything | Labels, hints and error texts come from field names and constraint labels | Show whose form this is, outside the form |
| Ask for anything | A field named `email` or `phone` gets the matching input type and `autocomplete`, so the browser offers to fill it in | `guessFromNames: false` |
| Take time | Elo does not bound how long an expression runs, and checks run on the page's main thread at every change | Cap the size of the schema text you accept; Elo's own advice is to run untrusted code under a time limit, which a page cannot do |
| Fail to build | A schema can be wrong, or refused by Elo | Catch what `eloForm()` throws |
| Read files, if you let it | `import … from` goes through the `loader` you pass | Pass no `loader` for a schema you did not write |

Where the data goes once the form is filled in is decided by your page, never by the schema.

## Check again on the server

A form runs in the browser of the person filling it in, who can change anything in it. `valid` is
a courtesy to them. Whatever receives the data has to run `raw |> Type` itself, on any Elo target.
That is the check that counts, and it is the one a strict policy leaves untouched.

## Content-Security-Policy

What the library needs from a policy:

| Directive | Needs | Why |
| --- | --- | --- |
| `script-src` | `'unsafe-eval'`, for constraints to be checked in the browser | Elo's compiled checks are run with `new Function` |
| `style-src` | nothing beyond wherever you serve `elo-form.css` from | No inline styles, no `style` attributes |
| everything else | nothing | No network request, image, font, frame or worker |

`'unsafe-inline'`, nonces and hashes play no part: the library adds no script or style element.
Under Trusted Types, building the form touches no HTML sink; `new Function` on a string is a
script sink, so treat such a page as one without `'unsafe-eval'` unless you have decided otherwise
with a policy of your own.

### Without `'unsafe-eval'`

The form finds out by trying once, when the first form is built. The browser logs that attempt and
sends it to your `report-uri` if you have one: one report per page load, which you can ignore.

From then on:

- The form builds and works. A form made by `eloForm` shows a notice (`messages.unchecked`), and
  every result has `enforced: false`.
- **Still guaranteed**, because the widgets need no evaluation for it: the shape of the JSON,
  required fields, numbers and dates that can be read, and what constraints written with literals
  say: hints ("Must be greater than 0."), `maxlength`, drop-downs of the listed values.
- **Not checked**: every constraint. `Int(q | q > 0)` accepts `-5`. `valid` then means "well
  shaped", no longer "Elo accepts it". A bound that has to be computed (`d >= D2026-01-01 + P1D`)
  is not read at all: it is shown as its Elo source and does not limit the picker. Literals, `TODAY`
  and `NOW` need no computing and still do.

### Validating all the same

**On the server**, always (see above). It answers with Elo's error, which carries a `path`
(`.lines.0.qty`): hand it to `form.setProblems([{ path, message }])` and the message shows next to
the right field.

**In the browser, with the checks compiled ahead of time.** What a policy forbids is turning text
into code in the page. `compileChecks(source)` does it where the schema is read instead — at build
time, or on a server — and writes Elo's checks out as a JavaScript module, served like the rest of
your code:

```js
import { planForm, compileChecks } from '@enspirit/elo-form/plan';       // build time, or a server
writeFileSync('order.plan.json', JSON.stringify(planForm(source)));
writeFileSync('order.checks.js', compileChecks(source));
```

```js
import { renderForm } from '@enspirit/elo-form/render';                  // the page: no Elo, no eval
import checksFor from './order.checks.js';
import { DateTime, Duration, Interval } from 'luxon';

const form = renderForm(plan, { checks: checksFor({ DateTime, Duration, Interval }) });
form.result.enforced;   // true: every constraint is checked, on its field, as it is typed
```

[server.md](server.md) has the whole of it, including forms sent as HTML that work with no script.

## Reading and compiling a schema you did not write, on a server

`planForm` **reads**: with `evaluate` left off it parses the schema and executes nothing of it, so
its cost is the parser's and a hostile schema has nothing to run. Cap the size of what you accept,
and `maxNodes` caps what a small schema can expand into.

`compileChecks` **compiles** and does not run either: its result is text. Running is what the page
that loads the module does, on the main thread of whoever is filling the form in, with the page's
own origin. What that code can do is Elo's promise (see above), not a boundary this library adds:
if a schema's author and the form's reader are different people, decide whether that promise is
enough for your page before serving them, or serve none and let the server refuse.

`readPosted` runs nothing unless you give it `checks`.
