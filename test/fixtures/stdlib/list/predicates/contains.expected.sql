CASE WHEN (2 = ANY(ARRAY[1, 2, 3])) = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (4 = ANY(ARRAY[1, 2, 3])) = FALSE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (1 = ANY(ARRAY[])) = FALSE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ('b' = ANY(ARRAY['a', 'b', 'c'])) = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ('d' = ANY(ARRAY['a', 'b', 'c'])) = FALSE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
