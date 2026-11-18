# Options and API

```ts
import { eloForm } from '@enspirit/elo-form';

const form = eloForm(source, options);   // throws if the schema cannot be read
container.append(form.element);
```

- `source` is a string holding an Elo schema, in one of three shapes:
  - a bare type: `{ name: String, age: Int }`
  - definitions, optionally followed by the type to use:
    `Qty = Int(q | q > 0)⏎Order = { lines: [{ qty: Qty }] }`
  - a program: `let Person = { … } in _ |> Person`
- `options` is a plain object. Every key is optional. Only `labels`, `units`, `fallback`,
  `loader` and `onChange` may be functions; everything else is JSON.

## Paths

Several options address a place in the schema by **schema path**:

| Path | Means |
| --- | --- |
| `.` | the whole schema |
| `.customer` | attribute `customer` of the root tuple |
| `.shipTo.zip` | attribute `zip` inside attribute `shipTo` |
| `.lines.*` | every item of the list `lines` |
| `.lines.*.qty` | attribute `qty` of every item of `lines` |
| `.sizes.*` | every value of the dictionary `sizes` (`{ ...: Int }`) |

`*` stands for "any item" or "any free-named attribute". The alternatives of a union have the
path of the union itself. Each widget's root element carries its path as `data-elo-path`.

Paths in `problems` (see [Result](#result)) are **data paths** instead: they use real indexes and
names, as Elo reports them: `.lines.0.qty`.

## Summary

| Option | Type | Default | In short |
| --- | --- | --- | --- |
| [`type`](#type) | string | the applied or last type | Which definition the form is for |
| [`value`](#value) | JSON | none | Data to start from |
| [`title`](#title) | string | none | Heading; frames the form |
| [`labels`](#labels) | object or function | `{}` | Field labels |
| [`help`](#help) | object or function | `{}` | A sentence of help under a field |
| [`placeholders`](#placeholders) | object or function | `{}` | What an empty box shows |
| [`units`](#units) | object or function | `{}` | Units beside number and text boxes |
| [`messages`](#messages) | object | English | Every built-in text |
| [`guessFromNames`](#guessfromnames) | boolean | `true` | Input type from the attribute's name |
| [`datetimeOffset`](#datetimeoffset) | `'local'` \| `'utc'` \| `'none'` | `'local'` | How datetimes are written |
| [`fallback`](#fallback) | function | none | Where to ask for a JSON file instead |
| [`maxDepth`](#maxdepth) | number | `12` | Nesting beyond which JSON files are asked for |
| [`maxFields`](#maxfields) | number | `1500` | Widget count beyond which JSON files are asked for |
| [`name`](#name) | string | none | Hidden input mirroring the data |
| [`onChange`](#onchange) | function | none | Called after every change |
| [`loader`](#loader-and-file), [`file`](#loader-and-file) | function, string | none | Resolve `import … from` |
| [`checks`](#checks) | object | none | Elo's checks, compiled ahead of time |
| [`problems`](#problems) | array | none | Problems found elsewhere, shown on their fields |
| [`names`](#names) | boolean or function | none | `name` attributes, for a form that posts with no script |
| [`id`](#id) | string | `elo1`, `elo2`… | Prefix of every element id |
| [`notice`](#notice) | boolean | `true` in `eloForm` | Say when constraints are not checked here |

`type`, `loader` and `file` are about reading a schema: they belong to `eloForm`, `planForm` and
`compileChecks`. Everything else is about the form, and is also what `renderForm`, `renderHtml`,
`hydrateForm` and `readPosted` take. [server.md](server.md) is about those.

## Which type

### `type`

The name of the definition to build the form for.

Default: the type the program applies to its input (`_ |> Person`), else the last definition.
Ignored when the source is a bare type. An unknown name throws
`Unknown type 'X'. Defined here: A, B.`

```js
eloForm('Address = { city: String }\nPerson = { name: String, home: Address }', { type: 'Address' });
```

### `loader` and `file`

Passed to Elo to resolve `import { T } from './module'` lines. `loader(path, from)` returns
`{ id, source }` for the module an import names, where `from` is the id of the importing module;
`file` is the id of the schema source itself. Without a loader, a schema with imports throws.

```js
const sources = { './limits': 'Qty = Int(q | q > 0)' };
eloForm("import { Qty } from './limits'\nLine = { qty: Qty }", {
  loader: (path) => ({ id: path, source: sources[path] }),
});
```

## Data

### `value`

Data to load before the form is first shown: JSON as the schema would accept it (what an earlier
`getRaw()` returned, a record from an API). Same as calling `form.setValue(value)` afterwards.

Missing attributes leave their fields empty. Attributes the schema does not declare are dropped,
except in open tuples (`{ …, ... }`), which keep them and hand them back.

### `name`

Adds `<input type="hidden" name="…">` to the form element, kept equal to
`JSON.stringify(form.getRaw())`. For a plain HTML `<form>` post with no script of your own.

### `onChange`

`(form) => void`, called after every edit, `setValue` and `reset`. More listeners can be added
with `form.onChange(fn)`, and the element fires a bubbling `elo:change` event whose `detail` is
the [result](#result).

## Words

### `title`

A heading for the whole form. With a title, the form is drawn as a titled, bordered group;
without one, a tuple's fields are shown unframed.

### `labels`

Labels for tuple attributes. An object, looked up by schema path first, then by attribute name:

```js
labels: {
  qty: 'Quantity',               // every attribute named qty
  '.shipTo.zip': 'Postcode',     // this one only; wins over the line above
  '.lines.*.qty': 'How many',
}
```

Or a function `(path, key) => string | undefined`; returning `undefined` falls through to the
default.

Default: the attribute name, humanized: `placedOn`, `placed_on` and `placed-on` all give
"Placed on"; acronyms are kept (`customerID` gives "Customer ID").

What `labels` does **not** name:

| Text | Comes from | Change it with |
| --- | --- | --- |
| List item titles ("Line 1") and "Add line" | the item's type name, else the list's attribute name in the singular | naming the type in the schema; `messages.item`, `messages.add` |
| Alternatives of a choice ("Card", "Date") | the alternative's type name, else its attribute names, else `messages.kinds` | naming the type in the schema; `messages.kinds` |
| The heading | `title`, else the type's name | `title` |
| Hints and errors | the constraint (see the README) and `messages` | labelling the constraint in the schema; `messages` |

Every label element carries where its text came from in a `data-elo-from` attribute
(`options.labels.qty`, `options.labels[".shipTo.zip"]`, `attribute placedOn`, `type Line`,
`messages.kinds.date`, `options.title`).

### `help`

A sentence shown under a field, above its hint. Looked up like `labels`: by schema path, then by
attribute name; or a function `(path, key) => string | undefined`. It is part of the control's
accessible description.

```js
help: { '.due': 'When it has to be there.', qty: 'Whole boxes only.' }
```

### `placeholders`

What an empty text or number box shows. Same lookup as `help`. Not applied to checkboxes,
drop-downs or pickers.

### `units`

Units shown beside number boxes (`Int`, `Float`) and one-line text boxes (`String`).
**Display only**: the data produced is the bare number or text, unchanged.

```js
units: {
  Percent: '%',                                  // every field whose type is, or is built on, Percent
  unitPrice: '€',                                // every attribute named unitPrice
  '.parcel.weight': 'kg',                        // this one only
  shipping: '$',                                 // currency signs like $ £ ¥ go in front by themselves
  handle: { text: '@', position: 'before' },     // say where it goes
  Money: { text: '€', label: 'euros' },          // and how a screen reader should say it
  '.lines.*.unitPrice': null,                    // no unit here after all
}
```

A unit is a string, or `{ text, position?, label? }`:

| Key | Type | Default | |
| --- | --- | --- | --- |
| `text` | string | required | What is shown: `cm`, `%`, `€`, `km/h` |
| `position` | `'before'` \| `'after'` | `'before'` for `$ £ ¥ ₹ ₩ ₪ ₱` (alone or as `US$`), else `'after'` | Which side of the input |
| `label` | string | none | Spoken form, set as `aria-label` and tooltip |

Lookup order, first match wins:

1. schema path (`'.parcel.weight'`)
2. attribute name (`weight`)
3. type names, outermost first: for `Price = Money(m | m < 1000)`, `Price` then `Money`
4. the unit of the enclosing list, dictionary or choice. So `weights: 'kg'` on
   `weights: [Float]` puts kg on every item, and a unit on `Int|Null` or `Int|String` reaches the box.
   Attributes of a tuple do not inherit: name them by path or key.

`null` or `''` at steps 1 to 3 means "no unit" and stops the lookup.

Or a function `(path, key, types) => unit | null | undefined`, where `key` is `undefined` for
list items and `types` is the list of step 3; returning `undefined` goes on to step 4.

What a unit changes:

- An affix is attached to the input (`.elo-affixed` / `.elo-affix`, see [css.md](css.md)).
- Hints and errors read from constraints speak in the unit: `Float(p | p >= 0 and p <= 100)`
  with `%` gives "Must be at least 0% and at most 100%."; with `kg`, "at least 0 kg".
  (No space before `%`, `‰`, `°`; a non-breaking space otherwise; `$20`, `EUR 20` in front.)
- The unit is part of the input's accessible description.

What it does not change: the value, the options of a drop-down, multi-line text boxes, and any
kind other than `String`, `Int` and `Float`. There is no conversion (typing 20 with unit `%`
yields 20, not 0.2); if the schema stores a fraction, say so in the label instead.

### `messages`

Any of the built-in texts, as a partial object merged over the defaults at any depth:

```js
messages: {
  optional: 'facultatif',
  required: 'Ce champ est obligatoire.',
  kinds: { date: 'Une date' },
  phrases: { cmp: { number: { '>=': 'être au moins {x}' } } },
}
```

[messages.md](messages.md) lists every key with its default and placeholders.

### `guessFromNames`

When `true` (default), a `String` attribute's name picks a friendlier input. It never changes
the data or what is valid.

| Name matches | Input |
| --- | --- |
| contains `email` or `e-mail` | `type="email"` |
| ends with `url`, `website`, `homepage`, `link` | `type="url"` |
| contains `phone` or `mobile`, or is `tel` | `type="tel"` |
| contains `password`, `passwd`, `secret` | `type="password"` |
| ends with `description`, `note(s)`, `comment(s)`, `message`, `body`, `bio`, `summary`, `content`, `remark(s)` | multi-line `<textarea>` |

List items use the singular of the list's name (`emails: [String]` gives email inputs).
Independently of this option, a `String` whose constraint allows more than 120 characters is
multi-line.

## Shape and limits

### `datetimeOffset`

How a `Datetime` is written into the data. The picker always shows wall-clock time.

| Value | Output | Picker shows |
| --- | --- | --- |
| `'local'` (default) | `2026-11-17T09:00:00+01:00` | the viewer's local time |
| `'utc'` | `2026-11-17T08:00:00Z` | the viewer's local time |
| `'none'` | `2026-11-17T09:00:00` | the time as written, no zone involved |

### `fallback`

`({ path, kind, alias, depth }) => boolean`. Return `true` to ask for a JSON file at that place
instead of building widgets. The file is checked against the type it stands in for, and problems
inside it are reported with their location (`In 0.qty: …`).

- `path`: schema path (see [Paths](#paths))
- `kind`: `'tuple'`, `'array'`, `'union'`, `'string'`, `'int'`, `'float'`, `'bool'`, `'date'`,
  `'datetime'`, `'duration'`, `'null'`, `'any'`, `'data'`
- `alias`: the type's name, if it has one
- `depth`: nesting level, 0 at the root

```js
fallback: ({ path }) => path === '.',                    // the whole form is one JSON file
fallback: ({ path }) => path === '.lines',               // only the lines
fallback: ({ alias }) => alias === 'GeoJson',            // every use of a type
fallback: ({ kind, depth }) => kind === 'array' && depth >= 2,
```

Without this option, a JSON file is asked for only where the schema says `.` or `Data` (as one
choice beside Text, Number, Yes / No and Nothing), or when `maxDepth` / `maxFields` is exceeded.

### `maxDepth`

Tuples, lists and choices nested deeper than this are asked for as JSON files. Default `12`.

### `maxFields`

Once this many widgets have been built, the remaining tuples, lists and choices are asked for
as JSON files, so a pathological schema cannot build a million inputs. Default `1500`. List
items and alternatives are built when they are added or chosen and count then.

## Checking and posting

### `checks`

Elo's checks for this form, compiled ahead of time: what the module written by `compileChecks`
exports (see [server.md](server.md#checks)). With them a form made by `renderForm` or
`hydrateForm` enforces every constraint without evaluating anything in the page; without them
such a form enforces none, and `result.enforced` is `false`. Given to `eloForm`, they replace the
checks it would compile itself.

### `problems`

`{ path, message, kind?, label? }[]`: problems found elsewhere — by the server the data was sent
to — shown on the field at each `path` (a data path, `.lines.0.qty`) from the start. An error
thrown by Elo has exactly these four keys: pass it as caught, and a failed constraint
(`kind: 'constraint'`) is said the way the field's own hint says it — "Must be greater than 0." —
where Elo's message is only "constraint failed". Same as calling
`form.setProblems(problems)` afterwards. In `renderHtml` this is how a refused form is sent back.

### `names`

Gives each plain field a `name`, so that the form posts inside an HTML `<form>` with no script.
`true` names a field after its place in the data, without the leading dot: `customer.name`. A
function `(path) => string | undefined` decides, and is the only way to name a form that is a
single value (path `.`).

Named: text, numbers, yes / no, dates, datetimes, and drop-downs of those, wherever their place in
the data is fixed. Not named, and so not posted without a script: anything inside a list, a choice
or free-named fields, durations, and JSON files. An unticked checkbox posts `false` (a hidden
input before it), a ticked one `false` then `true`: the last value is the one that counts.
`readPosted` reads such a post back ([server.md](server.md#reading-a-post)).

### `id`

Prefix of every element id in the form. Default `elo1`, `elo2`… in a page, counting forms, and
`elo` in `renderHtml`. Give one when two forms made apart must not collide.

### `notice`

Show `messages.unchecked` above the form when constraints are not checked here. `eloForm` turns it
on, because a page that carries Elo expects its rules to run; the others leave it off, because a
form made from a plan without `checks` has decided that somebody else checks.

## The form object

| Member | |
| --- | --- |
| `element` | The root `<div class="elo-form">`. Append it where the form should appear. |
| `getRaw()` | The data as plain JSON, right now. Required values not yet given are simply absent. |
| `result` | The current [result](#result), without changing what is shown. |
| `validate({ focus })` | Checks everything, **shows every problem**, returns the result. `focus: true` moves to the first field that needs attention. Call it from your submit handler. |
| `setValue(json)` | Loads data, replacing what is there. |
| `reset()` | Empties the form and hides the problems shown so far. |
| `onChange(fn)` | Adds a listener; returns a function that removes it. |
| `setProblems(problems)` | Shows problems found elsewhere on their fields, each until its field is next edited. Returns those with no field to go on. `[]` clears them. They do not change `result`. |
| `plan` | The [plan](server.md#the-plan) the widgets were built from. |
| `schema` | The parsed schema. Only on a form made by `eloForm`. |

Problems are shown on a field once the person has been in it, and everywhere after `validate()`.

### Result

```ts
{
  valid: boolean,      // true exactly when Elo accepts the data: raw |> Type
  raw: unknown,        // the data as JSON: send this
  value?: unknown,     // what Elo's JavaScript target reads from it (Luxon DateTime / Duration); only when valid
  problems: { path: string, message: string }[],   // data paths: '.lines.0.qty'
  enforced: boolean,   // false when nothing checks constraints here (see security.md and server.md)
}
```

## Recipes

Submit with your own button:

```js
button.onclick = () => {
  const { valid, raw } = form.validate({ focus: true });
  if (valid) fetch('/orders', { method: 'POST', body: JSON.stringify(raw) });
};
```

Plain HTML form post:

```html
<form method="post" action="/orders"><div id="slot"></div><button>Save</button></form>
<script type="module">
  const form = eloForm(schema, { name: 'order' });
  slot.append(form.element);
  slot.closest('form').onsubmit = (e) => { if (!form.validate({ focus: true }).valid) e.preventDefault(); };
</script>
```

Edit an existing record: `eloForm(schema, { value: record })`, then send `form.getRaw()`.

A translated form with units:

```js
eloForm(schema, {
  title: 'Nouvelle commande',
  labels: { qty: 'Quantité', unitPrice: 'Prix unitaire' },
  units: { unitPrice: '€', Percent: '%' },
  messages: { optional: 'facultatif', required: 'Ce champ est obligatoire.', add: 'Ajouter {item}' },
});
```
