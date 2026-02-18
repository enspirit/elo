CASE WHEN COALESCE(42, 0) = 42 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE('hello', 'default') = 'hello' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE((NULLIF(POSITION('l' IN 'hello'), 0) - 1), -1) = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE((NULLIF(POSITION('x' IN 'hello'), 0) - 1), -1) = -1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE((NULLIF(POSITION('x' IN 'hello'), 0) - 1), (NULLIF(POSITION('z' IN 'hello'), 0) - 1), -1) = -1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE((NULLIF(POSITION('x' IN 'hello'), 0) - 1), (NULLIF(POSITION('l' IN 'hello'), 0) - 1), -1) = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT COALESCE(x, 0) FROM (SELECT 42 AS x) AS _let) = 42 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT elo_int(COALESCE(tuple->>'x', 0)) FROM (SELECT jsonb_build_object('x', '12') AS tuple) AS _let) = 12 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
