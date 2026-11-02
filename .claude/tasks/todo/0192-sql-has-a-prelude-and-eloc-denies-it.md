# SQL has a prelude, and `eloc --prelude-only -t sql` says it does not

> Found while fixing 0191, which was CI failing because nothing had installed
> that prelude.

## The gap

```
$ eloc --prelude-only -t sql
-- No prelude needed for SQL
```

That is false. The SQL compiler emits ten runtime helpers:

```
elo_fail  elo_int  elo_float  elo_date  elo_datetime
elo_duration  elo_string  elo_data  elo_patch  elo_deep_merge
```

They exist in exactly one place — `docker/init.sql`, 254 lines of
`CREATE OR REPLACE FUNCTION`, mounted by `docker-compose.yml` into the dev
database. So:

- A host compiling Elo to SQL has **no way to obtain them from the compiler**.
  `--prelude-only` is the documented way to get a target's runtime, and for SQL
  it actively denies there is one. The README's prelude section does not
  mention them either.
- The test runner had to reach into `docker/init.sql` by path to install them
  (0191), which is a test depending on a dev-environment file.
- Nothing checks that the file and the emitters agree. A new `elo_*` helper in
  a binding with no definition in `init.sql` would be caught only by an
  acceptance failure, and only since 0178 made those visible at all.

## What to do

Move the definitions into `src/preludes/` alongside the other three targets and
have `getPrelude('sql')` return them, so `eloc --prelude-only -t sql` emits the
`CREATE OR REPLACE FUNCTION` statements. Then:

- `docker/init.sql` becomes generated, or a one-line file that says to run
  `eloc --prelude-only -t sql`. Do not leave two copies.
- `test-sql.sh` installs the prelude the way the other three runners do —
  `$ELOC --prelude-only -t sql | psql` — instead of reading a path.
- Add the consistency test the other direction, which is the real prize: every
  `elo_*` name any SQL emitter can produce must be defined in the prelude.
  `src/bindings/sql.ts` is the only source of them, so a regex over the
  emitters against the prelude's `FUNCTION elo_…` names is enough — the same
  shape as the registry-consistency test.

Note the one real difference from the other targets, and say it in the docs:
JavaScript, Ruby and Python preludes are *prepended to the expression*, while
SQL's has to be **installed in the database once**, because a pure SQL
expression cannot define a function. That is a deployment step a host needs to
know about, and right now nothing tells them.
