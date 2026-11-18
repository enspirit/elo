# elo-form

Turns an [Elo](https://elo-lang.org) type schema into an HTML form.

```sh
npm install @enspirit/elo-form @enspirit/elo luxon
```

```js
import { eloForm } from '@enspirit/elo-form';
import '@enspirit/elo-form/elo-form.css';

const form = eloForm(`
  Qty   = Int(q | q > 0)
  Order = { customer: String, placedOn: Date, lines: [{ product: String, qty: Qty }], notes :? String }
`);
document.querySelector('#slot').append(form.element);

saveButton.onclick = () => {
  const { valid, raw, value } = form.validate({ focus: true });
  if (valid) send(raw);          // raw: plain JSON, ready for `raw |> Order` on any Elo target
};                               // value: what Elo's JavaScript target makes of it (Luxon dates and durations)
```

Without a bundler, `dist/elo-form.standalone.js` defines a global `EloForm` with Elo and Luxon inside:
`EloForm.eloForm(source)`. It is what `unpkg.com/@enspirit/elo-form` serves. In this repository,
`npm run build` also makes `dist/playground.html`, a page to try schemas in.

## What every type becomes

| Elo type | Widget | JSON produced |
| --- | --- | --- |
| `String` | text box; multi-line when long | `"…"` |
| `Int`, `Float` | number box | number |
| `Bool` | checkbox; yes / no / not specified when it may be empty | `true` / `false` |
| `Date` | date picker | `"2026-11-17"` |
| `Datetime` | date and time picker | `"2026-11-17T09:00:00+01:00"` |
| `Duration` | days, hours, minutes (more units on demand) | `"P1DT12H"` |
| `Null` | a note that there is nothing to fill in | `null` |
| `{ a: T, b :? U }` | a group of fields; `:?` fields are marked optional and left out when empty | object |
| `{ …, ... }` | the declared fields; other attributes of loaded data are kept | object |
| `{ …, ...: T }` | the declared fields, plus rows of name + `T` | object |
| `[T]` | a list with add, remove, move up and down | array |
| `T\|Null` | the widget for `T`, which may be left empty | value or `null` |
| `Int\|Float` | one number box | number |
| `Int\|String` (String last) | one text box; Elo reads `42` as the Int | string |
| any other union | a choice between the alternatives, each with its own widget | whatever the chosen one produces |
| `T(x \| …)` | the widget for `T`; the constraint is shown as a hint and enforced | — |
| `.` and `Data` | Nothing, Text, Number, Yes / No, or a JSON file | any JSON |
| a named type | whatever it stands for; its name labels list items and alternatives | — |

Elo has no recursive types, so every schema is a finite tree and every node of it lands in one row of
this table. The JSON file appears on its own only for `.` and `Data`, where the schema says nothing
about shape. Elsewhere it is used when you ask for it (`fallback`), or when a form would be absurdly
large (`maxFields`, `maxDepth`). An uploaded file is checked against the type of the part it replaces.

## Validation is Elo's

The form never re-implements a rule. Each node is checked by compiling its own type with
`@enspirit/elo` and running it, and the final verdict is `raw |> Type` on the whole value, so
`valid` is true exactly when Elo accepts the data.

Constraints are also read, where they are simple, to make the form friendlier. This is cosmetic:
a constraint the reader does not understand is still enforced.

- `i > 0`, `d >= TODAY`, `i in 1..10`, `length(s) <= 80`, `not isEmpty(s)`: a hint ("Must be at least 1 and
  at most 10."), `maxlength`, picker bounds.
- `s == 'a' or s == 'b'`, `contains(['a', 'b'], s)`: a drop-down of those values.
- A label with spaces (`'must be 18 or older': a >= 18`) is shown as written. A one-word label
  (`positive: …`) becomes "Must be positive." when the condition itself cannot be read.
- Anything else is shown as its Elo source: "Must satisfy: startsWith(c, 'X')".

Constraints across fields (`Span(s | s.to > s.from)`) are reported on the group, once its fields are right.
Where a union's earlier alternative would accept what was entered under a later one, the form says which
one Elo will pick.

## Options

```js
eloForm(source, {
  type: 'Order',              // which definition; default: the one the source applies, else the last
  value: {...},               // data to start from
  title: 'New order',         // heading; without one a tuple's fields are shown unframed
  name: 'payload',            // also mirror the JSON into <input type="hidden" name="payload">
  labels: { qty: 'Quantity', '.lines.*.qty': 'How many' },   // or (path, key) => string
  units: { unitPrice: '€', Percent: '%', '.parcel.weight': 'kg' },   // by key, type name or path
  messages: { required: 'Ce champ est obligatoire.' },        // any text of src/messages.ts
  fallback: ({ path, kind, alias, depth }) => path === '.lines',  // ask for a JSON file there
  maxFields: 1500, maxDepth: 12,                               // beyond these, JSON files
  datetimeOffset: 'local',    // 'local' (+01:00), 'utc' (Z) or 'none' (bare wall-clock time)
  guessFromNames: true,       // email/url/phone/password inputs and text areas from field names
  loader, file,               // as for Elo's compile(), to resolve `import … from`
  onChange: (form) => {},
});
```

`source` may be a bare type (`{ name: String }`), a list of definitions (optionally ending with the type
to use), or a whole program (`let Person = {…} in _ |> Person`).

The form object: `element`, `getRaw()`, `result` (`{ valid, raw, value, problems, enforced }`),
`validate({ focus })` (reveals every problem, as a submit button should), `setValue(json)`, `reset()`,
`onChange(fn)`. The element also fires `elo:change`. Problems appear on a field once it has been
visited, and all at once after `validate()`.

Where a label comes from: `labels` in the options when it names the field (by schema path, then by key),
otherwise the attribute name (`placedOn` → "Placed on"). List items and union alternatives are named after
their type (`Line 1`), else after the attribute or a built-in text from `messages`. Every label element
carries that origin in a `data-elo-from` attribute (`options.labels.qty`, `attribute placedOn`, `type Line`,
`messages.kinds.date`…), which the playground displays.

Units (`units`) are display only: they sit beside the input and appear in hints and errors
("Must be at most 100%."), and the data stays the bare number.

Styling: every color, size, radius and spacing in `elo-form.css` is a `--elo-*` token with a default.
Set tokens on `:root`, a wrapper, the form, or one field (`[data-elo-path=".shipTo.zip"]`); no
`!important` needed. Default colors are mixed from the page's text color, so an unstyled form follows
its page into dark mode.

Full reference, written so that a person or an agent can act on it directly:

- [doc/options.md](doc/options.md): every option, paths, labels, units, the form object
- [doc/messages.md](doc/messages.md): every built-in text and how constraint sentences are built
- [doc/css.md](doc/css.md): the tokens, where to set them, the DOM structure and class names, recipes
- [doc/security.md](doc/security.md): what a schema you did not write can do, and Content-Security-Policy

## Limits worth knowing

- **Empty means absent.** An optional or nullable `String` left empty is left out (or null), never `""`;
  an optional or nullable list with no items likewise. Required ones give `""` and `[]`.
- **Datetimes** are picked in the viewer's own time zone, to the minute (seconds are kept when loaded
  data has them). The repeated hour when clocks go back cannot be told apart.
- **Durations** are whole, non-negative amounts per unit (seconds may have decimals), which is the one
  spelling all Elo targets read.
- **Loading data Elo refuses** into a union is a best guess at the alternative that was meant.
- **A strict Content-Security-Policy** without `'unsafe-eval'` stops Elo's compiled checks from running,
  as it does for Elo's own `compile()`. The form then still builds and produces well-shaped JSON, shows
  a notice, and reports `enforced: false`: constraints are not checked. [doc/security.md](doc/security.md)
  says what still holds and how to validate all the same.
- **The browser's verdict is a courtesy.** Whatever receives the data runs `raw |> Type` again.
- Built and tested against `@enspirit/elo` 1.2.4, and declared as a peer for 1.2.x only: it reads Elo's
  AST (`parseTypeExpr`, the type nodes), which may change from one minor version to the next.

One thing learned on the way: Elo's JavaScript target accepts a *missing* required attribute when its
type is `.` or `Data` (`{} |> { a: . }` succeeds). The form mirrors that: such a field can be set to
"Nothing".

## Development

```sh
npm install
npm run build       # dist/: ES module, standalone script, CSS, playground.html, types
npm test            # behaviour, 3000 random schemas checked against Elo's own verdicts, hostile input, CSP, docs
npm run docs        # refresh the generated tables in doc/ after changing the CSS tokens or messages
```

`src/schema.ts` reads schemas and runs Elo; `src/widgets.ts` is the type-to-widget mapping (`make()` at
the bottom is the whole table above); `src/form.ts` ties them together.
