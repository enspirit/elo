CASE WHEN COALESCE((SELECT SUM(v) FROM UNNEST(ARRAY[1, 2, 3]) AS v), 0) = 6 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE((SELECT SUM(v) FROM UNNEST('{}'::double precision[]) AS v), 0) = 0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE((SELECT SUM(v) FROM UNNEST(ARRAY[1.5, 2.5]) AS v), 0) = 4.0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE('' || (SELECT STRING_AGG(v, '') FROM UNNEST(ARRAY['a', 'b']) AS v), '') = 'ab' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE('' || (SELECT STRING_AGG(v, '') FROM UNNEST('{}'::text[]) AS v), '') = '' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE(10 + (SELECT SUM(v) FROM UNNEST(ARRAY[1, 2, 3]) AS v), 10) = 16 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE(INTERVAL 'P0D' + (SELECT SUM(v) FROM UNNEST(ARRAY[INTERVAL 'P1D', INTERVAL 'P2D']) AS v), INTERVAL 'P0D') = INTERVAL 'P3D' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END




CASE WHEN COALESCE(1.0 + (SELECT SUM(v) FROM UNNEST(ARRAY[1.5, 2.5]) AS v), 1.0) = 5.0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE(1.0 + (SELECT SUM(v) FROM UNNEST('{}'::double precision[]) AS v), 1.0) = 1.0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE(10 + (SELECT SUM(v) FROM UNNEST('{}'::integer[]) AS v), 10) = 10 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE(INTERVAL 'P1D' + (SELECT SUM(v) FROM UNNEST(ARRAY[INTERVAL 'P1D']) AS v), INTERVAL 'P1D') = INTERVAL 'P2D' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE(INTERVAL 'P1D' + (SELECT SUM(v) FROM UNNEST('{}'::interval[]) AS v), INTERVAL 'P1D') = INTERVAL 'P1D' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE('x' || (SELECT STRING_AGG(v, '') FROM UNNEST(ARRAY['a']) AS v), 'x') = 'xa' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
