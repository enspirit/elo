# The formula service

A REST API over a catalogue of [formula bundles](./formulas/BUNDLE.md), and the
thirteen formulas it ships with.

```bash
npm run build                                   # from the repository root
contrib/formula-service/bin/elo-formula-service --port 3000

curl 'http://localhost:3000/'
curl 'http://localhost:3000/iban@1.0.0'
curl 'http://localhost:3000/iban/call?iban=BE68+5390+0754+7034'
# {"valid":true,"country":"BE","formatted":"BE68 5390 0754 7034"}
```

Nothing in here is part of the compiler, and that is the point: a bundle is a
convention over files, and a service over bundles is a *host* — so this lives
beside the editor plugins and the sandboxes rather than in `src/`. Copy it.

```
formulas/      the catalogue: thirteen bundles, and BUNDLE.md, the format
src/bundle.ts  the format's reference implementation: read, check, generate
src/catalogue.ts  a catalogue, validated and compiled, once, at boot
src/service.ts    the HTTP contract: routing, negotiation, the error mapping
src/sandbox.ts    one call, under a time and a memory cap
src/answer.ts     how an answer becomes JSON, from what Output declares
src/server.ts     node:http, and the command line
```

## What it serves

| | |
| --- | --- |
| `GET /` | the index; `?tag=`, `?q=`, `?page=`, `?per_page=` |
| `GET /tax/be/` | the same, under a folder |
| `GET /{id}` | the latest version, named in `Content-Location` |
| `GET /{id}@{version}` | the descriptor — or the program, by `Accept` |
| `GET /{id}@{version}/types.elo` | the five files of the bundle, verbatim |
| `POST /{id}@{version}/call` | one input, one answer |
| `GET /{id}@{version}/call?…` | the same, linkable |

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
published it. For the thirteen that is a few hundred evaluations and
milliseconds, and it means a running service has demonstrated that every
formula in it answers what its documentation says.

## What is not here yet

This is phases 1 to 3 of the plan. Deliberately absent, each answering `404`
or `406` rather than something approximate:

- **the HTML page and `/form`** — `fields.elo` is a form as data, so this is a
  template over data, not per-formula code
- **formats past JSON** — YAML, and `text/csv`/XLSX for a formula whose `Input`
  and `Output` are lists, over Elo's own `FormatAdapter` registry
- **`openapi.json`**, per formula and for the catalogue
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

## What checks it

- `test/integration/formula-service.integration.test.ts` — the contract: the
  status codes, the headers, the error shapes, the negotiation, the caps. It
  also POSTs **every case of every formula** and checks each answers `200`
- `test/integration/formula-bundle.integration.test.ts` — the bundle format,
  over every bundle of the catalogue
- `test/acceptance/test-formulas.sh` — every case of every bundle, run on
  JavaScript, Ruby and Python. That is where a formula is proved right; the
  service tests prove it is *served* right
