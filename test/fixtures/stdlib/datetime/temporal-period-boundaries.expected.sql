CASE WHEN date_trunc('day', CAST(elo_now('UTC') AS timestamp)) <= elo_now('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('day', CAST(elo_now('UTC') AS timestamp)) + INTERVAL '1 day' - INTERVAL '1 second' >= elo_now('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('day', CAST(elo_now('UTC') AS timestamp)) < date_trunc('day', CAST(elo_now('UTC') AS timestamp)) + INTERVAL '1 day' - INTERVAL '1 second' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('week', CAST(elo_now('UTC') AS timestamp)) <= elo_today('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('week', CAST(elo_now('UTC') AS timestamp)) + INTERVAL '7 days' - INTERVAL '1 second' >= elo_today('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('week', CAST(elo_now('UTC') AS timestamp)) < date_trunc('week', CAST(elo_now('UTC') AS timestamp)) + INTERVAL '7 days' - INTERVAL '1 second' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', CAST(elo_now('UTC') AS timestamp)) <= elo_today('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', CAST(elo_now('UTC') AS timestamp)) + INTERVAL '1 month' - INTERVAL '1 second' >= elo_today('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('month', CAST(elo_now('UTC') AS timestamp)) < date_trunc('month', CAST(elo_now('UTC') AS timestamp)) + INTERVAL '1 month' - INTERVAL '1 second' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('quarter', CAST(elo_now('UTC') AS timestamp)) <= elo_today('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('quarter', CAST(elo_now('UTC') AS timestamp)) + INTERVAL '3 months' - INTERVAL '1 second' >= elo_today('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('quarter', CAST(elo_now('UTC') AS timestamp)) < date_trunc('quarter', CAST(elo_now('UTC') AS timestamp)) + INTERVAL '3 months' - INTERVAL '1 second' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('year', CAST(elo_now('UTC') AS timestamp)) <= elo_today('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('year', CAST(elo_now('UTC') AS timestamp)) + INTERVAL '1 year' - INTERVAL '1 second' >= elo_today('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN date_trunc('year', CAST(elo_now('UTC') AS timestamp)) < date_trunc('year', CAST(elo_now('UTC') AS timestamp)) + INTERVAL '1 year' - INTERVAL '1 second' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
