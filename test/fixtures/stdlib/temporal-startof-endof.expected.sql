CASE WHEN date_trunc('day', TIMESTAMP '2024-06-15 10:30:00') = TIMESTAMP '2024-06-15 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('day', TIMESTAMP '2024-06-15 10:30:00') + INTERVAL '1 day' - INTERVAL '1 second' >= TIMESTAMP '2024-06-15 23:59:59' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('day', TIMESTAMP '2024-06-15 10:30:00') + INTERVAL '1 day' - INTERVAL '1 second' < TIMESTAMP '2024-06-16 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('week', TIMESTAMP '2024-06-12 10:30:00') = TIMESTAMP '2024-06-10 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('week', TIMESTAMP '2024-06-12 10:30:00') + INTERVAL '7 days' - INTERVAL '1 second' >= TIMESTAMP '2024-06-16 23:59:59' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('week', TIMESTAMP '2024-06-12 10:30:00') + INTERVAL '7 days' - INTERVAL '1 second' < TIMESTAMP '2024-06-17 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', TIMESTAMP '2024-06-15 10:30:00') = TIMESTAMP '2024-06-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', TIMESTAMP '2024-06-15 10:30:00') + INTERVAL '1 month' - INTERVAL '1 second' >= TIMESTAMP '2024-06-30 23:59:59' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', TIMESTAMP '2024-06-15 10:30:00') + INTERVAL '1 month' - INTERVAL '1 second' < TIMESTAMP '2024-07-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('quarter', TIMESTAMP '2024-08-15 10:30:00') = TIMESTAMP '2024-07-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('quarter', TIMESTAMP '2024-08-15 10:30:00') + INTERVAL '3 months' - INTERVAL '1 second' >= TIMESTAMP '2024-09-30 23:59:59' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('quarter', TIMESTAMP '2024-08-15 10:30:00') + INTERVAL '3 months' - INTERVAL '1 second' < TIMESTAMP '2024-10-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('year', TIMESTAMP '2024-06-15 10:30:00') = TIMESTAMP '2024-01-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('year', TIMESTAMP '2024-06-15 10:30:00') + INTERVAL '1 year' - INTERVAL '1 second' >= TIMESTAMP '2024-12-31 23:59:59' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('year', TIMESTAMP '2024-06-15 10:30:00') + INTERVAL '1 year' - INTERVAL '1 second' < TIMESTAMP '2025-01-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', DATE '2024-06-15') = TIMESTAMP '2024-06-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', DATE '2024-06-15') + INTERVAL '1 month' - INTERVAL '1 second' >= TIMESTAMP '2024-06-30 23:59:59' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('year', DATE '2024-06-15') = TIMESTAMP '2024-01-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
