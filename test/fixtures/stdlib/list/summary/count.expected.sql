CASE WHEN COALESCE(CARDINALITY(ARRAY[1, 2, 3]), 0) = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE(CARDINALITY(ARRAY[]), 0) = 0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE(CARDINALITY(ARRAY['a', 'b']), 0) = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
