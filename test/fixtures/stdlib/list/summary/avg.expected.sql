CASE WHEN (SELECT AVG(v) FROM UNNEST(ARRAY[1, 2, 3]) AS v) = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT AVG(v) FROM UNNEST(ARRAY[4, 8]) AS v) = 6 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT AVG(v) FROM UNNEST(ARRAY[1.5, 2.5]) AS v) = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT AVG(v) FROM UNNEST(ARRAY[]) AS v) IS NULL THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
