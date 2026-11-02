# A `.elo` file is one program, not one expression per line

> Reported while reviewing 0193: `examples/test.elo` is a type prelude and a
> multi-line expression, which is exactly what the prelude was built for, and
> neither CLI accepts it.

## Symptom

```elo
Age = Int(a | a >= 0)
Person = {
  name: String,
  age: Age
}

{
  name: 'Alice',
  age: '30'
} |> Person
```

```
$ eloc examples/test.elo
Compilation error: Error: Line 7: Error: Expected IDENTIFIER but got EOF at line 1, column 2
$ elo examples/test.elo
Error on line 7: Error: Expected IDENTIFIER but got EOF at line 1, column 2
```

Both CLIs read a file by splitting it on newlines and compiling **each line as
its own program** (`src/eloc.ts`, `src/elo.ts`). So an expression that spans
lines is handed to the parser in pieces, and `{` on line 7 is a complete
program as far as the compiler is concerned.

## Why it is wrong

That splitting exists for one reason: the fixture corpus is a list of
one-line `assert(...)` expressions, and the acceptance runners want one line of
emitted code per line of source so they can be compared and executed
line-wise.

**That is a test convention, not a property of the language.** Nothing in Elo
says a newline ends an expression — the lexer treats it as whitespace, `let`,
objects, schemas and lambdas all span lines happily, and `-e` accepts a
multi-line expression today. The convention was sitting in the CLI, where
every user meets it, instead of in the test harness that needs it.

It also makes the type prelude half-useless: its point is to declare the
schemas of a file, and a declared schema is usually too wide to fit on a line.

## What it should be

- `eloc file.elo` and `elo file.elo` read the file as **one program**: an
  optional type prelude, then one expression, newlines insignificant.
- The per-line reading becomes an explicit opt-in — `--lines` — used by
  `scripts/regenerate-fixtures.sh` and by the acceptance runners when they
  recompile with `--optimize`.
- A file holding only type definitions stays valid and compiles to nothing, as
  0193 made it.
- A file holding two expressions is a parse error in the default mode, and the
  error should say so rather than leaving the reader to guess.

## Tests

The fixtures cannot cover this: a fixture *is* the per-line convention. The
assertions belong in `cli.integration.test.ts`, over both CLIs:

- a multi-line expression, with and without a prelude, compiles and evaluates
- `examples/test.elo` evaluates to `{name: 'Alice', age: 30}`
- `--lines` still emits one line per line, and still scopes them all under the
  file's prelude
- two expressions on two lines, without `--lines`, is refused with a message
  that names the flag

## Addendum: what was done

Both CLIs now read a source as **one program**, and the per-line reading is an
opt-in `--lines`.

`examples/test.elo` — the report — compiles and evaluates:

```
$ elo examples/test.elo
{"name":"Alice","age":30}
```

### Red first

Seven assertions in `cli.integration.test.ts` under *"A file is one program"*,
**six of them red** before the change: a multi-line expression, a prelude plus
a multi-line expression on both CLIs, `examples/test.elo` itself, the refusal
of a second expression, and a diagnostic carrying the file's own line. The
seventh — a file of types and nothing else — was already green, since 0193
made that case blank lines either way.

### One reading, two conventions

`readProgram(body, lines)` is the whole of it, in each CLI:

- without `--lines`: the body is one source, and a body that is blank after
  its prelude holds no expression at all (so a types-only file still compiles
  to nothing);
- with `--lines`: one source per line, blanked where a line carries no
  expression, which keeps the emitted code aligned with the source line by
  line.

The type prelude is lifted off the top in both cases, so the definitions scope
the program either way. Locations stay right in both: the prelude is replaced
by whitespace rather than removed, so a diagnostic in a whole program points at
its real line and column, and the `Line N:` prefix is now only added where it
means something — in `--lines` mode.

### The error a fixture-shaped file gets

`parse` used to say *"Expected EOF but got NUMBER at line 2, column 1"* for a
source holding two expressions, which says nothing to the author who wrote
two. It now says what ended where, and the CLIs add the way out:

```
Compilation error: Error: Unexpected NUMBER after the end of the expression at line 2, column 1
hint: a source is one expression, newlines included. Pass --lines to read it as one expression per line instead.
```

The CLIs recognise that case through `TRAILING_INPUT`, exported from the
parser so the two sides cannot drift apart.

### The test harness asks for the convention it needs

`scripts/regenerate-fixtures.sh` and the four acceptance runners (in their
`--optimize` path) now pass `--lines`. Regenerating the whole corpus produced
**no diff**: the convention is unchanged where it is actually wanted, it is
simply no longer the default everywhere else. Three CLI tests that were
asserting the per-line behaviour say `--lines` now, which is what they were
always testing.

`CLAUDE.md` says so too, next to the rule that every fixture line is an
assert: that rule and `--lines` are the same convention, and a future reader
should not have to infer one from the other.
