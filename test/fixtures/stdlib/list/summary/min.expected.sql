CASE WHEN (SELECT MIN(v) FROM UNNEST(ARRAY[3, 1, 4, 1, 5]) AS v) = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT MIN(v) FROM UNNEST(ARRAY[42]) AS v) = 42 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT MIN(v) FROM UNNEST(ARRAY[-3, -1, -4]) AS v) = -4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT MIN(v) FROM UNNEST(ARRAY[]) AS v) IS NULL THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
