CASE WHEN NULL IS NOT NULL = FALSE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 42 IS NOT NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 'hello' IS NOT NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TRUE IS NOT NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (NULLIF(POSITION('l' IN 'hello'), 0) - 1) IS NOT NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (NULLIF(POSITION('x' IN 'hello'), 0) - 1) IS NOT NULL = FALSE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
