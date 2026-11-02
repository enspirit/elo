-- PostgreSQL resource sandbox for compiled Elo.
--
-- The emitted SQL is a pure expression over supplied values/columns. Run it:
--   * as a dedicated low-privilege, read-only role;
--   * with a statement timeout (time) and a capped work_mem (memory);
--   * with inputs passed as bound parameters ($1, ...), never spliced into text.

-- One-time setup, as an admin — grant only what your expressions must read:
--   CREATE ROLE elo_readonly NOLOGIN;
--   GRANT USAGE ON SCHEMA public TO elo_readonly;
--   GRANT SELECT ON <the tables your expressions read> TO elo_readonly;
--   -- no INSERT/UPDATE/DELETE, no SUPERUSER.
--
-- One-time setup too: install the SQL prelude, the elo_* helpers the compiler
-- calls for type selectors and Data operations. Unlike the other targets',
-- it cannot be prepended to the expression — an expression has nowhere to
-- define a function:
--   eloc --prelude-only -t sql | psql "$DATABASE_URL"
-- It is CREATE OR REPLACE throughout, so re-running it on each deploy is
-- idempotent, and elo_readonly needs only EXECUTE on the result.

-- Per evaluation:
BEGIN;
  SET LOCAL ROLE elo_readonly;          -- drop to the restricted role
  SET LOCAL statement_timeout = '1000ms';  -- the time lever
  SET LOCAL work_mem = '16MB';             -- the memory lever
  -- The emitted expression calls the prelude's helpers unqualified, so the
  -- schema holding them has to be on the path. Keep it to that one schema:
  -- '' breaks every type selector with "function elo_int does not exist".
  SET LOCAL search_path = 'public';

  -- Replace the parenthesised comment with the compiled Elo expression, and
  -- bind its input as $1 (jsonb, or the columns the expression reads).
  SELECT ( /* compiled Elo expression here */ ) AS result;
COMMIT;
