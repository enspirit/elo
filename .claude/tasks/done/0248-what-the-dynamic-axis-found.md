# What the dynamic axis found

The force-dynamic acceptance axis (0249) runs the whole corpus with every call
dispatched as though no operand type were known. On its first run it reported
six diverging fixtures on JavaScript, five on Ruby, three on Python. They are
listed in `test/acceptance/dynamic-divergences.txt` so the axis is green and
enforcing; this task is the fixes.

Two reproduce in ordinary Elo with a lambda, which makes them live bugs rather
than artefacts of the flag. Those two come first.

## REAL 1 — `String(x)` returns the display form on the dynamic path

```
$ ./bin/elo -e "String('hello')"
"hello"
$ ./bin/elo -e "(let f = fn( x ~> String(x) ) in f('hello'))"
"'hello'"
```

The `String:any` implementation is `kString`, which is the **inspect** helper:
it quotes strings, so that `[1, 'a']` renders as `[1, 'a']`. `String(x)` the
selector means *convert to string*, and on a string that is the identity. The
two are different functions and the dynamic path picked the wrong one.

Affects every target that routes `String:any` through its inspect helper.
Check `kString`/`k_string` and whether the display form is wanted anywhere
else before changing it — `typeOf`-style rendering may depend on it, in which
case the fix is a second helper rather than a change to this one.

A correctness bug, not a security one. Red-first fixture: the pair above, on
every target.

## REAL 2 — `fetch(d, p)` with an object path raises a host TypeError

```
$ ./bin/elo -e "fetch({a: 1, b: 2}, {x: .a, y: .b})"
{"x":1,"y":2}
$ ./bin/elo -e "(let f = fn( d, p ~> fetch(d, p) ) in f({a: 1, b: 2}, {x: .a, y: .b}))"
Error: TypeError: path is not iterable
```

`fetch` has two forms — a path (`fetch(d, .a.b)`) and a mapping
(`fetch(d, {x: .a})`) — told apart by the *type* of the second argument.
With the type unknown, the path form is chosen and the object is iterated.

This one is worse than wrong. The security page promises *"It never crashes
uncontrollably. Bad input yields a typed Elo error, not an uncaught native
exception"*, and this is an uncaught native exception from ordinary source.
It should be scored as a (low) violation of a stated property, not merely as a
semantic divergence.

The fix is for the dynamic `fetch` to dispatch on the **runtime shape** of the
path — a plain object means the mapping form, an array or string the path
form — the way `kMul` dispatches on whether its operand is a String. Four
targets.

## FORCED — only the all-`any` compilation reaches these

Not reproducible with a lambda today, so not reachable from source. They are
still worth closing: each is an `any` implementation that has never run, which
is exactly what `dispatch-coverage` lists, and "unreachable today" is a
property of the current type inference rather than a guarantee.

- **`Interval:any`** (`interval-arithmetic`, all three targets) — on the
  dispatch-coverage unreached list for all four targets, so the axis is the
  first thing ever to run it.
- **`concat:any,any`** (`concat`, JavaScript) — `concat(Array, Array)` is a
  *type error* on the typed path and succeeds on the dynamic one. So "it
  compiles" does not mean the same thing on the two paths, which is the same
  class `registry-consistency` was written for. Decide which is right: either
  the typed path should accept list concatenation, or the dynamic one should
  refuse it.
- **`typeOf-arithmetic`, `temporal-duration`** (Ruby) — not yet
  characterised.

## Not a divergence

`temporal-startof-endof` and `dynamic-ambiguous-dispatch` fail identically on
`main` under every axis. That is the `startOf`/`endOf` timezone bug, which is
`0240`'s neighbourhood, not this one.

## How to work this list

Each entry gets a fixture asserting the typed and dynamic forms agree — which
CLAUDE.md asks for anyway — and then its line comes out of
`dynamic-divergences.txt`. The axis turns the file red if a fix is incomplete
and red if a line is stale, so the list can only shrink.

---

## What was done

**The list is empty.** `test/acceptance/dynamic-divergences.txt` carries no
fixture any more, and `ELO_FORCE_DYNAMIC=1 npm run test:acceptance` runs the
whole corpus on JavaScript, Ruby and Python with nothing skipped for a
divergence.

### The two REAL ones, as described

**1 — `String(x)` returned the display form.** `kString` is the *rendering*
helper: it quotes a string so `[1, 'a']` reads back as Elo. `String:any` was
kString on all four targets, so `String('hello')` answered `hello` typed and
`'hello'` dynamic. The display form *is* wanted — a string nested in a list is
still quoted — so the fix is a second helper rather than a change to this one:
`kToString` / `k_to_string` / `kToString` / `elo_to_string`, each "if it is a
string, it is already the answer; otherwise render". Four targets, because the
SQL case is reachable without a lambda: `String(min(['abc']))` answered
`'''abc'''`.

**2 — `fetch(d, p)` raised a host TypeError on an object path.** Fixed as the
task says, by dispatching on the path's runtime shape: `kFetchAny` /
`k_fetch_any` / `kFetchAny`. While reproducing it, the *typed* path turned out
to have the same hole — `fetch({a: 1}, {k: 42})` and `fetch({a: 1}, {k: null})`
raised "path is not iterable" through `kFetchObject` on JavaScript, Ruby and
Python with no lambda anywhere — so the path walkers refuse a non-path and
answer null, which is what made the typed assertion in `reference/datapath.elo`
possible. Ruby's four `fetch` forms were four inlined copies of one lambda;
they are `k_fetch`, `k_fetch_object` and `k_fetch_any` now, because a bound
that lives in four copies is a bound three of them can lose.

### The FORCED ones were all REAL

Every one of the four reproduced with a lambda once characterised, so none of
them was an artefact of the flag:

* **`interval-arithmetic`** — `Duration:any` refused an Interval on all three
  targets, where `Duration:interval` is the interval's length. JavaScript
  raised ".: expected Duration (ISO 8601), got object", Ruby "got Range",
  Python a host TypeError. Fixed in `pDuration`, Ruby's `Duration:any` case
  and Python's new `kParseDuration` — which also fixes `Duration(P1D)` through
  the dynamic path, where `EloDuration.from_iso` fed a Duration to `re.match`.
  `kParseDate` and `kParseDatetime` already accepted their own type; this was
  the third of three and the one left out.
* **`concat`** — not what the task guessed. `[1, 2] + [3, 4]` is legal Elo and
  the fixture asserts it; JavaScript's `kAdd` had no case for two lists, so it
  fell through to the native `+` and answered the **string** `"1,23,4"`. A
  wrong value, silently, where the typed path and the other three targets
  answer a list.
* **`typeOf-arithmetic` and `temporal-duration`** (Ruby) — two causes, both
  one root. `ActiveSupport::Duration#is_a?` delegates to the Duration's
  numeric value, so `P2D.is_a?(Integer)` is **true** (and so is
  `instance_of?`, through the same `method_missing`); `k_div` took its Integer
  branch and answered the Float 86400.0. And `add:any,any` was a bare `+`,
  where ActiveSupport defines Date + Duration and not Duration + Date, so
  `P1D + D2024-01-15` raised "Date can't be coerced into Integer" — the exact
  shape CLAUDE.md warns about, a native operator on an `any` operand reaching
  overloads Elo never asked for. Every Ruby dispatcher now tests a class with
  `Klass === v`, never `v.is_a?(Klass)`, and the rule is written at the top of
  `RUBY_HELPERS` with the measurement behind it.

### Red first

Three fixtures, all seen red before anything was fixed, identically on every
affected target:

* `reference/string-conversion-dynamic.elo` — 4 red of 32 on js, ruby and
  python, plus 2 red of 54 on all four in `reference/type-selectors.elo` (the
  `min([...])` block, which is how SQL reaches the same path without a lambda).
* `reference/datapath-dynamic.elo` — 7 red of 43 on js and python, 8 on ruby.
  Ruby's extra was the string-key form, which diverged from the other two.
* `reference/dynamic-arith-dispatch.elo` — the four FORCED entries turned into
  lambda assertions with their typed twins beside them.

### The harness

`dynamic-divergences.txt` claimed the axis "turns the file red if a line is
stale". Nothing enforced that — a listed fixture was simply skipped. The three
runners now **run** a listed fixture and treat *passing* as the failure,
reporting `⚠ STALE divergence`. Verified by adding `arithmetic` to the list and
watching all three go red.

`fetch/2` came off `AMBIGUOUS` in `ambiguous-dispatch.unit.test.ts` for all
four targets. SQL has no runtime shape to dispatch on and its mapping form
needs the object *literal* at compile time, so the path form is registered
explicitly there — the choice is made on purpose now rather than by
declaration order — and `fetch:any,any` is on SQL's `UNREACHED` list with the
reason it cannot be reached (PostgreSQL's UNNEST flattens a nested array, so
no SQL expression produces an array-typed value of unknown Elo type).
`String:any` came *off* SQL's unreached list, and the two Ruby grammar-gate
and Python grammar-gate helper lists grew by the new helper names.

No documentation changed: every fix makes the dynamic path answer what the
typed path and the documentation already said.
