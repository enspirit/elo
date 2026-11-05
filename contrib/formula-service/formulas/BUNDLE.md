# The formula bundle

A **formula bundle** is a directory holding one formula: its code, its
documentation, its cases, and the little that none of those can say. It is the
unit a catalogue lists, a form is built from, a web service wraps, and a test
run checks.

```
iban/
  types.elo       # Input and Output: the data it takes, the data it answers
  formula.elo     # the documentation and the formula
  fields.elo      # the input form, as data
  cases.elo       # the cases, as data
  bundle.json     # the metadata
```

Five files, and the directory name is the formula's identifier.

| File | Written by | Held to |
| --- | --- | --- |
| `types.elo` | hand | the cases, running on three targets |
| `formula.elo` | hand | the cases |
| `fields.elo` | generated, then labelled | `Input`, key by key |
| `cases.elo` | hand | the formula, running on three targets |
| `bundle.json` | hand | nothing — there is nothing in it to check |

`bundle.json` is the one file that is not Elo, and the reason is the catalogue
index: listing a thousand formulas means reading a thousand names, versions and
tags, which is a plain parse. Everything a formula *means* needs Elo to read it
anyway, so the rest is Elo.

## The one rule

**Nothing may be stated twice unchecked.**

Everything a formula *means* — the fields, their types, what makes a value
acceptable, the computation — is in the Elo source, because that is the only
copy that is executed. `bundle.json` carries only what no source could say: a
version, a licence, a tag.

`fields.elo` is the one file that deliberately repeats part of a type, and it
earns that by being **generated and then checked**. A form builder should not
have to walk an AST to put a number field on a page, so the form is written
down as data — and the lint re-derives it from `Input` and refuses the bundle
if the two disagree, down to the name of every constraint. Generated, checked,
and so unable to drift: that is a different thing from stated twice and hoped
about.

## `types.elo`

The data, declared on its own, as the module Elo already has for exactly this:

```elo
Input = {
  iban: String(s | notBlank: !isBlank(s))
}

Output = {
  valid: Bool,
  country: String|Null,
  formatted: String|Null
}
```

- **`Input`** is the schema of what the formula takes — the fields, their types
  and what makes a value acceptable. It is the form.
- **`Output`** is the shape of what it answers: the half of the promise a
  caller writes code against. It is *applied*, not merely declared (see
  below), which is what keeps it true.
- Other types may be declared beside them, which either is free to be built
  from — a `Tier`, a `Money`, a shared `Zone`.

A type prelude and no expression is a valid `.elo` file, so this is an ordinary
module: `import { Input, Output } from './types'`. It being its own file is
what lets a catalogue build a form, or a client generate a type, **without
reading the formula at all** — and what lets two formulas share one schema
without one of them importing the other's code.

## `formula.elo`

```elo
# Is this a valid IBAN?
#
# ISO 13616: move the first four characters to the end, replace each letter by
# its position in the alphabet plus 10, and check that the result leaves 1
# modulo 97.

let
  iban = fn( input ~> … )
in
  { formula: iban }
```

- The file **opens with a doc comment**: the `#` lines before anything else.
  The first line is the title; the rest is Markdown. This is the
  documentation — there is no second copy of it in the manifest or in a
  `README.md` to fall out of step with the code.
- Its expression is an **object exporting `formula`**. Other keys are the
  bundle's own business; a catalogue reads `formula` and ignores the rest.
- It names no type unless it wants one: the formula takes a value that has
  already been through `Input` and answers one that is about to go through
  `Output`.

Coercion is the **caller's** job — `formula(input |> Input) |> Output` — which
is why the types and the function are separate. A caller that already holds a
validated value does not pay for it twice, a catalogue can validate a form
submission without running the formula, and the formula stays a function of
plain data.

## `fields.elo`

The input form, as data — so that generating an HTML form is reading one file:

```elo
{
  fields: [
    {
      path: 'tier',
      label: 'Customer tier',
      type: 'String',
      widget: 'select',
      required: true,
      constraints: ['known'],
      options: ['standard', 'silver', 'gold']
    }
  ]
}
```

| Key | | |
| --- | --- | --- |
| `path` | derived | dotted path into the input: `tier`, `customer.name` |
| `type` | derived | `Int`, `Float`, `Bool`, `String`, `Date`, `Datetime`, `Duration`, `Any` |
| `required` | derived | false for a `:?` field and for a type that accepts `Null` |
| `repeated` | derived | present and true for a `[T]` field |
| `constraints` | derived | the names of the rules that may refuse a value |
| `label` | **written** | what to call the field on screen |
| `widget` | **written** | defaulted from the type; `select`, `password`, whatever a host renders |
| `options` | **written** | the values of a choice field |
| `help`, `placeholder` | **written** | the rest of what only a human knows |

The **order of the list is the order of the form**, and it is the file's own —
a form may put its fields in any order, whatever order `Input` declares them
in.

The derived half is not hand-written. `elo-formulas --fields <id>`
regenerates the file from `Input`, keeping every written key it already had —
and **writes it in place**, because `> fields.elo` would truncate the file
before the generator could read those keys out of it:

```bash
contrib/formula-service/bin/elo-formulas --fields iban
# contrib/formula-service/formulas/iban/fields.elo refreshed
```

A bundle with no `fields.elo` yet gets one, every field unlabelled, which is
how a new formula starts.

So the workflow is: change `Input`, refresh, fill in the labels. And the lint
holds the two together — a type the file disagrees about, a field it invents, a
field it forgets, an option the type refuses, a field with no label.

**An option is checked against the type that names it.** `tier: Tier` with
`Tier = String(t | known: t == 'standard' || …)` lets the lint apply each
option to `Tier` and refuse `'platinum'`. A field whose type is written inline
has no name to apply, so its options go unchecked — which is the argument for
giving a choice a named type.

## `cases.elo`

```elo
{
  cases: [
    {
      name: 'Belgian, grouped',
      input: { iban: 'BE68 5390 0754 7034' },
      expect: { valid: true, country: 'BE', formatted: 'BE68 5390 0754 7034' }
    },
    …
  ]
}
```

A case is three things:

- `name` — what the case is about, in words. It is what a failure is reported
  under and what a catalogue shows in the table.
- `input` — **JSON-shaped**: strings, numbers, booleans, null, objects, arrays,
  and nothing else. A case's input is literally a request body, so it can
  pre-fill the form, and it is sent through `|> Input` exactly as a real
  submission is — which is how the coercion of a date from its string gets
  tested rather than assumed.
- `expect` — the **whole** answer, as an Elo value. Not JSON-shaped, because
  the answer is not: a formula may return a `Date`, and `D2026-01-25` is what
  that is. Compared with `==`, which is deep.

`expect` being the whole answer is deliberate: a published formula's output
shape is part of what it promises, and a case that checks three of six fields
promises nothing about the other three. `Output` says what those fields are;
the cases say what is in them.

### `refusals`: the other half of the contract

A formula promises two things, and a case table that writes down only the first
is half a specification. Beside `cases`, the same file holds the inputs the
formula **does not take**:

```elo
{
  cases: [ … ],

  refusals: [
    {
      name: 'a year before the Gregorian calendar',
      input: { year: 1500 },
      kind: 'constraint',
      path: '.year',
      label: 'gregorian'
    },
    {
      name: 'a day before the birth, which no age answers',
      input: { birthDate: '1990-03-15', on: '1989-01-01' },
      kind: 'guard',
      label: 'bornFirst'
    }
  ]
}
```

What refuses is either the **declared type** — a field missing, a value of the
wrong shape, a constraint that does not hold — or the **formula itself**,
through a `guard` over something no type can express: a relation between two
fields, like one date having to be on or after another. Both are preconditions,
and a caller needs to know both.

| Key | | |
| --- | --- | --- |
| `name` | required | what the refusal is about, in words |
| `input` | required | JSON-shaped, exactly as for a case |
| `kind` | required | `schema`, `missing`, `constraint`, `guard` or `check` |
| `path` | optional | where in the input, dotted; `.` is the whole of it |
| `label` | optional | the name the constraint, guard or check was written under |

Those are precisely the three things Elo promises about a refusal. The
**message is not among them** on purpose: it is prose, and a bundle that pinned
it would break on a reworded sentence. `path` and `label` are checked only when
the bundle states them, so a refusal may promise just the kind where that is
all there is to promise.

`refusals` is optional, so a bundle that has none is still a bundle, and this
is still format `1`. A *good* bundle has them, and the catalogue in this
directory holds itself to a rule the format does not impose on everyone —
`test/integration/formula-bundle.integration.test.ts`:

- at least one refusal of kind `schema` (a value of the wrong shape) and one of
  kind `missing` (a field left out), which every formula can be given;
- and one refusal per **named constraint** of the form. A constraint nobody has
  seen refuse anything is a constraint nobody has checked.

**A refusal cannot be checked from inside Elo**, and that is a language
decision rather than a gap in this format: an expression that refuses its input
stops, and Elo has no way to catch that. So where the case runner is generated
*as Elo* (below), the refusals are applied by the **host**, one at a time, in
whatever language it is written in. `runRefusals` in the reference
implementation is that, and `test/acceptance/test-formulas.sh` does the same
against JavaScript, Ruby and Python — because a `kind` or a `label` that only
one target reports is a bug worth finding. The first run of those checks found
one.

## `bundle.json`

```json
{
  "bundle": 1,
  "version": "1.0.0",
  "license": "MIT",
  "tags": ["validation", "banking"]
}
```

| Key | | |
| --- | --- | --- |
| `bundle` | **required** | the format version, `1` |
| `version` | **required** | the formula's own version, semver |
| `tags` | optional | for browsing a catalogue |
| `license`, `author`, `homepage` | optional | for publishing one |

And nothing else. A label belongs in `fields.elo`, a type in `types.elo`, a
rule in a predicate: the manifest is the one file a catalogue can ignore
entirely and still render the formula.

## What is derived, and what is read

### The form: generated from `Input`, read from `fields.elo`

The generator walks `Input` field by field, in declaration order:

| In the schema | In the form |
| --- | --- |
| `key: Int` / `Float` | a number field, required |
| `key: String` | a text field (a select, given `options`) |
| `key: Bool` | a checkbox |
| `key: Date` / `Datetime` | a date / date-time field |
| `key: Duration` | a text field, ISO 8601 |
| `key :? T` | the same field, not required |
| `key: T|Null` | the same field, not required |
| `key: T(v | named: …)` | the same field, carrying the constraint's name |
| `key: { … }` | a group, its fields keyed `key.sub` |
| `key: [T]` | a repeated field |
| `key: .` | a free-form JSON field |

What the form does **not** get is how to pre-validate: the bounds live in
predicates, and a predicate is an Elo expression, not a rule a form can
enforce. It does not need to. Validation is the formula's, and it already
answers in exactly the shape a form wants:

```
.vatRate: constraint 'aRate' failed    →  kind: 'constraint'
                                          path: '.vatRate'
                                          label: 'aRate'
```

`path` names the field to put the message on and `label` names the rule that
refused it, both promised by Elo's public interface. So a catalogue posts the
submission, catches the failure, and renders it against the field — with no
copy of the rule in the form at all.

**`Output` has no form.** An answer is rendered, not filled in, so there is no
`fields.elo` for it and no labels for its keys: a catalogue shows the value, and
reads `types.elo` if it wants the shape in advance.

### The case table, and its results

The runner is **generated, never stored** — one copy of the same eight lines
per bundle is the duplication this format exists to remove:

```elo
import { Input, Output } from './types'
import { formula } from './formula'
import { cases } from './cases'

let
  rows = map(cases, fn( c ~>
    let got = formula(c.input |> Input) |> Output
    in { name: c.name, input: c.input, got: got, expect: c.expect, ok: got == c.expect }
  ))
in
  rows
```

Compiled against the bundle's directory, so the three imports resolve.
A test run generates it with a `check 'every case passes': all(rows, …)` before
the body, so a wrong row is a non-zero exit; a catalogue generates it without,
so it can show which row was wrong.

### The web service

```elo
import { Input, Output } from './types'
import { formula } from './formula'

formula(_ |> Input) |> Output
```

Compiled with the target's prelude, that is one self-contained expression: the
whole bundle inlined, nothing to install beside it, no file read at run time.

`|> Output` is there for the same reason `|> Input` is: a declared type that is
never applied is a comment. It is also the one check that runs on every target,
so a bundle cannot declare an answer one target does not give — declare
`daysLeft: Int` for an `inDays` and the suite fails on Ruby and Python, where
that is a Float, while JavaScript, which has one number type, says nothing.

| | HTTP |
| --- | --- |
| the answer | `200`, the value as JSON |
| `kind: 'schema'` or `'missing'` | `422`, with `path` |
| `kind: 'constraint'` | `422`, with `path` and `label` |
| `kind: 'guard'` or `'check'` | `422`, with `label` |

Run it under a memory limit and a timeout — a legal formula can still be
expensive. See [`contrib/sandboxes/`](../../sandboxes), and [the service](..),
which is that table implemented over this format.

## Validity

A bundle is valid when:

1. the five files are present, and `types.elo` declares `Input` and `Output`
   — without these there is no bundle to read, so they are a refusal rather
   than a complaint, and everything below is a list of complaints;
2. `formula.elo` opens with a doc comment and exports `formula`;
3. `fields.elo` exports `fields`, one per field `Input` declares and no others,
   each with a label and a widget, each agreeing with `Input` about its type,
   whether it is required, whether it repeats and what may refuse it, and each
   option accepted by the type that names it;
4. `cases.elo` exports `cases`, a non-empty list of `{ name, input, expect }`,
   every `input` JSON-shaped — and, optionally, `refusals`, a list of
   `{ name, input, kind }` with an optional `path` and `label`, every `kind`
   one of the five Elo reports and every `input` JSON-shaped;
5. `bundle.json` has `bundle` and `version`;
6. every case passes, and every refusal refuses what it says it does, on
   JavaScript, Ruby and Python.

`../src/bundle.ts` is the reference implementation of all six, and
`test/integration/formula-bundle.integration.test.ts` runs it over every bundle
in this directory on every test run.

## Not in the bundle

- **A target list.** Which targets a formula compiles to is found by compiling
  it, not declared. (Today: JavaScript, Ruby and Python. A formula is a lambda
  and `Input` is a type definition, and the SQL target takes neither.)
- **A `README.md`.** The doc comment is the documentation.
- **A form for the answer.** An answer is rendered, not filled in.
- **Anything about the host**: endpoints, auth, rate limits, pricing. A bundle
  is a formula, not a deployment.
