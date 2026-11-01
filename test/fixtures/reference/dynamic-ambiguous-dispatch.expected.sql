














CASE WHEN FLOOR((SELECT MIN(v) FROM UNNEST(ARRAY[3.7]) AS v)) = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN FLOOR((SELECT MIN(v) FROM UNNEST(ARRAY[-3.2]) AS v)) = -4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN FLOOR((SELECT MIN(v) FROM UNNEST(ARRAY[5]) AS v)) = 5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CEIL((SELECT MIN(v) FROM UNNEST(ARRAY[3.2]) AS v)) = 4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CEIL((SELECT MIN(v) FROM UNNEST(ARRAY[-3.9]) AS v)) = -3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CEIL((SELECT MIN(v) FROM UNNEST(ARRAY[5]) AS v)) = 5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ROUND(((SELECT MIN(v) FROM UNNEST(ARRAY[3.5]) AS v))::numeric) = 4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ROUND(((SELECT MIN(v) FROM UNNEST(ARRAY[-2.5]) AS v))::numeric) = -3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ROUND(((SELECT MIN(v) FROM UNNEST(ARRAY[5]) AS v))::numeric) = 5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN date_trunc('day', (SELECT MIN(v) FROM UNNEST(ARRAY[TIMESTAMP '2024-06-15 10:30:00']) AS v)) = TIMESTAMP '2024-06-15 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('day', (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2024-06-15']) AS v)) = TIMESTAMP '2024-06-15 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('day', (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2024-06-15']) AS v)) + INTERVAL '1 day' - INTERVAL '1 second' >= TIMESTAMP '2024-06-15 23:59:59' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('day', (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2024-06-15']) AS v)) + INTERVAL '1 day' - INTERVAL '1 second' < TIMESTAMP '2024-06-16 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('week', (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2024-06-12']) AS v)) = TIMESTAMP '2024-06-10 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('week', (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2024-06-12']) AS v)) + INTERVAL '7 days' - INTERVAL '1 second' >= TIMESTAMP '2024-06-16 23:59:59' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('week', (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2024-06-12']) AS v)) + INTERVAL '7 days' - INTERVAL '1 second' < TIMESTAMP '2024-06-17 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2024-06-15']) AS v)) = TIMESTAMP '2024-06-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2024-06-15']) AS v)) + INTERVAL '1 month' - INTERVAL '1 second' >= TIMESTAMP '2024-06-30 23:59:59' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2024-06-15']) AS v)) + INTERVAL '1 month' - INTERVAL '1 second' < TIMESTAMP '2024-07-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('quarter', (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2024-08-15']) AS v)) = TIMESTAMP '2024-07-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('quarter', (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2024-08-15']) AS v)) + INTERVAL '3 months' - INTERVAL '1 second' >= TIMESTAMP '2024-09-30 23:59:59' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('quarter', (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2024-08-15']) AS v)) + INTERVAL '3 months' - INTERVAL '1 second' < TIMESTAMP '2024-10-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('year', (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2024-06-15']) AS v)) = TIMESTAMP '2024-01-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('year', (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2024-06-15']) AS v)) + INTERVAL '1 year' - INTERVAL '1 second' >= TIMESTAMP '2024-12-31 23:59:59' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('year', (SELECT MIN(v) FROM UNNEST(ARRAY[DATE '2024-06-15']) AS v)) + INTERVAL '1 year' - INTERVAL '1 second' < TIMESTAMP '2025-01-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN FLOOR(3.7) = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN FLOOR(-3.2) = -4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CEIL(3.2) = 4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CEIL(-3.9) = -3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ROUND((3.5)::numeric) = 4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ROUND((-2.5)::numeric) = -3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('day', TIMESTAMP '2024-06-15 10:30:00') = TIMESTAMP '2024-06-15 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('day', DATE '2024-06-15') = TIMESTAMP '2024-06-15 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('week', DATE '2024-06-12') = TIMESTAMP '2024-06-10 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', DATE '2024-06-15') = TIMESTAMP '2024-06-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('quarter', DATE '2024-08-15') = TIMESTAMP '2024-07-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('year', DATE '2024-06-15') = TIMESTAMP '2024-01-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
