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

## Addendum: what was done

Red first by generating `reference/division.expected.sql`, which the task said
would be the test — **11 of its 16 assertions failed on SQL**, green on the
other three targets. The task's warning about the file was right: three of its
lines use lambdas, which SQL cannot compile at all, so the fixture could not
exist until they moved to `reference/division-dynamic.elo` (JavaScript, Ruby
and Python only, with typed twins).

`div(Int, Int)` now casts the left operand:

```
$ eloc -t sql -e "7 / 2"
7::double precision / 2
```

**`double precision`, not `numeric`**, which is the choice the task asked to
check: Ruby's `fdiv`, JavaScript's `/` and Python's `/` are all IEEE doubles,
so this is the emission that agrees with the other three rather than one that
is merely correct. `numeric` would make `1 / 3` an exact decimal with a
different digit count. Casting the left operand alone is enough, and `::` binds
tighter than `/`, so `7::double precision / 2` needs no extra parentheses.

Only the statically-integer case, as the task said. A Float on either side
already divides as reals, and the `Any, Any` signature cannot be touched: a
cast that fixed Int / Int there would break Duration / Int, which goes through
the same registration. Ruby's binding makes exactly this opt-out for exactly
this reason, two lines above its own numeric registrations.

The blast radius over the corpus is two lines: `reference/operators` and
`stdlib/numeric/round`, where `POWER(…)` already returned double precision so
the new cast is a no-op.

### The two things the task said were worth asserting alongside

Measured, and they are **not** the same kind of problem — division had one
right answer, these need a decision. Filed as **0189**:

- **`%` on a negative operand splits two–two.** `-7 % 3` is `-1` on PostgreSQL
  and JavaScript (truncated) and `2` on Ruby and Python (floored). No fixture
  covers it: every `%` assertion in the corpus uses non-negative operands.
- **`2 ^ -1` is `(1/2)` on Ruby** — a Rational, not a Float — where the other
  three answer `0.5`. It compares equal, so an assertion on the value would
  not catch it, but `typeOf` would, and a Rational leaking into an expression
  is the same surprise `Date - Date` produced in 0175.

`^` is otherwise fine: `9 ^ 0.5` is `3.0` everywhere, and `POWER` returning
double precision is already compensated for by `round`'s `::numeric` cast.
