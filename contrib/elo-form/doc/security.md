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

- The form builds and works. It shows a notice (`messages.unchecked`), and every result has
  `enforced: false`.
- **Still guaranteed**, because the widgets need no evaluation for it: the shape of the JSON,
  required fields, numbers and dates that can be read, and what constraints written with literals
  say: hints ("Must be greater than 0."), `maxlength`, drop-downs of the listed values.
- **Not checked**: every constraint. `Int(q | q > 0)` accepts `-5`. `valid` then means "well
  shaped", no longer "Elo accepts it". Bounds that have to be computed (`d >= TODAY`) still read
  as hints but do not limit the date picker.

### Validating all the same

**On the server**, always (see above). It answers with Elo's error, which carries a `path`
(`.lines.0.qty`) to show the message next to the right field.

**In the browser, with a check compiled ahead of time.** What a policy forbids is turning text
into code in the page. Elo can do that at build time instead, and the result is an ordinary
script, served like the rest of your code:

```sh
# order.elo: the schema, then the type applied to the input
#   Qty   = Int(q | q > 0)
#   Order = { customer: String, qty: Qty }
#   _ |> Order
{ echo "import { DateTime, Duration, Interval } from 'luxon';"
  echo "export default $(npx eloc -t js order.elo)"; } > order.check.js
```

```js
import checkOrder from './order.check.js';

const result = form.validate({ focus: true });
if (!result.valid) return;
if (!result.enforced) {
  // The page could not run Elo's checks: run the ones compiled at build time.
  try { checkOrder(result.raw); }
  catch (e) { return show(e.message); }    // ".qty: constraint failed", with e.path and e.kind
}
send(result.raw);
```

The form and the compiled check must be built from the same schema text. The form itself does not
show these errors on its fields: on such a page, that part is yours.
