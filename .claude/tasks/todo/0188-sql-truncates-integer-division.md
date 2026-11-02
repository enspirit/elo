# `/` truncates on SQL, where Elo says it is real division

> Found while fixing 0182: annotating a member read with its checked type made
> `{ a: 10 }.a / 4` emit `(…)::integer / 4`, which PostgreSQL answers 2. The
> annotation only exposed it — the plain case is just as wrong.

## The bug

`test/fixtures/reference/division.elo` opens with

```
# `/` is real division in Elo, in every target.
```

and has `.expected.js`, `.expected.py` and `.expected.ruby` — **no
`.expected.sql`**. So the claim has never been checked against PostgreSQL, and
it does not hold:

```
$ eloc -t sql -e "7 / 2"
7 / 2

$ psql -c "SELECT 7 / 2;"
 3
```

PostgreSQL's `integer / integer` is integer division, exactly like Ruby's,
which is why `src/bindings/ruby.ts` emits `7.fdiv(2)` and says so in a comment.
SQL has the same problem and no such fix: `div` is registered only on
`[Any, Any]` as a bare `/`.

```
$ eloc -t ruby -e "7 / 2"   ->  7.fdiv(2)      -> 3.5
$ eloc -t js   -e "7 / 2"   ->  7 / 2          -> 3.5
$ eloc -t python -e "7 / 2" ->  7 / 2          -> 3.5
$ eloc -t sql  -e "7 / 2"   ->  7 / 2          -> 3
```

## What to do

Register `div` on the integer combination explicitly and make the division
real, as Ruby does. `(7)::numeric / 2` is the obvious candidate — PostgreSQL's
`numeric / numeric` is exact and `numeric / integer` resolves to it — but check
what it does to the result type where the quotient feeds something typed, and
whether `::double precision` is the better choice for matching the other three
targets bit for bit. `ROUND`'s banker's-rounding note in the SQL binding is the
precedent for caring about numeric versus double precision here.

Only the case where *both* operands are statically integers needs it: as soon
as one is a Float, PostgreSQL already does real division.

## Test

`reference/division.elo` has no SQL expected file. Generating one is the red
test:

```
./scripts/regenerate-fixtures.sh -t sql division
```

Its first lines (`assert(7 / 2 == 3.5)`) fail immediately. Note that the whole
file must compile on SQL for the fixture to exist — check the lambda lines in
it first, and split them out if they do not.

Also worth asserting: `%` on negative operands, and `^`, which goes through
`POWER()` and returns double precision — the same family of "the operator
exists on both sides but does not mean the same thing".
