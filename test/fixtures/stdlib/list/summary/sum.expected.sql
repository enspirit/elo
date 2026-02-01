CASE WHEN COALESCE((SELECT SUM(v) FROM UNNEST(ARRAY[1, 2, 3]) AS v), 0) = 6 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE((SELECT SUM(v) FROM UNNEST(ARRAY[]) AS v), 0) = 0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE((SELECT SUM(v) FROM UNNEST(ARRAY[1.5, 2.5]) AS v), 0) = 4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ('' || COALESCE((SELECT STRING_AGG(v, '') FROM UNNEST(ARRAY['a', 'b']) AS v), '')) = 'ab' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ('' || COALESCE((SELECT STRING_AGG(v, '') FROM UNNEST(ARRAY[]) AS v), '')) = '' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (10 + COALESCE((SELECT SUM(v) FROM UNNEST(ARRAY[1, 2, 3]) AS v), 0)) = 16 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (INTERVAL 'P0D' + COALESCE((SELECT SUM(v) FROM UNNEST(ARRAY[INTERVAL 'P1D', INTERVAL 'P2D']) AS v), 0)) = INTERVAL 'P3D' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END