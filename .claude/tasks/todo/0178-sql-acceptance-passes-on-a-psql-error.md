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
