CASE WHEN ARRAY[1, 2, 3][CARDINALITY(ARRAY[1, 2, 3])] = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[][CARDINALITY(ARRAY[])] IS NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
