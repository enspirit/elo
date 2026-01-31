CASE WHEN date_trunc('day', CURRENT_TIMESTAMP) <= CURRENT_TIMESTAMP THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '1 day' - INTERVAL '1 second' >= CURRENT_TIMESTAMP THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('day', CURRENT_TIMESTAMP) < date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '1 day' - INTERVAL '1 second' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('week', CURRENT_DATE) <= CURRENT_DATE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('week', CURRENT_DATE) + INTERVAL '7 days' - INTERVAL '1 second' >= CURRENT_DATE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('week', CURRENT_DATE) < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days' - INTERVAL '1 second' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', CURRENT_DATE) <= CURRENT_DATE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 second' >= CURRENT_DATE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', CURRENT_DATE) < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 second' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('quarter', CURRENT_DATE) <= CURRENT_DATE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 second' >= CURRENT_DATE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('quarter', CURRENT_DATE) < date_trunc('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 second' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('year', CURRENT_DATE) <= CURRENT_DATE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 second' >= CURRENT_DATE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('year', CURRENT_DATE) < date_trunc('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 second' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
