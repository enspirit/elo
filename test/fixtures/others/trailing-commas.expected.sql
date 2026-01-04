CASE WHEN ARRAY[1, 2, 3] = ARRAY[1, 2, 3] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[1] = ARRAY[1] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN jsonb_build_object('a', 1, 'b', 2)->>'a' = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN jsonb_build_object('a', 1)->>'a' = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT (SELECT x * y FROM (SELECT 3 AS y) AS _let) FROM (SELECT 2 AS x) AS _let) = 6 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT x * 2 FROM (SELECT 2 AS x) AS _let) = 4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END

