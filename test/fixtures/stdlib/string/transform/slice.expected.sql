CASE WHEN SUBSTRING('hello' FROM 0 + 1 FOR (2) - (0)) = 'he' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN SUBSTRING('hello' FROM 1 + 1 FOR (3) - (1)) = 'el' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN SUBSTRING('hello world' FROM 6 + 1 FOR (11) - (6)) = 'world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN SUBSTRING('hello' FROM 2 + 1 FOR (100) - (2)) = 'llo' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN SUBSTRING('hello' FROM 0 + 1 FOR (0) - (0)) = '' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
