# Restful API on top of a catalog of .elo formula (bundles)

> **Built, as the MVP of §12's phases 1 to 3**, in
> `contrib/formula-service/` — a contrib rather than compiler, since a service
> over bundles is a host. The bundle format's reference implementation and the
> thirteen formulas moved there with it, out of `examples/`.
>
> What landed: the index with its filters and folders, the descriptor and the
> four representations, the five file sub-resources, `ETag`s and
> `Content-Location`, `POST` and `GET …/call` with the whole error mapping of
> §5, the time and memory caps of §10, and the refusal to start of §11. 54
> assertions in `test/integration/formula-service.integration.test.ts`, which
> also POSTs every case of every formula.
>
> What did not, each answering 404 or 406 rather than something approximate:
> the HTML page and `/form` (phase 4), the formats past JSON (phase 5),
> `openapi.json` (phase 6) — and publishing, so a catalogue serves the one
> version each `bundle.json` declares. §14's first question is therefore still
> open; the other two were answered by building it: `answers` is worth its
> place (it is the column list a client renders with, and it cost one `map`
> over `describeFields`), and no `summary` was needed.
>
> One thing the design did not foresee: an answer has to be written by what
> `Output` *declares*, not by what the value is. A `Date` and a `Datetime` are
> the same runtime value on JavaScript, so a type-blind writer answers
> `"2026-01-25T00:00:00.000+01:00"` — an offset that is the server's timezone —
> where a declared `Date` must be `"2026-01-25"`. That is `src/answer.ts`, and
> it is the same walk §9 will want for its JSON Schema.

Written against the bundle format of 0233–0237 (`examples/formulas/BUNDLE.md`,
now `contrib/formula-service/formulas/BUNDLE.md`).
Everything below is derivable from a bundle: the component holds no per-formula
code, no per-formula schema and no per-formula HTML.

## 1. The resource is the bundle, not a file

A bundle is a **directory** of five files, so `age.elo` is not a formula — it is
one file of one. The formula is the directory:

```
formulas/              →  GET /
  foo/bar/             →  GET /foo/bar/
    age/               →  GET /foo/bar/age          the formula
      types.elo        →  GET /foo/bar/age/types.elo
      formula.elo      →  GET /foo/bar/age/formula.elo
      fields.elo       →  GET /foo/bar/age/fields.elo
      cases.elo        →  GET /foo/bar/age/cases.elo
      bundle.json      →  GET /foo/bar/age/bundle.json
```

The **id** of a formula is its path, `foo/bar/age`, each segment matching
`[a-z0-9]([a-z0-9-]*[a-z0-9])?`. No extension: a file extension in the URL
names a file of the bundle, which is exactly what the sub-resources above are.

That the URL space mirrors the directory space is not a coincidence to leave
implicit — it is **load-bearing**. The Elo program the service runs is

```elo
import { Input, Output } from './types'
import { formula } from './formula'

formula(_ |> Input) |> Output
```

and `./types` resolves, relative to `/foo/bar/age/`, to a URL this API already
serves. A client that wants to compile the formula itself can fetch the program
and resolve its imports over HTTP, with no knowledge of the bundle layout
beyond what the source says.

## 2. Versioning, from the first line

A formula is a published artefact that clients cache answers from, so the
version belongs in the contract now rather than after the first deployment.
Four decisions, and they hang together:

**The exact version is in the path.** `@` is a legal path character
(RFC 3986's `pchar` includes it), and the query string belongs to the *input*
(§4), so a version cannot live there.

| URL | What it is | Cache |
| --- | --- | --- |
| `/foo/bar/age@1.2.0` | that version, forever | immutable |
| `/foo/bar/age` | an **alias** for the latest version | `no-cache`, revalidate |

The alias answers the latest version's representation directly — not a
redirect, which would cost every client a round trip — with
`Content-Location: /foo/bar/age@1.2.0` naming what it resolved to. So a client
that wants to pin reads one header; a client that does not, does nothing.

**A published version is immutable and permanent.** Its files never change and
it is never deleted: answers have been cached against it, and clients have
pinned it. Withdrawing one means marking it, never removing it —
`"deprecated": true` in the manifest, answered as a `Deprecation: true` header
and a descriptor flag, and left out of the index while staying served.

**The catalogue the API serves is a build output**, not the authoring
repository. Publishing copies a bundle into an immutable directory per version:

```
dist/foo/bar/age/1.2.0/{types,formula,fields,cases}.elo + bundle.json
dist/foo/bar/age/1.1.0/…
```

The authoring format is untouched — one directory per formula, one version at a
time, which is what the thirteen in `examples/formulas` are. This is also what
makes `PUT` (§13) a small step later: publishing *is* writing one of these
directories, and nothing else in the service has to change.

The alternative considered was **git as the version store** — serve the working
tree for the alias and read `@1.1.0` out of history. It needs no build step and
no duplication, but it makes every pinned request a git read, couples the
service to a repository layout, and gives a published version a mutable history
(a force-push rewrites what a client pinned). Immutable directories are boring,
and boring is the property wanted here.

**The version in the path and the version in `bundle.json` must agree**, which
the publish step checks. Two copies, one checked — the rule the bundle format
already runs on.

### What a version number means for a formula

`version` is semver, and for a formula the three levels have a precise reading.
It is worth pinning now, because a client generates code from `Input` and
`Output` and caches answers from `/call`:

| Change | Level |
| --- | --- |
| a new **optional** input field; a looser constraint; a new key in `Output` | minor |
| documentation, labels, `help`, `placeholder`, options reordered | patch |
| a faster formula with identical answers | patch |
| a **required** input field added; a constraint tightened; an input field removed or retyped | major |
| a key removed from `Output`, or retyped | major |
| **the same input answering differently** | major |

That last line is the one that matters and the one people get wrong. If a
corrected formula answers 42 where it used to answer 41, every cached answer and
every client expectation is now wrong — that is a major change even though it is
a bug fix, and the cases are where it shows: a version that changes an answer
changes a case, and the diff says so.

## 3. Describing a formula

`GET /foo/bar/age@1.2.0`, with the representation chosen by `Accept`:

| `Accept` | Body |
| --- | --- |
| `application/json` (default) | the descriptor, below |
| `text/html` | the page: documentation, the form, the case table |
| `application/x-elo` | the service program above, as Elo |
| `application/javascript` | that program compiled to JavaScript, prelude included |
| `text/x-ruby` | the same, Ruby |
| `text/x-python` | the same, Python |
| anything else | `406` |

The descriptor is the bundle, flattened:

```json
{
  "id": "foo/bar/age",
  "version": "1.2.0",
  "title": "How old is someone on a given day?",
  "doc": "Not `(on - birthDate) / P1Y`: a duration converted to years …",
  "tags": ["date", "people"],
  "license": "MIT",
  "deprecated": false,
  "fields": [ { "path": "birthDate", "label": "Date of birth", "type": "Date",
                "widget": "date", "required": true } ],
  "answers": [ { "path": "years", "type": "Int", "required": true } ],
  "cases": [ { "name": "birthday already passed",
               "input": { "birthDate": "1990-03-15", "on": "2026-11-05" },
               "expect": { "years": 36, "isAdult": true, "birthdayToday": false } } ],
  "targets": ["js", "ruby", "python"],
  "links": { "self": "/foo/bar/age@1.2.0", "latest": "/foo/bar/age",
             "call": "/foo/bar/age@1.2.0/call", "form": "/foo/bar/age@1.2.0/form",
             "openapi": "/foo/bar/age@1.2.0/openapi.json" }
}
```

`fields` is `fields.elo` verbatim. `answers` is derived from `Output` by the
same walk (`describeFields`) — the bundle has no form for the answer, and this
is not one either: it is the column list a client renders a result table with,
and the same walk feeds the OpenAPI schema of §9.

`cases` matters more than it looks: a case's `input` is a request body by
construction, so a client can offer "try this example" by POSTing one
unchanged, and the documentation of the API *is* its test suite.

**Algorithmic transparency** is the compiled representations. `Accept:
text/x-ruby` answers the exact program that ran, prelude and all — not a
paraphrase of it. That is the strongest form of the claim a formula service can
make, and it costs nothing: the compiler is already there.

## 4. Calling it

```
POST /foo/bar/age@1.2.0/call      Content-Type: application/json
GET  /foo/bar/age@1.2.0/call?birthDate=1990-03-15&on=2026-11-05
```

**One request is one call.** The body is one input and the answer is one
answer; there is no batch, no envelope, no result wrapper. Bulk is §13, and
designing it later costs nothing precisely because a single call has no
envelope to grow into one.

`POST` is the general form. `GET` exists because a formula is a function of its
arguments and nothing else, which makes the answer **cacheable and linkable** —
a computed result has a URL. A `GET` call reads every query parameter as a
string and hands it to `Input`, whose coercion is what turns `'1990-03-15'`
into a `Date`; a field declared `type: 'Int'` arrives as `"36"` and coerces.
Nested fields use their dotted path (`customer.name=Alice`), and a repeated
field repeats its parameter. Past a sane URL length a `GET` call is `414`, and
the client uses `POST`.

The answer body is **the formula's output and nothing else**, so that a client
may read it with a schema generated from `Output`. What the call also carries,
in headers: `Content-Location` of the versioned `/call`, so a client that used
the alias knows which version answered. On caching, see §8: `no-store` until a
deployment says otherwise.

### Formats

`Content-Type` chooses how the request body is read, `Accept` how the answer is
written, and the two are independent. The component maps media types onto Elo's
own `FormatAdapter` registry (`src/formats.ts`), which already has `json` and
`csv` and takes more:

| Media type | Reads / writes | |
| --- | --- | --- |
| `application/json` | any input, any answer | built in |
| `application/yaml` | any input, any answer | to add, over a YAML parser |
| `text/csv` | **only** a list `Input` / `Output` | built in |
| `application/vnd.openxmlformats-…sheet` | **only** a list `Input` / `Output` | to add, over SheetJS |

A tabular format encodes a *table*, so it only means something where the
formula's own type is one: `Input = [Row]` takes a CSV body as **one** input
value that happens to be a list, and `Output = [Line]` writes one. That is not
a batch — it is one call whose argument is a list, which the formula declared
and validates like any other. A CSV body for a formula whose `Input` is a
record is `415`, with a message saying so, rather than being silently read as
many calls.

A list `Input` also changes the page of §6: there is no sensible HTML form for
a table, so the page offers a file upload instead. `describeFields` already
reports a non-record input as a single `repeated` field, which is the signal.

An unknown `Content-Type` is `415`, an unsatisfiable `Accept` is `406`. Adding
a format is a registry entry, never a change to this contract.

## 5. When it fails

Elo's failures already carry what an HTTP error needs: a `kind` to map, a
`path` to point at, a `label` to name the rule. The mapping is total:

| Cause | Status | Body |
| --- | --- | --- |
| the answer | `200` | the value |
| `kind: 'schema'`, `'missing'` | `422` | `kind`, `path`, `field`, `message` |
| `kind: 'constraint'` | `422` | and `label` |
| `kind: 'guard'`, `'check'` | `422` | `kind`, `label`, `message` |
| no such formula, or no such version | `404` | |
| body unparseable in its `Content-Type` | `400` | |
| `Content-Type` unknown, or tabular for a record input | `415` | |
| unsatisfiable `Accept` | `406` | |
| body too large | `413` | |
| the call hit the time or memory cap | `503`, `Retry-After` | which cap |
| the bundle is invalid | — | the component never started (§11) |

`field` is `path` without its leading dot, which is the key of `fields.elo` —
so a client puts the message under the input that caused it without parsing
anything. `message` is for a human and its wording is **not** part of this
contract; `kind`, `path` and `label` are, because Elo promises them.

## 6. The form, and the page

`GET /foo/bar/age@1.2.0/form` answers an HTML `<form>` fragment, built from
`fields.elo`: `label` for the label, `widget` for the control (`number`,
`checkbox`, `date`, `datetime`, `duration`, `text`, `password`, `select` with
`options`), `required` for the attribute, `placeholder` and `help` where they
are given. Its `action` is `../call` and its `method` is `GET`, so **the form
works with no JavaScript** and its result is a URL.

`GET /foo/bar/age@1.2.0` with `Accept: text/html` answers the page: the doc
comment rendered as Markdown, that form, the case table with a "try it" link
per case (each one a `GET /call?…` built from the case's input), and the
compiled source behind a disclosure. One template for the whole catalogue.

The only thing the form cannot do by itself is pre-validate: a bound lives in
an Elo predicate, not in an HTML attribute. It does not need to — §5 maps a
refusal back onto the field that caused it. A client that wants live validation
can POST to `/call` on blur, or compile the JavaScript representation of §3 and
run the whole formula in the page.

## 7. The index

`GET /` and `GET /foo/bar/` answer the catalogue:

```json
{ "formulas": [ { "id": "foo/bar/age", "version": "1.2.0", "title": "…",
                  "tags": ["date"], "versions": ["1.0.0", "1.1.0", "1.2.0"],
                  "links": { … } } ],
  "folders": ["foo/bar/baz"] }
```

One entry per formula under that prefix — its latest version, with the others
listed — from `bundle.json` and the doc comment's first line, and nothing else:
an index of a thousand formulas should be a thousand file reads, not a thousand
compiles. That is the whole reason `bundle.json` is JSON while the rest of a
bundle is Elo.

`?tag=`, `?q=` (title and doc substring) and `?page=`/`?per_page=` filter it.
Deprecated versions are listed under `versions` but never become the latest.

## 8. Caching an answer: deferred

A pinned version is immutable, so the *representations* of §3 cache without
anyone having to decide anything: a strong `ETag` from the bundle's content
hash and a long `Cache-Control` on `/foo/bar/age@1.2.0`, `no-cache` and an
`ETag` on the alias. That follows from §2 and stays.

Whether an **answer** may be cached is a different question, and this
specification deliberately does not answer it. Three reasons, in increasing
order of how much they matter:

- It is a question about **purity**, not about the clock. A formula is pure
  when its answer is a function of its argument and nothing else, and the
  language has not finished deciding what can break that: a `random` in the
  stdlib would, and so would the planned **`$` context** — a second input
  supplied by the deployment rather than the caller, which is rather the point
  of having one. Any analysis written here would be a guess with a short shelf
  life, and worse, a *narrow* one: today's version of it would have looked only
  for temporal keywords.
- If purity does become something a host needs to know, **the compiler is where
  it belongs**. Elo already reports what it can prove about a program, with a
  flag and a diagnostic code; purity is that kind of question. Every host
  deriving it separately would derive it differently, which is the failure mode
  this whole format exists to avoid.
- And the decision is not the API's in the first place: **whoever deploys it
  knows which formulas they are serving.** A tax table that changes yearly and
  a currency rate that changes hourly are the same program to this component,
  and how stale an answer may be is a business question about the formula, not
  a property of HTTP.

So, until there is something better to say: **`/call` answers carry
`no-store`**, and a deployment that knows better configures it — per formula or
per prefix, as its own concern, outside this contract. The default goes that
way round because the other one means a cache serving last year's answer
because nobody thought to forbid it.

(The thirteen in `examples/formulas` are pure as it happens — `age` takes the
reference day as an input, `payment-due-date` takes `today` — which is what
lets their cases pin them at all. It is a good habit for a formula author, and
still not a thing this component should be inferring.)

## 9. OpenAPI

Two documents, because two audiences:

**`GET /foo/bar/age@1.2.0/openapi.json`** — one formula, for a client that
generates a typed call to it: the request body schema from `Input`, the
response schema from `Output`, the error schema from §5, the examples from
`cases.elo`.

**`GET /openapi.json`** — the whole catalogue, for a gateway, a Postman
collection, or an SDK over everything: one path per formula, each with those
same schemas under `components.schemas` keyed by formula id and version.
`?prefix=foo/bar` and `?tag=` scope it, because a thousand formulas is a
document no tool enjoys; it is generated once per catalogue version and cached
hard, like any other derived representation.

Both are the same walk over the type AST that `describeFields` does, emitting
JSON Schema instead of form fields:

| Elo | JSON Schema |
| --- | --- |
| `Int` / `Float` | `integer` / `number` |
| `String` | `string` |
| `Bool` | `boolean` |
| `Date` / `Datetime` | `string`, `format: date` / `date-time` |
| `Duration` | `string`, `format: duration` |
| `[T]` | `array`, `items` |
| `{ … }` | `object`, `properties`, `required` |
| `T\|Null` | `nullable` |
| `Any` / `Data` | `{}` |
| a predicate | nothing — §5 is how a bound is reported |

That last line is the honest one: a constraint is an Elo expression, so JSON
Schema cannot carry it. A generated client validates shape, the formula
validates meaning.

## 10. Security

The trust boundary is **not** where a reader may expect it:

- **Bundles are trusted content.** They are reviewed and versioned in a
  repository, and the component compiles them. Nothing in this API accepts Elo
  source from a caller.
- **Inputs are untrusted**, and they are the only untrusted thing. They are
  plain data, passed to a compiled expression that cannot do I/O, cannot
  `eval`, and cannot reach a host global — Elo's capability sandbox, which
  holds whatever the input is.
- **There is no `POST /eval`**, and adding one would replace the above with a
  different threat model entirely. If a playground is wanted, compile in the
  browser as <https://elo-lang.org/> does.

What the sandbox does *not* bound is time and memory, so the component must:
run each call under a wall-clock timeout and a memory ceiling
(`contrib/sandboxes/node` is the reference), cap request bodies, and rate-limit
per caller. Arithmetic alone is a denial-of-service vector: `2 ^ 2 ^ 30` is ten
characters, answers `Infinity` on JavaScript in no time at all, and was still
computing on Ruby three seconds later with a 300-million-digit integer in hand.
A list `Input` (§4) makes the cap matter more, not less: one request may now ask
for ten thousand rows of work inside a single call, so the cap is on the call's
time and memory, never on a row count the formula never promised.

Compilation happens **once per (formula, version, target)** at boot or first
use, never per request: a compiled Elo expression is a function, and reusing it
is both faster and the only way the timeout measures what it means to.

## 11. What the component is

A small HTTP service over a published catalogue:

```
loadCatalogue(dir)        →  every bundle, parsed            (examples/formula-bundle.ts)
validateBundle(bundle)    →  refuse to start if any problem
compile(serviceSource())  →  one callable per formula, version and target
```

**It refuses to start on an invalid bundle.** A catalogue that serves a formula
whose form disagrees with its type, or whose cases do not pass, is worse than
one that does not come up: the error belongs to whoever published it, at
publish time. The same check runs in CI over the whole catalogue, so a bad
bundle never reaches a deploy.

On boot it also **runs every case** of every bundle it serves, on the target it
will serve with. That is a few hundred evaluations for a catalogue of a hundred
formulas, it takes milliseconds, and it means a running service has
demonstrated that every formula in it answers what its documentation says.

## 12. What to build, in order

1. **The read-only half.** `GET /`, `GET /{id}`, `GET /{id}@{version}`, the five
   file sub-resources, the four compiled representations, `ETag`s,
   `Content-Location` on the alias. No execution — already useful as a
   browsable, transparent catalogue, and where the descriptor gets settled.
2. **`POST /{id}@{version}/call`**, JSON only, one input, the full error mapping
   of §5, under a timeout and a memory cap. The smallest thing that is a FaaS.
3. **`GET …/call`**, which is where a linkable answer arrives — with the
   `no-store` default of §8, since nothing yet knows better.
4. **`GET …/form`** and the HTML page. One template, no per-formula code.
5. **Formats**: YAML, then `text/csv` and XLSX for list `Input`/`Output`.
6. **`openapi.json`**, per formula and for the catalogue.

Each phase is a contract, so each gets a **Webspicy** suite (the framework this
is for): the status codes, the error shapes, the content negotiation. The
catalogue's own cases are the fixtures — every `cases.elo` entry is a request
and its expected response, which means phase 2 can be tested by generating its
suite from the bundles rather than writing one.

## 13. Later, and deliberately not now

- **Bulk.** A second resource, `POST /{id}@{version}/calls`, taking a list of
  inputs and answering a list of `{ok, value|error}` with `207` when some rows
  failed. It is a different resource rather than a mode of `/call`, which is
  why §4 can stay envelope-free: nothing has to grow, something gets added.
  Tabular bodies then have two readings (a list `Input`, or a bulk of records),
  and the resource is what distinguishes them.
- **`PUT /{id}@{version}`**, publishing over HTTP rather than over git: write
  the immutable directory of §2, having validated the bundle and run its cases
  *before* accepting it, and refuse to overwrite a version that exists. It
  inverts §10 — the publisher becomes the trust boundary, and bundles are then
  only as trusted as whatever authenticates that call — which is the work, not
  the endpoint.
- **A `$` context**, when the language has one: a second input, supplied by
  the deployment and **never by the caller** — that boundary is the whole
  value of it, and §10 is where it has to be written down when it lands. It is
  also what will make a formula impure, and so what makes the caching question
  of §8 answerable rather than guessable.
- **Version ranges in the path**, `@1` and `@1.2`. They are aliases like the
  unversioned one, with the same caching rule, and they only make sense once
  two versions of something are actually served.

## 14. Still open

1. **Who is the latest?** Highest semver, or a `latest` pointer the publisher
   sets? Highest is less rope; a pointer lets a bad release be backed out
   without a new version number. The answer probably follows from whether
   publishing is git (§2) or `PUT` (§13).
2. **Is `answers` in the descriptor worth its place**, given `GET
   /{id}/types.elo` already serves `Output` and §9 generates its schema?
3. **Does a formula need a `summary` separate from the doc comment's first
   line?** The index uses that line as the title today, which works for the
   thirteen because each opens with a question.
