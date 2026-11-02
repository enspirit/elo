# The SQL acceptance run assumed docker-compose had installed the helpers

> GitHub Actions failed on `npm test` while the suite was green locally. The
> difference is the database, not the code.

## Diagnosis

CI's postgres is a bare service container:

```yaml
services:
  postgres:
    image: postgres:16-alpine
```

Nothing applies `docker/init.sql`. Locally, `docker-compose.yml` mounts it as
`/docker-entrypoint-initdb.d/init.sql`, so the database has had Elo's SQL
runtime helpers since it was created and no one had to think about it.

Those helpers are not optional. Ten of them are emitted by the compiler —
`elo_fail`, `elo_int`, `elo_float`, `elo_date`, `elo_datetime`, `elo_duration`,
`elo_string`, `elo_data`, `elo_patch`, `elo_deep_merge` — and without them
seven fixtures cannot run: `reference/alternative`,
`reference/object-member-types`, `reference/type-selectors`,
`stdlib/data/fetch-types`, `stdlib/data/merge`, `stdlib/data/patch`,
`stdlib/data/selector`.

**This was invisible until 0178.** For as long as `test-sql.sh` ignored psql's
errors, "function elo_int(unknown) does not exist" was reported as a pass, so
CI had been running those seven fixtures against a database that could not
execute them, and saying nothing. Closing that hole is what made the gap
visible — on the first push, which is the point of closing it.

Reproduced locally by creating a database the way CI gets one:

```
$ createdb bare && PGDATABASE=bare ./test/acceptance/test-sql.sh
  ✗ reference/alternative.expected.sql
  ✗ reference/object-member-types.expected.sql
  ✗ reference/type-selectors.expected.sql
  ✗ stdlib/data/fetch-types.expected.sql
  ✗ stdlib/data/merge.expected.sql
  ✗ stdlib/data/patch.expected.sql
  ✗ stdlib/data/selector.expected.sql
SQL: 81 passed, 7 failed, 3 skipped
```

## The fix

`test-sql.sh` applies `docker/init.sql` itself before running the fixtures,
rather than assuming someone else has. Every definition in the file is
`CREATE OR REPLACE`, so it is idempotent and costs one connection — and the
other three runners already install their prelude the same way, with
`eloc --prelude-only`.

Fixed in the runner rather than in the workflow on purpose: a contributor
pointing the suite at their own postgres has exactly CI's problem, and a green
local run should mean a green CI run.

Verified both ways: `npm test` exits 0 against a bare database and against the
docker-compose one.

## Left over

`eloc --prelude-only -t sql` answers "No prelude needed", which is false — the
SQL target has ten runtime helpers and a host integrating Elo has no way to get
them out of the compiler. Filed as 0192.
