# The SQL acceptance suite passes when psql reports an error

> Found while measuring the arity fallback (0176). A fixture asserting
> `floor(min([3.7])) == 3` was reported green by `test-sql.sh` while psql
> printed `ERROR: syntax error`.

## The hole

`test/acceptance/test-sql.sh` decides pass/fail from psql's exit status:

```bash
if ! echo "$sql" | psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t >/dev/null 2>&1; then
```

Without `ON_ERROR_STOP`, psql exits **0** after a SQL error. Measured against
the project's container:

```
$ echo "SELECT 1/0;" | psql -t ; echo $?
ERROR:  division by zero
0
$ echo "SELECT CASE WHEN FALSE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END;" | psql -t ; echo $?
FATAL:  terminating connection due to administrator command
2
```

So the suite catches a *failed assertion* — `assert` emits
`pg_terminate_backend`, which drops the connection and makes psql exit 2 — and
silently passes anything that is merely **invalid SQL**: a syntax error, an
unknown function, a type mismatch. Those are exactly the failures a compiler
test should catch, since they mean the emission is not SQL at all.

## What to do

Add `-v ON_ERROR_STOP=1` to every psql invocation in `test-sql.sh`, then run
the suite and read what turns red. At least one fixture is known to be invalid
SQL today (see 0179), so this is a red-first change by construction: fix the
harness, watch the existing corpus fail, fix the emissions.

Check the same question for the other three runners. `node`, `ruby` and
`python3` all exit non-zero on a syntax error, so they are probably fine, but
confirm it rather than assume it — a one-line fixture with deliberate garbage
in it is enough.

## Addendum: what was done

Red first, with a probe corpus outside the repo — four fixtures, one per
target, each calling a function that does not exist — run through the real
runners with `TEST_DIR` pointed at it:

```
sql     SQL: 1 passed, 0 failed, 0 skipped      <- the hole
js      JavaScript: 0 passed, 1 failed, 0 skipped
ruby    Ruby: 0 passed, 1 failed, 0 skipped
python  Python: 0 passed, 1 failed, 0 skipped
```

So the question the task raised about the other three runners is answered: they
exit non-zero and were never affected. Only `test-sql.sh` needed the fix, which
is `-v ON_ERROR_STOP=1`, factored into a `psql_run` helper so the flag cannot be
forgotten at one of the call sites. The probe now reports 0 passed, 1 failed.

## What it was hiding: 26 fixtures, five distinct bugs

Far more than the one bug 0179 recorded. Enumerated by running each fixture
line separately and keeping the first psql error:

| count | error | owner |
|---|---|---|
| 15 | cannot determine type of empty array | 0181 |
| 3 | syntax error at or near `[` | 0179 |
| 3 | operator does not exist: text = integer / COALESCE types cannot be matched | 0182 |
| 3 | invalid input syntax for type json, jsonb = integer[], polymorphic type | 0184 |
| 1 | syntax error at or near `=` | 0183 |
| 1 | function unnest(integer) does not exist | 0185 |

Fixing all five here would have been five unrelated changes in one commit, so
they are filed as 0179 and 0181–0185 and the fixtures are quarantined in a
`KNOWN_INVALID` list in `test-sql.sh`, one entry per fixture, grouped under the
task that owns it and the error it produces. Same idiom as `NOT_EMITTABLE` and
`AMBIGUOUS`: an explicit list with reasons, which has to shrink to empty.

The list cannot go stale. A quarantined fixture is still executed, and if it
*passes* the runner reports it as a failure telling you to drop the entry.
Verified both ways: swapping `reference/arrays` for the healthy
`reference/arithmetic` produced `✗ reference/arithmetic (now valid SQL - drop
it from KNOWN_INVALID)` alongside `✗ reference/arrays`.

`SQL: 55 passed, 0 failed, 29 skipped` — 26 quarantined plus the 3 that already
needed variables. Before this change the same corpus claimed 81 passed, of
which 26 were not SQL at all.
