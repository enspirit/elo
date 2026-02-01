CASE WHEN (LENGTH('') = 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN NOT (LENGTH('hello') = 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
