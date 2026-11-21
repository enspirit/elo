CASE WHEN elo_now('UTC') > TIMESTAMP '2020-01-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_today('UTC') >= DATE '2020-01-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_today('UTC') + INTERVAL '1 day' > elo_today('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_today('UTC') - INTERVAL '1 day' < elo_today('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_today('UTC') + INTERVAL '1 day' > elo_today('UTC') - INTERVAL '1 day' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_now('UTC') > TIMESTAMP '2024-01-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_today('UTC') > DATE '2024-01-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END

CASE WHEN TIMESTAMP '0001-01-01 00:00:00' < TIMESTAMP '0002-01-01 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TIMESTAMP '9999-12-31 23:59:59' > TIMESTAMP '9998-12-31 00:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TIMESTAMP '0001-01-01 00:00:00' < elo_today('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TIMESTAMP '9999-12-31 23:59:59' > elo_today('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TIMESTAMP '0001-01-01 00:00:00' < elo_now('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TIMESTAMP '9999-12-31 23:59:59' > elo_now('UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_today('UTC') >= TIMESTAMP '0001-01-01 00:00:00' AND elo_today('UTC') < TIMESTAMP '9999-12-31 23:59:59' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
