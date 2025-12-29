CASE WHEN COALESCE(CARDINALITY(ARRAY[1, 2, 3]), 0) = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE(CARDINALITY(ARRAY[]), 0) = 0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[1, 2, 3][0 + 1] = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[1, 2, 3][2 + 1] = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[1, 2, 3][1] = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[][1] IS NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[1, 2, 3][CARDINALITY(ARRAY[1, 2, 3])] = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[][CARDINALITY(ARRAY[])] IS NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (COALESCE(CARDINALITY(ARRAY[]), 0) = 0) = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (COALESCE(CARDINALITY(ARRAY[1]), 0) = 0) = FALSE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[1, 2, 3][100 + 1] IS NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[1, 2, 3][-1 + 1] IS NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[1, 2] || ARRAY[3, 4] = ARRAY[1, 2, 3, 4] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[] || ARRAY[1, 2] = ARRAY[1, 2] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[1, 2] || ARRAY[] = ARRAY[1, 2] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[] || ARRAY[] = ARRAY[] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY['a'] || ARRAY['b', 'c'] = ARRAY['a', 'b', 'c'] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
