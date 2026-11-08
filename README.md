# What is Elo ?

[![CI](https://github.com/enspirit/elo/actions/workflows/ci.yml/badge.svg)](https://github.com/enspirit/elo/actions/workflows/ci.yml)

A simple, well-designed, portable and safe data expression language that
compiles to Ruby, JavaScript, Python and PostgreSQL.

**[Try Elo online](https://elo-lang.org/)** - Interactive playground and documentation

## Why ?

No-Code tools like Klaro Cards generally require an expression language for user
to manipulate data easily. This language must be :

- simple, because No-Code tools are used by non-tech people
- portable, because they are implemented in various frontend/backend/db technologies
- safe, because end-users writing code yield serious security issues
- well-designed, because there are too many ill-designed programming languages already

See also the Related work section below.

## Current Features

- **Arithmetic expressions** with scalars and variables
- **Boolean expressions** with comparison and logical operators
- **Temporal types** with dates, datetimes, and ISO8601 durations
- **Infix notation** (standard mathematical notation)
- **Arithmetic operators**: `+`, `-`, `*`, `/`, `%`, `^` (power, plus string repeat and array concat)
  - `/` is **real division** on every target: `7 / 2` is `3.5`, never 3. Ruby
    and PostgreSQL truncate integer division natively, so Elo compiles to
    `fdiv` and to a `double precision` cast there.
  - `%` is **floored** on every target: the result takes the sign of the
    *divisor*, so `-7 % 3` is `2` and `7 % -3` is `-2`. That keeps `x % n`
    inside `[0, n)` for a positive `n`, which is what a cycle like `day % 7` is
    written for. JavaScript and PostgreSQL take the sign of the dividend
    natively, so Elo corrects them.
  - `^` yields a **Float**, even on two whole numbers: `2 ^ -1` is `0.5` and
    nothing tells the compiler the exponent's sign, so `round`, `floor`,
    `ceil` and `/` all treat a power as a Float. It never yields a Rational
    either: Ruby's `**` answers `(1/2)` for `2 ^ -1`, which Elo converts.
  - `typeOf` inspects the *value*, not the declared type, and JavaScript has a
    single number type — so `typeOf(2.0)` is `'Int'` there and `'Float'` on the
    other three. A whole-valued Float is the one case where `typeOf` is
    target-dependent.
  - On a **duration**, `*` by a whole number and `-` between two durations keep
    the calendar components, so `D2026-03-01 + P1M * 2` is `D2026-05-01` and
    `D2026-01-31 + (P1M - P10D)` is `D2026-02-18`. Multiplying by a fraction or
    dividing cannot — half a calendar month is not a thing — so those collapse
    the duration to its nominal length, where a month is 30 days.
- **Comparison operators**: `<`, `>`, `<=`, `>=`, `==`, `!=`
- **Logical operators**: `&&`, `||`, `!`
- **Unary operators**: `-`, `+`, `!`
- **Pipe operator**: `|>` for function chaining (Elixir-style), parentheses optional
- **Alternative operator**: `|` for fallback chains (returns first defined value)
- **Type selectors**: `Int()`, `Float()`, `Bool()`, `String()`, `Null()`, `Date()`, `Datetime()`, `Duration()`, `Interval()`, `Data()` for parsing and converting values
- **Type definitions**: Finitio-like schema validation with `let Person = { name: String, age: Int } in data |> Person`. Schema field types are `Int`, `Float`, `Bool`, `String`, `Null`, `Date`, `Datetime`, `Duration`, `Data`, and `.` for any value
- **Type prelude**: a `.elo` file may open with type definitions — `Person = { name: String, age: Int }` on their own lines — which scope the expression that follows. A file of definitions only is a valid file
- **Imports**: a `.elo` file may open with imports — `import { Person, double } from './shared'` and `import './shared' as s` — which bring in the types and the value another file declares. Resolved at compile time, so the emitted code stays self-contained
- **Lambdas**: `fn(x ~> x * 2)` or `x ~> x * 2` (sugar) for anonymous functions
- **Guards**: `guard condition in body` for runtime validation with `check` for postconditions
- **Input variable**: `_` for accessing external data passed to expressions
- **Array iteration**: `map`, `filter`, `reduce`, `any`, `all` (JS/Ruby only)
- **Period boundaries**: `startOfDay`, `endOfDay`, `startOfWeek`, `endOfWeek`, `startOfMonth`, `endOfMonth`, `startOfQuarter`, `endOfQuarter`, `startOfYear`, `endOfYear`
- **Duration conversion**: `inYears`, `inQuarters`, `inMonths`, `inWeeks`, `inDays`, `inHours`, `inMinutes`, `inSeconds` for converting durations to float values (approximate for calendar units)
- **Interval functions**: `start(interval)`, `end(interval)`, `union(i1, i2)`, `intersection(i1, i2)`, `Duration(interval)` for working with time intervals
- **Numeric functions**: `abs`, `round`, `round(x, n)` to n decimal places, `floor`, `ceil`
- **List functions**: `contains`, `find`, `sort`, `sortBy`, `count`, `sum`, `sum(list, initial)`, `avg`, `min`, `max` (on a list or on two values), `reverse`, `unique`, `flat`, `join(list, separator)`, `split(string, separator)`
- **String functions**: `length`, `upper`, `lower`, `trim`, `trimStart`, `trimEnd`, `replace`, `replaceAll`, `padStart`, `padEnd`, `substring`, `slice`, `split`, `reverse`, `contains`, `indexOf`, `isEmpty`, `isBlank`, `startsWith`, `endsWith`, `concat`, `chr`, `extract`
- **Literals**:
  - Numbers: `42`, `3.14`
  - Booleans: `true`, `false`
  - Strings: `'hello'`
  - Null: `null`
  - Dates: `D2024-01-15`
  - DateTimes: `D2024-01-15T10:30:00Z` — a date or a datetime is a *zone-free*
    wall clock: it means the time it spells, and the host's timezone never
    moves it. `NOW` and `TODAY` read the host's local clock, as elsewhere
  - Durations: `P1D`, `PT1H30M`, `P1Y2M3D` (ISO8601)
  - Objects: `{name: 'Alice', age: 30}`
  - Arrays: `[1, 2, 3]`, `['a', 'b']`, `[1, 'mixed', true, null]` (mixed and ragged-nested lists do not compile to SQL — see below)
  - DataPaths: `.x.y.z`, `.items.0.name` (for navigating data structures)
- **Data functions**: `fetch(data, .path)` for safe access, `fetch(data, {x: .a, y: .b})` and `fetch(data, [.a, .b])` for multi-path extraction, `patch(data, .path, value)` for immutable updates, `merge(a, b)` and `deepMerge(a, b)` for merging objects
- **Parentheses** for grouping
- **Portability limits**: lambdas, higher-order list functions and `Data`
  schemas compile to JavaScript, Ruby and Python only. A **list whose elements
  have different types**, and a **list of lists of different lengths**, compile
  to the other three but not to SQL: a PostgreSQL array carries one element
  type and nests only rectangularly, so `[1, 'two']` and `[[1], [2, 3]]` have
  no array to compile to. The SQL compiler says so rather than emitting
  something PostgreSQL rejects. `[1, 1.5]` and `[D2024-01-01, NOW]` are fine —
  PostgreSQL unifies numbers and temporals exactly — and `flat([[1], [2, 3]])`
  is fine too, because it concatenates the parts instead of building the nested
  list. For data that genuinely mixes types, `Data` carries it as `jsonb`,
  which has no such restriction.
- **Multi-target compilation**:
  - Ruby (using `**` for power, `&&`/`||`/`!` for boolean logic, `Date.parse()`, `DateTime.parse()`, `ActiveSupport::Duration.parse()`)
  - JavaScript (using `Math.pow()` for power, `&&`/`||`/`!` for boolean logic, `new Date()`, `Duration.parse()`)
  - Python (using `**` for power, `and`/`or`/`not` for boolean logic, `datetime` module)
  - PostgreSQL (using `POWER()` for power, `AND`/`OR`/`NOT` for boolean logic, `DATE`, `TIMESTAMP`, `INTERVAL` for temporals)

## Security

Elo is designed to run code written by people you don't fully trust. It gives
you a **capability sandbox by construction** — compiled code can't do I/O, can't
`eval`, can't reach host globals — and the compiler itself always terminates and
never emits code you didn't write.

It does **not** bound how much time or memory a legal expression may use. If the
expressions are untrusted, run the compiled output under a memory limit and a
timeout, and pass it plain data (not live host objects). See the
[security page](https://elo-lang.org/security), the
[Running Elo safely](https://elo-lang.org/running-safely) guide, and the
copy-paste reference sandboxes in [`contrib/sandboxes/`](contrib/sandboxes).

Found a security issue? See the bug bounty program on the security page.

## Installation

```bash
npm install
npm run build
```

## Testing

Elo uses a comprehensive test suite that verifies:
- **Unit tests**: Parser, AST, and compiler components
- **Integration tests**: End-to-end compilation output
- **Acceptance tests**: Compiled code execution in real runtimes (Ruby, Node.js, PostgreSQL)

```bash
npm run test:unit
npm run test:integration
npm run test:acceptance
```

## Command Line Interface

Elo provides two CLI tools:
- `eloc` - The compiler (for developers integrating Elo into their products)
- `elo` - The evaluator (for quickly running Elo expressions)

### Compiler (eloc)

The compiler translates Elo expressions to Ruby, JavaScript, or SQL:

```bash
# Compile expression to JavaScript (default)
./bin/eloc -e "2 + 3 * 4"

# Compile expression to Ruby
./bin/eloc -e "2 + 3 * 4" -t ruby

# Compile expression to Python
./bin/eloc -e "2 + 3 * 4" -t python

# Compile expression to SQL
./bin/eloc -e "2 + 3 * 4" -t sql

# Compile with prelude (includes required runtime libraries)
./bin/eloc -e "NOW + PT2H" -t ruby -p

# Output only the prelude (useful for bundling)
./bin/eloc --prelude-only -t js

# SQL's prelude is installed in the database once, not prepended (see below)
./bin/eloc --prelude-only -t sql | psql "$DATABASE_URL"

# Compile a file: one program — an optional type prelude, then one expression
./bin/eloc input.elo -t ruby

# Compile a file of one-line expressions, one line of output per line of source
./bin/eloc expressions.elo -t ruby --lines

# Compile to file
./bin/eloc -e "2 + 3" -t ruby -f output.rb

# Compile from stdin
echo "2 + 3 * 4" | ./bin/eloc -
cat input.elo | ./bin/eloc - -t ruby

# Report the type errors a compile does not refuse on its own
./bin/eloc --typecheck -e "if 1 then 2 else 3"
# 1:4: error: if condition must be Bool, got Int [non-bool-condition]
```

Every compile-time refusal names **where** it is — the line, the column, and
the file when the source came from one. With `--lines` the line counts from the
top of the file, and a refusal inside an imported module names the module:

```
./bin/eloc main.elo
# Compilation error: Error: Unknown function rond(Any, Int) at line 1, column 18 of helper.elo

./bin/eloc twice.elo
# Compilation error: Error: Duplicate type definition 'T' at line 2, column 1 of twice.elo (first at line 1, column 1)
```

Options:
- `-e, --expression <expr>` - Expression to compile
- `-t, --target <lang>` - Target language: `ruby`, `js` (default), `python`, `sql`
- `-p, --prelude` - Include necessary library imports/requires (not for `sql`)
- `--prelude-only` - Output only the prelude (no expression needed)
- `--lines` - Read the source as one expression per line, instead of as one program

### A file is one program

A `.elo` file holds **one program**: optional imports, an optional type
prelude, then one expression. Newlines inside that expression mean nothing, so a schema
or a `let` may be laid out over as many lines as it needs. A file that declares
types and no expression is valid too, and compiles to nothing.

`--lines` asks for the other reading — every line is its own expression, and
every line of source gives one line of emitted code. That is what the test
fixtures are written in, where each line is a self-contained `assert(...)`;
`scripts/regenerate-fixtures.sh` and the acceptance runners pass it. A source
holding two expressions without `--lines` is a parse error that says so.

### Imports

A program may open with imports, before its type prelude:

```elo
import { Person, Age } from './types'
import { double } from './reusable'
import './reusable' as r

People = [Person]

{ name: 'Alice', age: '30' } |> Person
```

A module is an ordinary `.elo` file, so there is nothing new to write in one:
its **type prelude** is what it exports as types, and its **expression** is
what it exports as a value.

```elo
# types.elo — exports the types Age and Person, and no value
Age = Int(a | a >= 0)
Person = { name: String, age: Age }
```

```elo
# reusable.elo — exports the names double and one
let double_fn = fn( x ~> x * 2 )
in { double: double_fn, one: 1 }
```

**Case decides** what a name in an import list means, as it does everywhere
else in Elo: `Person` comes from the module's type prelude, `double` from a
property of its value. `import './m' as r` binds the module's value alone,
reached by ordinary member access (`r.double(1)`); it does not bring the
module's types in, which is what the named form is for.

A path is relative to the file that imported it (`./types`, `../shared/types`),
with `.elo` added. A bare `'types'` is refused, to keep that spelling free for
a future package. Cycles are refused, naming the chain.

**A name the module does not export is refused**, naming the module and the
line the import is written on — for a value as well as for a type, so a typo
is not something you meet as a `null` later. A module whose expression is an
object literal has its exports written down, which is how every module above
is written. One whose expression is anything else (`_ |> T`, an `if`, a member
read) has keys that only exist at run time, so any name is accepted from it.

Imports are resolved **at compile time, by inlining**: the emitted code is one
self-contained expression, as it is without them. So there is nothing to
deploy alongside it, and nothing is read at runtime. A module appears **once**
in that expression, however many others import it: the modules of a program are
bound at its root, in dependency order, and an import is a reference to one of
those bindings. A module's expression is therefore also evaluated once, so
splitting a program into small modules costs neither size nor work.

An import is the one thing in Elo that makes the **compiler** read a file, so a
host that compiles sources it does not trust must not hand it a filesystem:
`loadProgram` takes the loader as an argument and refuses an import when there
is none, which is what the playground and the programmatic `parse()` do. `eloc`
and `elo` do read the filesystem, as the tools of whoever runs them.

Imports inherit the portability of what they bring in, and nothing more: an
imported type is a type definition and an imported function is a lambda, so a
program that imports either compiles to JavaScript, Ruby and Python, and the
SQL target refuses it exactly as it refuses the construct written inline.

### The prelude

Compiled Elo needs a small runtime in its target. `--prelude-only` emits it,
and every target has one:

| Target | Prelude | How it is used |
| --- | --- | --- |
| `js` | `require('luxon')` | prepended to the expression (`-p`) |
| `ruby` | `require 'date'`, `active_support` | prepended to the expression (`-p`) |
| `python` | imports and helper functions | prepended to the expression (`-p`) |
| `sql` | `elo_*` PL/pgSQL functions | **installed in the database once** |

SQL is the exception, and it matters for deployment: the emitted SQL is a pure
expression, and an expression has nowhere to define a function. So the SQL
prelude is a set of `CREATE OR REPLACE FUNCTION` statements that must be
applied to the database **before** any compiled Elo runs there:

```bash
./bin/eloc --prelude-only -t sql | psql "$DATABASE_URL"
```

Every definition is `CREATE OR REPLACE`, so re-running it is idempotent — on
each deploy is a fine place for it. `eloc -p -t sql` refuses rather than emit
statements no host can run as an expression.
- `--typecheck` - Report the *advisory* static type errors to stderr, exit
  non-zero if any (a call with no matching signature is refused anyway)
- `--strict` - Also report anything the checker cannot type (implies `--typecheck`)
- `--input-type <type>` - Declare the type of `_` (implies `--typecheck`)
- `--optimize` - Compile with the checker's types (implies `--typecheck`)
- `--force-dynamic` - The opposite of `--optimize`: compile as though no
  operand type were known, so every call takes the runtime dispatcher. The two
  must answer the same; a difference is a bug in Elo, and Elo's own suite runs
  the whole corpus through both
- `-f, --file <path>` - Output to file instead of stdout
- `-h, --help` - Show help message

### Type checking

Some of what the checker knows is not optional. A call whose argument types are
known and that matches **no signature** is wrong whatever the target, so every
compile refuses it — flag or no flag:

```bash
./bin/eloc -e "startOfMonth('2026-03-15')"
# Compilation error: Error: No signature of startOfMonth accepts
# startOfMonth(String). Known: startOfMonth(Date), startOfMonth(Datetime)
# at line 1, column 1
```

An argument the checker *cannot* type is a different matter and still compiles:
`startOfMonth(_.d)` on an undeclared input is accepted, and `--strict` below is
how you ask about it.

`--typecheck` reports the rest, which is advisory: conditions that are not
`Bool`, a field a declared schema does not have, a value that may be null used
where null is not accepted. Each problem is reported with its line and column,
it reports every problem it finds in one pass, and it does not change the
generated code — the same code is emitted with or without the flag.
(`--optimize`, below, is the one flag that does change it.)

The checker is deliberately silent about what it cannot know. The input `_` has
type `Any` until it is coerced, so a call with an unknown argument type is
accepted without complaint.

Declared types are what give it something to work with — and Elo already has
them. A schema is validated and coerced at runtime, so past the coercion the
value provably has the declared shape, and the checker reads it:

```elo
let Order = { total: Int, customer: { name: String }, lines: [{ price: Int }] },
    order = _ |> Order
in order.total * 2
```

Inside the `in` body it then reports:

- `order.totl` — a field the schema does not declare (the worst class in
  practice, since it fails *silently* at runtime: `undefined`, `nil`, `NULL`)
- `upper(order.total)` — a declared field used at the wrong type
- `order.customer.nam` — a wrong path through nested schemas
- `map(order.lines, fn(l ~> upper(l.price)))` — lambda parameters are typed
  from the list's element type
- `year(order.total)` — a stdlib call on a declared field

Unions (`{ x: Int|String }`) are accepted for an operation every member
supports and reported for one that only some do. Predicates inside a subtype
constraint are checked too, so `Int(i | upper(i))` is reported.

Optional fields are strict about null. `:?` is a statement that the field may
be absent, so `{ a :? Int }` makes `k.a` an `Int|Null` and `k.a + 1` is
reported. Any of the usual ways of handling it clears the report:

```elo
k.a | 0                                 # fallback
if isNull(k.a) then 0 else k.a + 1      # tested
if isNotNull(k.a) then k.a + 1 else 0
guard isNotNull(k.a) in k.a + 1         # guarded
```

Narrowing is deliberately narrow: `isNull`/`isNotNull` on a path, `&&`-chained,
plus the `|` operator. The checker does no boolean algebra, so
`isNotNull(a) || isNotNull(b)` establishes nothing — use `|`.

`--input-type` is the same thing supplied from outside, for a host that already
knows the shape of its data and would rather not make the author restate it. It
takes an Elo type expression, so there is one spelling of a schema:

```bash
./bin/eloc --input-type '{ total: Int }' -e "upper(_.total)"
# 1:1: error: No signature of upper accepts upper(Int). ...
```

`--strict` turns the silence about unknown types into a diagnostic, which in
practice means *declare your input*. It is how a host can require the idiomatic
form and then promise that a saved formula will not fail at evaluation for type
reasons. Functions that genuinely accept anything — `isNull`, `typeOf`,
`assert`, `fetch` — stay quiet under it.

### Compiling with the checker's types

`--optimize` hands what the checker found back to the code generator.

A declared type needs no flag: the compiler reads the declaration itself, so a
field of a declared schema is emitted as the type it was declared to be.

```bash
./bin/eloc -t ruby -e "let T = { a: Int, b: Int }, k = _ |> T in k.a - k.b"
# ... k[:a] - k[:b]
```

What the flag adds is what the checker works out and the compiler does not —
chiefly a lambda parameter typed from the element type of a declared list,
which is inference about a *call* rather than the shape of a declaration:

```bash
./bin/eloc -t js -e "let S = { xs: [Int] }, s = _ |> S in map(s.xs, fn( x ~> x * 2 ))"
# ... s.xs.map((x) => kMul(x, 2))

./bin/eloc -t js --optimize -e "let S = { xs: [Int] }, s = _ |> S in map(s.xs, fn( x ~> x * 2 ))"
# ... s.xs.map((x) => x * 2)
```

So the gain is a real operation instead of a function call per operation, and a
smaller output, wherever a type is known.

**The benefit is proportional to how much the program declares.** An undeclared
`_` tells the checker no more than it tells the compiler, so `--optimize`
changes nothing at all for it.

It refuses to compile from the types of a program it reported on: on a node
with a diagnostic the recorded type is a guess rather than a conclusion, and
emitting from it would turn a visible error into silently wrong code. The
output in that case is the unannotated one, and the run fails.

The two emissions must agree, which is the property worth checking rather than
the size: every line of the fixture corpus is executed both ways on all four
targets on every test run.

### What the checker does not see

The checker is a single pass over the expression, and it stays silent rather
than guessing. Its blind spots:

- **A `let`-bound function is checked once, not per call site**, so its
  parameters stay `Any`: `let f = fn(x ~> upper(x)) in f(1)` is not reported,
  though the inline `upper(1)` is.
- **Data paths and `fetch` are opaque** — they reach into data by a key
  computed at runtime, so `upper(fetch(k, .a))` is not reported even when `k`
  is declared.
- **Wide unions widen to `Any`.** Member combinations are tried up to a small
  cap, past which the checker stops reporting rather than do exponential work.
- **An undeclared `_` tells it nothing** — the headline limitation, and the one
  you can do something about.

What it guarantees in the other direction is the part worth relying on: **if it
is silent, every target compiles the program.** A corpus of ~9000 expressions
built from the signature table is checked against all four compilers on every
test run to keep that true.

It says nothing about *runtime* cost or failure: a well-typed expression can
still divide by zero, exhaust memory or take a long time. It is a correctness
and portability tool, not a security feature — the sandbox guarantees in
[the security model](https://elo-lang.org/security) hold whether or not you
run it.

### Evaluator (elo)

The evaluator compiles to JavaScript and immediately evaluates the expression:

```bash
# Evaluate a simple expression
./bin/elo -e "2 + 3 * 4"
# Outputs: 14

# Evaluate with input data (JSON)
./bin/elo -e "_.x + _.y" -d '{"x": 1, "y": 2}'
# Outputs: 3

# Evaluate with CSV input data
./bin/elo -e "map(_, fn(r ~> r.name))" -d @data.csv -f csv
# Outputs: ["Alice","Bob"]

# Evaluate with data from file (format auto-detected from extension)
./bin/elo -e "_.name" -d @data.json

# Output in different formats
./bin/elo -e "{a: 1, b: 2}" -o elo    # Elo code format
./bin/elo -e "[{name: 'Alice'}]" -o csv  # CSV format

# Evaluate a .elo file: one program, as for eloc
./bin/elo program.elo

# Evaluate a file of one-line expressions, one result per line
./bin/elo expressions.elo --lines

# Pipe data through stdin
echo '{"x": 10}' | ./bin/elo -e "_.x * 2" --stdin
# Outputs: 20
```

Options:
- `-e, --expression <expr>` - Expression to evaluate
- `-d, --data <data>` - Input data for `_` variable (or `@file` to read from file)
- `--stdin` - Read input data from stdin
- `-f, --input-format <fmt>` - Input data format: `json` (default) or `csv`
- `-o, --output-format <fmt>` - Output format: `json` (default), `elo`, or `csv`
- `--lines` - Evaluate each line as its own expression, instead of as one program
- `-h, --help` - Show help message

## Using Elo in JavaScript/TypeScript

The simplest way to use Elo is with the `compile()` function, which creates a callable JavaScript function from an Elo expression:

```typescript
import { compile } from '@enspirit/elo';
import { DateTime, Duration, Interval } from 'luxon';

// Compile an expression to a callable function
// Every Elo expression takes _ (implicit input) as parameter
const addTen = compile<(x: number) => number>(
  '_ + 10',
  { runtime: { DateTime, Duration, Interval } }
);
addTen(5); // => 15

// Temporal expressions work too
const inThisWeek = compile<(d: unknown) => boolean>(
  '_ in SOW ... EOW',
  { runtime: { DateTime, Duration } }
);
inThisWeek(DateTime.now()); // => true or false
```

The `runtime` option injects dependencies (like `DateTime` and `Duration` from luxon) into the compiled function. This avoids global variables and keeps the compiled code portable.

### When a call fails

A value Elo refuses raises an `EloFailure` — an ordinary `Error` that also says
**what kind** of thing failed, so a host does not have to read that back out of
the message:

```typescript
import { compile } from '@enspirit/elo';
import type { EloFailure } from '@enspirit/elo';

try {
  compile('Pos = Int(i | positive: i > 0)\nRec = { a: Pos }\n_ |> Rec')(input);
} catch (error) {
  const failure = error as EloFailure;
  failure.kind;   // 'schema' | 'missing' | 'constraint' | 'guard' | 'check'
  failure.path;   // '.a' — where in the input, for the schema kinds
  failure.label;  // 'positive' — the constraint, guard or check that named it
}
```

| Input | `kind` | `message` |
| --- | --- | --- |
| `{"a":"x"}` | `schema` | `.a: expected Int, got "x"` |
| `{}` | `missing` | `.a: expected Int, got undefined` |
| `{"a":0}` | `constraint` | `.a: constraint 'positive' failed` |
| `{"a":1,"b":2}` | `schema` | `.b: unexpected attribute` |

`kind` and `label` come from the construct that refused the value, so they are
stable. `message` is for a human and its wording is not: reading a category out
of it is how rewording a diagnostic silently breaks a host.

Ruby and Python report the same three, from their own preludes: Ruby raises a
`StandardError` answering `kind`, `path` and `label`, and Python an
`EloFailure` with those attributes. SQL has none of this — it refuses type
definitions and guards outright, so it has no such failure to report.

### Compiling a source that imports

An import makes the compiler read a file, so it is a capability the host
grants: pass a **loader**, and the `file` the source came from, which a path is
resolved against. Without a loader, an import is refused.

```typescript
import { compile } from '@enspirit/elo';
import { nodeLoader } from '@enspirit/elo/node';   // reads the filesystem

const run = compile<(input: null) => unknown>(readFileSync('main.elo', 'utf-8'), {
  runtime: { DateTime, Duration, Interval },
  loader: nodeLoader(),
  file: 'main.elo',
});
```

`nodeLoader` is behind a **second entry point** on purpose: `@enspirit/elo`
itself must stay importable in a browser, where there are no files to read.
A host may pass its own `ModuleLoader` instead — over a map of sources, a
database, or a bundler's virtual filesystem — which is sometimes what it wants.

### Reading a file of one-line expressions

`readProgram` is the `--lines` reading (see [A file is one program](#a-file-is-one-program)):
the header is lifted off once with `loadProgram` and scopes every line, which
is what the `scope` option is for.

```typescript
import { compile, loadProgram, readProgram, hasNoExpression } from '@enspirit/elo';
import { nodeLoader } from '@enspirit/elo/node';

const program = loadProgram(source, { loader: nodeLoader(), file });
for (const line of readProgram(program.body, true)) {
  if (hasNoExpression(line)) continue;     // a blank or a comment
  console.log(compile(line, { runtime, scope: program, file })(input));
}
```

## Data Format Adapters

The CLI and playground support multiple input/output formats (JSON, CSV). The format system is pluggable—you can provide custom adapters using libraries like PapaParse or SheetJS. See `src/formats.ts` for the `FormatAdapter` interface and built-in implementations.

## Lower-Level API

For more control, you can use the lower-level parsing and compilation functions:

```typescript
import { parse, compileToRuby, compileToJavaScript, compileToPython, compileToSQL } from '@enspirit/elo';

// Parse an expression
const ast = parse(`
  let
    x = TODAY,
    y = 3
  in
    assert(x + y * P1D == TODAY + P3D)
`);

// Compile to different targets
console.log(compileToRuby(ast));
console.log(compileToJavaScript(ast));
console.log(compileToPython(ast));
console.log(compileToSQL(ast));
```

## Programmatic AST Construction

A host can build an expression directly, without going through Elo source text
— what a formula builder does when the user picks fields from a menu rather
than typing. The factories produce the same AST `parse()` does, so the
compilers take it unchanged:

```typescript
import { binary, memberAccess, variable, compileToJavaScript } from '@enspirit/elo';

// Build `_.price * _.quantity - _.discount`
const field = (name: string) => memberAccess(variable('_'), name);
const ast = binary(
  '-',
  binary('*', field('price'), field('quantity')),
  field('discount')
);

compileToJavaScript(ast);   // => (function(_) { … return kSub(kMul(_.price, _.quantity), _.discount); })
```

Values come off `_`, the input, as they do in Elo source. A bare
`variable('price')` is **not** a free variable waiting to be supplied — Elo has
no such thing, so the transform refuses it with `Undefined variable: 'price'`.
Bind it with `letExpr` if you need a local:

```typescript
import { letExpr, binary, memberAccess, variable, literal, compileToJavaScript } from '@enspirit/elo';

const ast = letExpr(
  [{ name: 'rate', value: literal(0.21) }],
  binary('*', memberAccess(variable('_'), 'total'), variable('rate'))
);

compileToJavaScript(ast);
```

The AST is **protected**, not public: it may change in a minor release. Pin
`1.2.x` if you build or read one — see [Versioning](#versioning-and-the-public-interface).

## Versioning and the public interface

Elo follows [semantic versioning](https://semver.org), which is a promise about
a surface — so here is the surface. Three tiers, and the tier a thing sits in
decides what changing it costs.

**Public — changes only in a major release**

- The **language and the standard library**, and their intended semantics
- The **`elo` and `eloc` binaries**: their options, and their exit codes (`0`
  when code was produced, non-zero when the compiler refused)
- The **TypeScript entry points** for parsing, compiling, evaluating and
  type-checking — `compile`, `parse`, `compileToRuby` / `compileToJavaScript` /
  `compileToPython` / `compileToSQL`, `typecheck`, `getPrelude`, and the module
  loader entry points. `@enspirit/elo` stays importable in a browser;
  `@enspirit/elo/node` is where anything touching the filesystem lives
- Two things that live *inside* the generated code, because a host has to hold
  onto them: a failure's **`kind`, `path` and `label`** (the `message` prose is
  not promised — that is why the kinds exist), and the eleven **`elo_*` PostgreSQL
  prelude function names**, which you install in your database

**Protected — may change in a minor release, always announced in the [changelog](CHANGELOG.md)**

- The **AST**: its node shapes and its factory functions
- The type checker's **`DiagnosticCode`** set. The checker keeps working and
  keeps reporting; which code it uses for a given mistake may be renamed

**Private — no promise at all**

- The **shape of the generated code**. Do not depend on how an expression
  translates, nor on the target language's own dynamic behaviour around it. Elo
  promises what an expression *means*, not what it compiles to
- Everything else reachable from the package: `toEloCode`, the format adapters,
  `locate` / `isLocated` / `formatSourceLocation`, and anything under
  `src/compilers`, `src/bindings`, `src/ir.ts`, `src/transform.ts`,
  `src/stdlib.ts`. Being importable is not a promise

### Which version to depend on

| If you use | Depend on |
| --- | --- |
| the language, the CLIs, or `compile` / `parse` / `compileToX` — Elo as a black box | `^1.2.0` — any `1.x` |
| the AST factories or node shapes, or you branch on `DiagnosticCode` | `~1.2.0` — `1.2.x` only |

In one sentence: **use `1.x` if Elo is a black box to you; pin `1.2.x` if you
build or read an AST, or branch on diagnostic codes.**

### What counts as a breaking change

A program Elo never meant to accept is a **bug fix**, not a break. The compiler
used to accept `round('x')` and `[1, 'two']` on PostgreSQL, and emitted code
that raised or that psql rejected; refusing them breaks nothing that worked.
Where the four targets disagreed, at most one of them was right.

What makes "never meant to" checkable rather than a matter of opinion: **the
acceptance corpus is the specification.** A behaviour asserted by a fixture, on
a target, is promised. A behaviour no fixture asserts is unspecified, and making
the four targets agree on it is a fix — see `test/fixtures/`.

### Pin the behaviour you depend on

Which means: **if your code relies on something, send us an assertion for it.**
A fixture is the only thing that turns a behaviour you observed into a behaviour
Elo owes you — and it is the cheapest contribution there is, one line:

```elo
assert(startOfMonth(D2026-03-15) == D2026-03-01)
```

Drop it in the right file under `test/fixtures/`, run
`./scripts/regenerate-fixtures.sh <fixture-name>`, and open a pull request. The
suite then runs it on Ruby, JavaScript, Python and PostgreSQL on every commit,
so the day one target disagrees, it is our bug rather than your surprise.

This is genuinely the most useful thing an Elo user can contribute, for two
reasons. An assertion that **passes on all four** targets costs us nothing and
locks the behaviour down forever. An assertion that **fails on one** has found a
portability bug — most of the defects fixed in 1.2.0 were exactly that, four
targets asked the same question and one answering differently. Either way you
end up better off, and you do not need to know how the compiler works to write
one.

If you are unsure whether something is specified, grep the corpus. If it is not
there, it is not promised yet — and that is the gap worth a pull request. See
[HACKING.md](HACKING.md) for running the suite, and `CLAUDE.md` for the fixture
conventions.

## Examples

Run the examples:

```bash
npm run build
node dist/examples/basic.js     # Arithmetic expressions
node dist/examples/boolean.js   # Boolean expressions
node dist/examples/temporal.js  # Temporal expressions (dates, durations)
node dist/examples/demo.js      # Quick demo
```

## Project Structure

```
elo/
├── src/              # Compiler source code
│   ├── parser.ts     # Lexer and parser
│   ├── ast.ts        # AST definitions
│   ├── types.ts      # Type system
│   ├── ir.ts         # Intermediate representation
│   ├── transform.ts  # AST → IR transformation with type inference
│   ├── stdlib.ts     # Standard library abstraction
│   ├── compilers/    # Code generators (Ruby, JavaScript, SQL)
│   └── preludes/     # Runtime support libraries
├── test/             # Test suite
│   ├── fixtures/     # Test cases
│   ├── unit/         # Component tests
│   ├── integration/  # Compilation tests
│   └── acceptance/   # Runtime execution tests
├── examples/         # Usage examples
├── bin/eloc          # Compiler CLI
├── bin/elo           # Evaluator CLI
└── CLAUDE.md         # Developer guide
```

For detailed architecture documentation, see [CLAUDE.md](CLAUDE.md).

## Related work

Enspirit's previous research work includes a lot of places where such expressions
are used, calling for a shared solution for the future.

In many cases, observe that we require compiling expressions that amount to a
single function evaluating on a context object, sometimes a scalar (Finitio),
sometimes a current Tuple (Bmg), sometimes json data received from an API
(Webspicy), or a current Card (Klaro Cards, similar to Bmg's Tuple).

See https://elo-lang.org for more documentation.

### Finitio

The Finitio data validation language supports subtypes by constraints such as:

```finitio
PositiveInt = Int( i | i > 0 )
```

Currently, the constraint expression is written in the host language (js or ruby)
and would require a portable expression language to go further.

See https://finitio.io, https://github.com/enspirit/finitio-rb, https://github.com/enspirit/finitio.js

### Bmg

The Bmg relational algebra requires expressions for the `restrict` and `extend`
operators inspired by **Tutorial D**. We currently rely on ruby code in some cases,
but that prevents compiling relational expressions to SQL :

```ruby
r.restrict(->(t){ t[:budget] >= 120 })
r.extend(:upcased => ->(t) { t[:name].upcase })
```

See https://www.relational-algebra.dev/, https://github.com/enspirit/bmg

### Webspicy

The Webspicy test framework requires a better expression language for data assertions.
We currently rely on an hardcoded expression language that is very limited:

```
assert:
- isEmpty
- size(10)
```

See https://github.com/enspirit/webspicy

### Klaro Cards

The Klaro Cards No-Code tool uses various data expressions here and there :

- Date ranges for Date/time dimensions : `SOW ... SOW+P1W`
- Computed dimensions : `_.budget * 1.21`
- Summary functions : `min(_.budget)`

See https://klaro.cards

## Contributing

Elo follows a strict test-driven development methodology to ensure semantic equivalence across all three target languages (Ruby, JavaScript, SQL).

**Getting started**: See [HACKING.md](HACKING.md) for:
- Development environment setup (local or Docker)
- Running the test suite
- Project structure overview

**For developers and AI assistants**: See [CLAUDE.md](CLAUDE.md) for:
- Detailed development workflow
- How to add new features and operators
- Architecture documentation

**Using Elo and want to keep it working?** The single most useful contribution
is an acceptance assertion for the behaviour your code relies on — see
[Pin the behaviour you depend on](#pin-the-behaviour-you-depend-on). One line in
`test/fixtures/` turns something you observed into something Elo owes you, and
runs on all four targets on every commit. No compiler knowledge needed.

