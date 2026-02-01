CASE WHEN SUBSTRING('hello' FROM 0 + 1 FOR 2) = 'he' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN SUBSTRING('hello' FROM 1 + 1 FOR 3) = 'ell' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN SUBSTRING('hello world' FROM 6 + 1 FOR 5) = 'world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN SUBSTRING('hello' FROM 2 + 1 FOR 100) = 'llo' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
