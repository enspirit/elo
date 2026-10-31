# PostgreSQL sandbox

The emitted SQL is a pure expression over supplied values/columns. Run it under
a restricted role with a statement timeout and a memory cap, passing inputs as
bound parameters.

- **Role** — a dedicated `NOLOGIN`, read-only role granted only the tables your
  expressions must read; no write grants, no superuser.
- **Time** — `SET LOCAL statement_timeout` inside the transaction.
- **Memory** — a capped `SET LOCAL work_mem`.
- **Inputs** — bind as `$1`, … (jsonb or columns); never splice values into the
  SQL text.

See [`example.sql`](./example.sql) for the transaction wrapper.
