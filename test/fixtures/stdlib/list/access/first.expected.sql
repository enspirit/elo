CASE WHEN ARRAY[1, 2, 3][1] = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[][1] IS NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
