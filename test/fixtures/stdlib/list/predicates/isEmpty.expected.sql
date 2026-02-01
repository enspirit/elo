CASE WHEN (COALESCE(CARDINALITY(ARRAY[]), 0) = 0) = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (COALESCE(CARDINALITY(ARRAY[1]), 0) = 0) = FALSE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
