CASE WHEN COALESCE((SELECT SUM(v) FROM UNNEST(ARRAY[1, 2, 3]) AS v), 0) = 6 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE((SELECT SUM(v) FROM UNNEST(ARRAY[]) AS v), 0) = 0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE((SELECT SUM(v) FROM UNNEST(ARRAY[1.5, 2.5]) AS v), 0) = 4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
