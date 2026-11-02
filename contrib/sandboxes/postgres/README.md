# PostgreSQL sandbox

The emitted SQL is a pure expression over supplied values/columns. Run it under
a restricted role with a statement timeout and a memory cap, passing inputs as
bound parameters.

- **Prelude** — install the `elo_*` runtime helpers once, as a privileged role,
  before any compiled expression runs: `eloc --prelude-only -t sql | psql
  "$DATABASE_URL"`. SQL's prelude cannot be prepended to the expression the way
  the other targets' can — an expression has nowhere to define a function.
  Every definition is `CREATE OR REPLACE`, so re-running it on each deploy is
  idempotent. The role that runs expressions needs only `EXECUTE` on them.
- **Role** — a dedicated `NOLOGIN`, read-only role granted only the tables your
  expressions must read; no write grants, no superuser.
- **Time** — `SET LOCAL statement_timeout` inside the transaction.
- **Memory** — a capped `SET LOCAL work_mem`.
- **Inputs** — bind as `$1`, … (jsonb or columns); never splice values into the
  SQL text.

See [`example.sql`](./example.sql) for the transaction wrapper.
