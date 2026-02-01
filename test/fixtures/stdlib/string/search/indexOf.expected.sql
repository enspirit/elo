CASE WHEN (NULLIF(POSITION('world' IN 'hello world'), 0) - 1) = 6 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (NULLIF(POSITION('o' IN 'hello world'), 0) - 1) = 4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (NULLIF(POSITION('xyz' IN 'hello world'), 0) - 1) IS NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
