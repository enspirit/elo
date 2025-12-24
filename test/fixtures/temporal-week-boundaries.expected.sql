CASE WHEN date_trunc('week', CURRENT_DATE) <= CURRENT_DATE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('week', CURRENT_DATE) + INTERVAL '6 days' >= CURRENT_DATE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('week', CURRENT_DATE) < date_trunc('week', CURRENT_DATE) + INTERVAL '6 days' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
