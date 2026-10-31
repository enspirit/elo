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

-- Per evaluation:
BEGIN;
  SET LOCAL ROLE elo_readonly;          -- drop to the restricted role
  SET LOCAL statement_timeout = '1000ms';  -- the time lever
  SET LOCAL work_mem = '16MB';             -- the memory lever
  SET LOCAL search_path = '';           -- force fully-qualified names

  -- Replace the parenthesised comment with the compiled Elo expression, and
  -- bind its input as $1 (jsonb, or the columns the expression reads).
  SELECT ( /* compiled Elo expression here */ ) AS result;
COMMIT;
