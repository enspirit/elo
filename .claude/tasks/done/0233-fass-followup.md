# FaaS followup

> **Superseded in part.** The format landed over three passes — 0233, 0236
> and 0237 — and what it finally is lives in `examples/formulas/BUNDLE.md`.
> This file is the pass, not the format.

0226 brought examples of typical formula, together with their tests. For our
FaaS SaaS, we'll need a standard data format for the formula, its cases/tests,
documentation, and input form.

## Idea

Propose a "formula bundle" so that we can build a catalog of such formula and
the catalog easily allows:

- Presenting the formula's code and documentation
- Wrapping a formula as a webservice
- Presenting cases and execution results
- Show an input form corresponding to the formula Input

## What was proposed

`examples/formulas/BUNDLE.md` is the format, and the thirteen formulas of 0226
are now bundles of it. A bundle is a directory, named after the formula:

```
iban/
  formula.elo     # the doc comment, Input, and { formula: … }
  cases.elo       # { cases: [ { name, input, expect } ] }
  bundle.json     # { bundle: 1, version, tags, fields: { … presentation } }
```

**The one rule: nothing may be stated twice.** Everything structural is in the
Elo source, because that is the only copy that is executed; `bundle.json`
carries what the source cannot say, and a bundle restating a constraint there
is invalid. So the four things the catalog needs are *derived*:

| | from |
| --- | --- |
| code and documentation | `formula.elo` and the `#` block it opens with |
| the input form | `Input`, walked field by field, labelled by the manifest |
| cases and their results | `cases.elo`, run by a **generated** runner |
| the web service | `formula(_ |> Input)`, compiled per target |

`examples/formula-bundle.ts` is the reference implementation of all four, plus
the lint for the format's rules.
`test/integration/formula-bundle.integration.test.ts` holds every bundle to
them (and has eight cases that break a rule on purpose, so the lint is known to
refuse something). `test/acceptance/test-formulas.sh` now generates the runner
into each bundle and runs all 97 cases on JavaScript, Ruby and Python.

### The decisions, and what they turned down

- **A form needs no copy of the validation.** `Input`'s predicates stay
  predicates; the formula refuses a bad submission and the failure already
  names the field (`path`) and the rule (`label`), which is what a form wants
  to render. So the manifest has no `required`, no `min`, no `pattern` — and
  the lint refuses them.
- **The doc comment is the documentation.** Not a `README.md` beside it: two
  places for prose is one place for it to go stale, and the comment is where it
  already was.
- **`input` is JSON-shaped, `expect` is an Elo value.** A case's input is
  literally a request body, so it pre-fills the form and doubles as a `curl`
  example — and sending `'1990-03-15'` through `|> Input` tests the coercion
  instead of assuming it. `expect` is the answer, which may be a `Date`, so it
  is Elo.
- **`expect` is the whole answer**, not the two fields the old `.test.elo`
  compared. A published formula's output shape is part of what it promises.
- **The runner is generated, never stored.** The thirteen `.test.elo` files it
  replaces were thirteen copies of the same eight lines.
- **Nothing was added to the compiler.** A bundle is a convention over files;
  all it asks of Elo is `loadProgram`, to read a type prelude. The reader lives
  in `examples/` so it is compiled and tested rather than rotting in `contrib/`.

### Open questions

1. **`options` is the one duplication left.** A choice is written as a
   predicate, which a form builder cannot read, so the manifest lists the
   values for the widget. `ideation/0235` weighs the fix (a union of string
   literals, `'standard' | 'silver' | 'gold'`) against leaving it alone, and
   leans to leaving it until a catalogue has more than three of them.
2. **Should the reader ship in the package?** The SaaS needs this code, and
   today it is an example to copy, like `contrib/sandboxes`. A
   `@enspirit/elo/bundle` entry point would be the alternative, and it would
   put the bundle format inside the versioning promise — which is a bigger
   commitment than the format has earned on its first day.
3. **A bundle is a directory, and 0234's REST paths are files.** The REST idea
   sketches `GET /foo/bar/age.elo` over a tree of `.elo` files; with bundles,
   the thing at that path is a directory, so the resource is `/foo/bar/age`
   (the bundle) and its source is `/foo/bar/age/formula.elo`. That reads better
   — the formula is the resource and the source is a representation of it,
   which is what `Accept: application/x-elo` was already saying — but it is a
   choice 0234 inherits rather than makes.
4. **Per-bundle dependencies.** Nothing yet imports a shared module between
   bundles (each is standalone on purpose). A catalogue that grows will want
   one — a `chars.elo` for digit tests, say — and that is the moment the bundle
   stops being self-contained. Worth deciding before, not after.
