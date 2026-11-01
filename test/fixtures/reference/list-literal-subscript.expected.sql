










CASE WHEN (ARRAY[1, 2, 3])[1] = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ARRAY[1, 2, 3])[CARDINALITY(ARRAY[1, 2, 3])] = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ARRAY[1, 2, 3])[0 + 1] = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ARRAY[1, 2, 3])[1 + 1] = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ARRAY[1, 2, 3])[2 + 1] = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END

CASE WHEN (ARRAY[1.5, 2.5])[1] = 1.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ARRAY[1.5, 2.5])[CARDINALITY(ARRAY[1.5, 2.5])] = 2.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ARRAY['a', 'b'])[1] = 'a' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ARRAY['a', 'b'])[1 + 1] = 'b' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ARRAY['a', 'b'])[CARDINALITY(ARRAY['a', 'b'])] = 'b' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN ((SELECT ARRAY_AGG(elem ORDER BY ord DESC) FROM UNNEST(ARRAY[1, 2, 3]) WITH ORDINALITY AS t(elem, ord)))[1] = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((SELECT ARRAY_AGG(elem ORDER BY ord DESC) FROM UNNEST(ARRAY[1, 2, 3]) WITH ORDINALITY AS t(elem, ord)))[CARDINALITY((SELECT ARRAY_AGG(elem ORDER BY ord DESC) FROM UNNEST(ARRAY[1, 2, 3]) WITH ORDINALITY AS t(elem, ord)))] = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((SELECT ARRAY_AGG(v ORDER BY v) FROM UNNEST(ARRAY[3, 1, 2]) AS v))[0 + 1] = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((SELECT ARRAY_AGG(v ORDER BY v) FROM UNNEST(ARRAY[3, 1, 2]) AS v))[2 + 1] = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN (ARRAY[1, 2, 3])[100 + 1] IS NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ARRAY[1, 2, 3])[-1 + 1] IS NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
