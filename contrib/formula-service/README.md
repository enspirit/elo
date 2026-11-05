# The formula service

A REST API over a catalogue of [formula bundles](./formulas/BUNDLE.md), and the
fourteen formulas it ships with.

```bash
npm run build                                   # from the repository root
contrib/formula-service/bin/elo-formula-service

curl 'http://localhost:8080/'
curl 'http://localhost:8080/iban@1.0.0'
curl 'http://localhost:8080/iban/call?iban=BE68+5390+0754+7034'
# {"valid":true,"country":"BE","formatted":"BE68 5390 0754 7034"}
```

Nothing in here is part of the compiler, and that is the point: a bundle is a
convention over files, and a service over bundles is a *host* — so this lives
beside the editor plugins and the sandboxes rather than in `src/`. Copy it.

```
formulas/      the catalogue: fourteen bundles, and BUNDLE.md, the format
src/bundle.ts  the format's reference implementation: read, check, generate
src/catalogue.ts  a catalogue, validated and compiled, once, at boot
src/service.ts    the HTTP contract: routing, negotiation, the error mapping
src/sandbox.ts    one call, under a time and a memory cap
src/answer.ts     how an answer becomes JSON, from what Output declares
src/server.ts     node:http, and the command line
webspicy/         the black-box specification of all of it
```

## What it serves

| | |
| --- | --- |
| `GET /` | the index; `?tag=`, `?q=`, `?page=`, `?per_page=` |
| `GET /tax/be/` | the same, under a folder |
| `GET /{id}` | the latest version, named in `Content-Location` |
| `GET /{id}@{version}` | the descriptor — or the program, by `Accept` |
| `GET /{id}@{version}/types.elo` | the five files of the bundle, verbatim |
| `GET /{id}@{version}/form` | the input form, as an HTML fragment |
| `GET /{id}@{version}/openapi.json` | that formula, for a client that generates a call |
| `GET /openapi.json` | the whole catalogue; `?prefix=`, `?tag=` |
| `POST /{id}@{version}/call` | one input, one answer |
| `GET /{id}@{version}/call?…` | the same, linkable |

`GET /` and `GET /{id}` answer **HTML** to a client that asks for it by name —
a browser following a link — so the catalogue is browsable and every formula
has a page you can use. Anything else gets JSON.

A formula's **id is its path**: a catalogue organised in folders serves
`/tax/be/vat`, and the URL space mirrors the directory space on purpose. The
program the service runs is

```elo
import { Input, Output } from './types'
import { formula } from './formula'

formula(_ |> Input) |> Output
```

so `./types`, resolved relative to `/tax/be/vat/`, is a URL this API already
serves: a client can fetch the program and resolve its imports over HTTP,
knowing nothing about the bundle layout beyond what the source says.

### The descriptor, and the program

`GET /{id}@{version}` answers what `Accept` asks for:

| `Accept` | |
| --- | --- |
| `application/json` (default) | the descriptor: documentation, `fields`, `answers`, `cases`, links |
| `text/html` | the page: the documentation, the form, the cases, the source |
| `application/x-elo` | the program above |
| `application/javascript` | it compiled, prelude included |
| `text/x-ruby`, `text/x-python` | the same, for those |
| anything else | `406` |

The compiled representations are **algorithmic transparency**: they are the
exact program that ran, not a paraphrase of it, and they cost nothing because
the compiler is already there.

`cases` matters more than it looks. A case's `input` is a request body by
construction, so "try this example" is a POST of one unchanged — and the
documentation of the API is its test suite.

### The form, and the page

`GET /{id}/form` answers an HTML `<form>` built from `fields.elo` — the
file is data precisely so that this is a read rather than a walk over a type,
and a host that wants its own rendering reads the same file. `GET /{id}`
with `Accept: text/html` answers the page: the doc comment as Markdown, that
form, the case table with a link per case that *runs* it, what the answer
holds, and the program itself behind a disclosure.

**The form works with no JavaScript.** Its method is `GET` and its action is
the call, so submitting it lands on a URL that is the answer — the same
resource a program would call, linkable and bookmarkable. There is no script
on the page.

Two things follow from a form being HTML, and they are rules of `GET …/call`
rather than of the markup: a parameter whose value is **empty** counts as not
given (an untouched optional box sends `name=`), and when a field is given
**twice** the last value wins (a checkbox sends a hidden `false`, then `true`
over it if it is ticked, so a `Bool` always arrives).

What the form cannot do is pre-validate: a bound lives in an Elo predicate,
not in an HTML attribute, and the one place it could be copied to is the one
place it would fall out of step. It does not need to — a refusal comes back
naming the field that caused it, which is what a page puts the message under.

### Calling it

One request is one call: the body is one input, the answer is one answer, and
there is no envelope. `GET` exists because a formula is a function of its
arguments and nothing else, which makes a computed result linkable; it reads
every parameter as a string and lets `Input` coerce, so `?birthDate=1990-03-15`
becomes a `Date`. A dotted name is a nested field (`customer.name=Alice`), and
a field the form declares `repeated` is a list however many times it is given.

An answer is written **by what `Output` declares**, which is why a declared
`Date` is `"2026-01-25"` and not `"2026-01-25T00:00:00.000+01:00"`: the offset
in the second one is the server's timezone, which is not the formula's
business. On JavaScript the two are the same runtime value, and only the type
says which was meant.

### Formats

`Content-Type` chooses how the request body is read and `Accept` how the answer
is written, and the two are independent — the same table can go in as CSV and
come back as JSON.

| Media type | Reads / writes | |
| --- | --- | --- |
| `application/json` | any input, any answer | built in |
| `text/csv` | **only** a list `Input` / `Output` | built in |
| `application/yaml`, XLSX | any / a list | a host's to add, below |

A tabular format encodes a **table**, so it only means something where the
formula's own type is one. `Input = [Row]` takes a CSV body as **one** input
that happens to be a list — not a batch of calls — which the formula declared
and validates like any other value: a refusal names the row, by index
(`.1.unitPrice`). A CSV body for a formula whose `Input` is a record is a `415`
saying so, rather than a body silently read as many calls, and `Accept:
text/csv` is only offered where `Output` is a list.

Which of those is the case is read from the **type**, never from the form: for
`Input = [Line]`, `fields.elo` describes a *row* — which is what a table's
column labels are — so the form is no use for this question and `types.elo`
is.

Two details of reading a table, both the same rule a form taught us: every cell
arrives as a **string** and `Input` coerces it, and an **empty** cell counts as
a cell left alone, so an optional column may be blank. And an empty table still
answers its header, since a client reading columns off the body should not have
to guess them.

`order-lines` is the formula in the catalogue whose input is a table, and the
one all of this is specified against.

**YAML and XLSX need a parser this repository does not depend on** (Elo's only
dependency is luxon, and a service over it should not be the thing that adds
two more). Elo has a `FormatAdapter` registry for exactly this — `parseCSV` and
`toCSV` behind `text/csv` here come from it — so adding one is a registry entry
in a host's own copy of `service.ts`, not a change to this contract.

### When it fails

Elo's refusals already carry what an HTTP error needs, so the mapping is total:

| | |
| --- | --- |
| the answer | `200` |
| `kind: 'schema'`, `'missing'`, `'constraint'`, `'guard'`, `'check'` | `422`, with `kind`, `path`, `field`, `label`, `message` |
| no such formula, version or file | `404` |
| a body that is not JSON | `400` |
| a content type it does not read | `415` |
| an `Accept` it cannot satisfy | `406` |
| a body past the cap | `413` |
| a request target past the cap | `414` |
| the call hit the time or memory cap | `503`, with `Retry-After` |

`field` is `path` without its leading dot, which is the key of `fields.elo` —
so a client puts the message under the input that caused it without parsing
anything. `kind`, `path` and `label` are promised by Elo; the `message` prose
is not.

### OpenAPI

Two documents, because two audiences. `GET /{id}@{version}/openapi.json` is one
formula, for a client generating a typed call to it: the request body schema
from `Input`, the response schema from `Output`, the errors of §5, and the
examples from `cases.elo` — which were already a request body and a response
body by construction. `GET /openapi.json` is the whole catalogue, for a
gateway, a Postman collection or an SDK over everything, scoped by `?prefix`
and `?tag` because a thousand formulas is a document no tool enjoys.

Neither is written: the schemas are the same walk over the same type AST that
builds the form and writes the answer, so there is no third copy of what a
formula takes to fall out of step with the other two.

| Elo | JSON Schema |
| --- | --- |
| `Int` / `Float` | `integer` / `number` |
| `String` | `string` |
| `Bool` | `boolean` |
| `Date` / `Datetime` | `string`, `format: date` / `date-time` |
| `Duration` | `string`, `format: duration` |
| `[T]` | `array`, `items` |
| `{ … }` | `object`, `properties`, `required`, `additionalProperties: false` |
| `T\|Null` | `nullable: true`, and still **required** |
| `Any` / `Data` | `{}` |
| a predicate | nothing — §5 is how a bound is reported |

The last line is the honest one, and the one before it is the subtle one: a
`T|Null` key is *there* and may be null, which is a different thing from the
`:?` that may be absent — so it is required and nullable at once, and a
generated client reading it finds it every time.

It is **3.0.3** rather than 3.1: `nullable: true` is read by more of the
tooling these documents exist for than a union with `"null"` is. The suite
validates both documents with a real OpenAPI parser, which is how a
`description` on a Media Type Object — a field that does not exist — was caught
rather than shipped.

## Caching

A published version is immutable, so `/{id}@{version}` carries a strong `ETag`
from the content of its five files and a year of `Cache-Control`. The
unversioned alias answers the latest version's representation directly — a
redirect would cost every client a round trip — with `no-cache` and a
`Content-Location` naming what it resolved to.

**An answer is `no-store`.** Whether one may be cached is a question about the
formula's *purity*, which the language has not finished deciding — a `random`
in the stdlib would break it, and so would a deployment-supplied context — and
which this component cannot see anyway. Whoever deploys it knows which formulas
they are serving, and configures it there. The default goes this way round
because the other one means a cache serving last year's answer because nobody
thought to forbid it.

## Safety

The trust boundary is not where a reader may expect it:

- **Bundles are trusted content.** They are reviewed and versioned in a
  repository, and this service compiles them. Nothing here accepts Elo source
  from a caller, and there is no `POST /eval` — if you want a playground,
  compile in the browser as <https://elo-lang.org/> does.
- **Inputs are untrusted, and they are the only untrusted thing.** They are
  plain data handed to a compiled expression that cannot do I/O, cannot `eval`
  and cannot reach a host global.

What Elo's capability sandbox does *not* bound is time and memory: `2 ^ 2 ^ 30`
is ten characters, and a formula quadratic in the length of its input is a
legal formula. So every call runs in a worker thread with a heap ceiling and a
wall clock, and is hard-killed past it (`--timeout`, `--max-heap`; the same
levers as [`contrib/sandboxes/node`](../sandboxes/node)). Compilation happens
once per formula and target, at boot — never per request, which is both faster
and the only arrangement in which the timeout measures what it says.

Before shipping this, put it behind a rate limiter and a reverse proxy, and
read [running safely](https://elo-lang.org/running-safely). It is a reference
implementation, not a hardened product.

## It refuses to start on a bad catalogue

Boot reads every bundle, validates it against `BUNDLE.md`, and **runs every
case**. A catalogue that serves a formula whose form disagrees with its type,
or whose cases do not pass, does not come up: the error belongs to whoever
published it. For the fourteen that is a few hundred evaluations and
milliseconds, and it means a running service has demonstrated that every
formula in it answers what its documentation says.

## What is not here yet

All six phases of the plan are in. What is left is what the plan itself put
off, plus two things it asked for that need a dependency this repository does
not have:

- **YAML and XLSX bodies** — a parser each, which is a host's dependency to
  add rather than this repository's (see Formats above)
- **a file upload on the page** — a table goes in as a body, and an HTML form
  can only send one as `multipart/form-data`, which is a parser and a content
  type this contract does not have. The page shows the `curl` instead
- **more than one version of a formula.** A version is read from `bundle.json`,
  so the catalogue serves one per formula and `versions` has one entry.
  Publishing — the step that copies a bundle into an immutable directory per
  version — is the other half of §2 and is not here
- **withdrawing one.** `deprecated` is in the descriptor and always `false`:
  marking a version withdrawn needs a key the bundle format does not have, and
  inventing one here would be the format stated in two places
- **bulk**, which will be its own resource (`/calls`) rather than a mode of
  this one. That is why a single call has no envelope to grow into one

## The other command

`bin/elo-formulas` is the bundle format's own CLI, over the same catalogue:

```bash
contrib/formula-service/bin/elo-formulas                   # every bundle, with its case count
contrib/formula-service/bin/elo-formulas order-pricing     # one: doc, form, cases, validity
contrib/formula-service/bin/elo-formulas --fields iban     # refresh fields.elo from Input
contrib/formula-service/bin/elo-formulas --service         # the program a service compiles
ELO_FORMULAS=./my-formulas contrib/formula-service/bin/elo-formulas
```

## Trying it by hand

Boot it once, in one terminal:

```bash
npm run build                                   # from the repository root
contrib/formula-service/bin/elo-formula-service
# elo-formula-service: 14 formulas from …/formulas, on http://127.0.0.1:8080
```

`--port N` if 8080 is taken, `--timeout MS` and `--max-heap MB` for the caps,
and a directory of your own as the one argument to serve that catalogue
instead.

Starting is itself a check: it refuses to come up unless every bundle validates
*and* every case of every formula passes.

### In a browser

Open <http://localhost:8080/>, which is the catalogue — fourteen questions, each
linking to the formula that answers it.

| Open | To see |
| --- | --- |
| `/order-pricing` | fill the form, press **Answer**: you land on a URL whose body *is* the answer, with no JavaScript anywhere |
| `/leap-year` | the case table, where each case name is a link that runs that case |
| `/order-lines` | no form — its input is a table — but its columns and the `curl` that sends one |
| `/iban` | open **What runs**: the program itself, and links to the five files it came from |

### With curl

```bash
curl localhost:8080/ | python3 -m json.tool | head -20        # the index
curl 'localhost:8080/?tag=banking&per_page=5'                 # filtered, paged
curl localhost:8080/iban -D- -o /dev/null                     # the alias: Content-Location, no-cache
curl localhost:8080/iban@1.0.0/types.elo                      # a file of the bundle, verbatim
curl 'localhost:8080/iban/call?iban=BE68+5390+0754+7034'      # a linkable answer
curl localhost:8080/iban@1.0.0/openapi.json | python3 -m json.tool | head -30
```

Every refusal of §5 is one request away:

```bash
curl -X POST -H 'content-type: application/json' -d '{"year":1500}' \
     localhost:8080/leap-year/call      # 422 constraint `gregorian`, on field `year`
curl -X POST -H 'content-type: application/json' -d '{}' \
     localhost:8080/leap-year/call      # 422 missing
curl -X POST -H 'content-type: text/csv' -d 'iban' \
     localhost:8080/iban/call           # 415: a table, for a formula taking a record
curl -H 'accept: application/pdf' localhost:8080/iban@1.0.0   # 406
```

A table in and a table out:

```bash
printf 'description,unitPrice,quantity\nWidget,19.99,3\nGadget,5,10\n' \
  | curl -s -X POST -H 'content-type: text/csv' -H 'accept: text/csv' \
         --data-binary @- localhost:8080/order-lines/call
# description,quantity,gross,discount,amount
# Widget,3,59.97,0,59.97
# Gadget,10,50,0,50
```

### The claim worth checking yourself

`Accept` hands you the exact program that answered, so run it:

```bash
curl -s -H 'accept: text/x-ruby' localhost:8080/iban@1.0.0 > /tmp/iban.rb
ruby -e 'f = eval(File.read("/tmp/iban.rb")); p f.call({iban: "BE68539007547034"})'
# {valid: true, country: "BE", formatted: "BE68 5390 0754 7034"}
```

Symbol keys there are Elo's Ruby input convention, not this service's.
`text/x-python` works the same way with string keys, and
`application/javascript` with node.

### Caching, and the caps

```bash
E=$(curl -s -D- -o /dev/null localhost:8080/iban@1.0.0 | awk '/^ETag/{print $2}' | tr -d '\r')
curl -s -o /dev/null -w '%{http_code}\n' -H "If-None-Match: $E" localhost:8080/iban@1.0.0
# 304
```

Every formula in the catalogue is fast, so a real timeout cannot be provoked
with them — give a second service an absurd cap to see the path:

```bash
contrib/formula-service/bin/elo-formula-service --port 8081 --timeout 1
curl 'localhost:8081/leap-year/call?year=2024'
# {"cap":"time","message":"the call did not finish within its time cap of 1ms"}  [503]
```

## What checks it

```bash
npm run test:integration   # the contract, in process: 95 assertions for the service
npm run test:webspicy      # the black-box suite: 52 examples, 24 counterexamples
TZ=UTC npm run test:acceptance   # every case of every bundle, on JS, Ruby and Python
```

- `test/integration/formula-service.integration.test.ts` — the contract: the
  status codes, the headers, the error shapes, the negotiation, the caps. It
  also POSTs **every case of every formula** and checks each answers `200`
- `test/integration/formula-bundle.integration.test.ts` — the bundle format,
  over every bundle of the catalogue
- `test/acceptance/test-formulas.sh` — every case of every bundle, run on
  JavaScript, Ruby and Python. That is where a formula is proved right; the
  service tests prove it is *served* right
- [`webspicy/`](./webspicy) — the **black-box specification**, below

## The specification

[`webspicy/`](./webspicy) specifies this service the way a client sees it: one
`.yml` per resource, each an operation with an input, an output and an error
schema in [Finitio](https://www.finitio.io/), its pre- and postconditions in
prose, and examples and counterexamples that illustrate both.

```bash
gem install webspicy bundler
npm run test:webspicy                             # boots a service, runs the suite
contrib/formula-service/webspicy/run.sh _one/call/post.yml   # one specification
LOG_LEVEL=DEBUG npm run test:webspicy             # with the requests and responses
```

Thirteen files, 52 examples and 24 counterexamples over every service there
is: the index and its page, the descriptor, the page, the four compiled
representations, the bundle files, the manifest, the form, the two OpenAPI
documents, and `/call` three ways — JSON, a query string, and a table.

**Webspicy needs Ruby gems**, which `run.sh` installs from the suite's own
`Gemfile` on first use (`gem install bundler` if you have none). The `Gemfile`
pins `http` to 5.x: webspicy 1.1 allows 6 and calls its verb methods the way
5 took them, so every request fails with `wrong number of arguments` on 6.

Three conditions are automated rather than documentary:

- **`It supports the ETag/If-None-Match caching protocol`** — webspicy's own,
  which re-requests with the validator and expects a `304`, then with a wrong
  one and expects a body.
- **`Every case it documents is the answer the call gives`** — ours
  (`webspicy/support/postconditions/`), which POSTs every case of the formula
  just described to its own `call` link and compares. That is §3's claim that
  the documentation of the API is its test suite, turned into a check — and it
  found a real bug the day it was written.
- **`It is a valid OpenAPI document`** — ours too, over webspicy's own
  `openapi3_parser`: a generated document is either valid or useless, and an
  assertion on a key or two would not have caught the invalid field it did.

It is **not** wired into `npm test`: it needs a second toolchain (Ruby) and a
running service, which is the point of a black-box suite rather than a defect
in it. The in-process integration tests are the ones CI runs.

Why specify twice? The two suites fail for different reasons. The TypeScript
one knows what the service is made of and pins its internals; this one knows
only what it answers, and its Finitio types are written in the client's type
system rather than Elo's — so it catches what a client would trip over, which
is exactly what happened. It is also what webspicy generates a mock server
from, and a second opinion on the OpenAPI of §9.

### Checking that the suites check anything

A green suite is a claim, and the cheapest way to judge it is to break the
thing it covers and watch:

| Break | What should go red |
| --- | --- |
| `noneMatch` in `src/service.ts`, returning `false` | every ETag example, with `304 expected` |
| the `toJson` of `cases` in `src/catalogue.ts` | the case/call postcondition, naming the date it now disagrees about |
| a `description:` added to a media type in `src/openapi.ts` | the OpenAPI validity postcondition |
| a label in a `fields.elo`, with `<script>` in it | the escaping test in the integration suite |

Each of those is how the corresponding check was arrived at, in that order:
written, seen red, then believed.
