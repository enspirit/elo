








CASE WHEN (EXTRACT(EPOCH FROM date_trunc('day', CAST(DATE '2026-03-11' AS timestamp)) - date_trunc('day', CAST(DATE '2026-01-10' AS timestamp))) / 86400.0) = 60 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (EXTRACT(EPOCH FROM (DATE '2026-03-11' - DATE '2026-01-10') * INTERVAL '1 day') / 86400.0) = 60 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (EXTRACT(EPOCH FROM (DATE '2026-11-02' - DATE '2026-10-01') * INTERVAL '1 day') / 86400.0) = 32 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN (EXTRACT(EPOCH FROM (DATE '2026-03-30' - DATE '2026-03-28') * INTERVAL '1 day') / 86400.0) = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (EXTRACT(EPOCH FROM (DATE '2026-10-26' - DATE '2026-10-24') * INTERVAL '1 day') / 86400.0) = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN EXTRACT(YEAR FROM TIMESTAMP '2026-01-01 00:30:00') = 2026 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(MONTH FROM TIMESTAMP '2026-01-01 00:30:00') = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(DAY FROM TIMESTAMP '2026-01-01 00:30:00') = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(HOUR FROM TIMESTAMP '2026-01-01 00:30:00') = 0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(DAY FROM TIMESTAMP '2026-12-31 23:30:00') = 31 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(MONTH FROM TIMESTAMP '2026-12-31 23:30:00') = 12 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN date_trunc('day', CAST(TIMESTAMP '2026-01-01 00:30:00' AS timestamp)) = TIMESTAMP '2026-01-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', CAST(TIMESTAMP '2026-03-29 23:30:00' AS timestamp)) = TIMESTAMP '2026-03-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('day', CAST(TIMESTAMP '2026-12-31 23:30:00' AS timestamp)) + INTERVAL '1 day' - INTERVAL '1 second' < TIMESTAMP '2027-01-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN EXTRACT(DAY FROM (SELECT MIN(v) FROM UNNEST(ARRAY[TIMESTAMP '2026-01-01 00:30:00']) AS v)) = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('day', CAST((SELECT MIN(v) FROM UNNEST(ARRAY[TIMESTAMP '2026-01-01 00:30:00']) AS v) AS timestamp)) = TIMESTAMP '2026-01-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN EXTRACT(DAY FROM elo_datetime('2026-01-01T00:30:00Z')) = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (EXTRACT(EPOCH FROM (elo_date('2026-03-11') - elo_date('2026-01-10')) * INTERVAL '1 day') / 86400.0) = 60 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
