CASE WHEN (ARRAY[1, 2] || ARRAY[3, 4]) = ARRAY[1, 2, 3, 4] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ARRAY[1] || ARRAY[2] || ARRAY[3]) = ARRAY[1, 2, 3] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ('{}'::integer[] || ARRAY[1, 2]) = ARRAY[1, 2] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ('{}'::text[] IS NOT NULL AND CARDINALITY('{}'::text[]) = 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END





CASE WHEN (ARRAY[1] || ARRAY[2, 3]) = ARRAY[1, 2, 3] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ARRAY[1, 2, 3] || ARRAY[4]) = ARRAY[1, 2, 3, 4] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ARRAY[1, 2] || '{}'::integer[]) = ARRAY[1, 2] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (('{}'::text[] || '{}'::text[]) IS NOT NULL AND CARDINALITY(('{}'::text[] || '{}'::text[])) = 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[1, 2] = ARRAY[1, 2] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN (ARRAY['a'] || ARRAY['b', 'c']) = ARRAY['a', 'b', 'c'] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT ARRAY_AGG(elem) FROM UNNEST(ARRAY[1, 2]) AS elem) = ARRAY[1, 2] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
