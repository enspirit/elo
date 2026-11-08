









CASE WHEN (SELECT date_trunc('day', CAST(t AS timestamp)) = elo_today('UTC') FROM (SELECT elo_now('UTC') AS t) AS _let) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT elo_date(t) = elo_today('UTC') FROM (SELECT elo_now('UTC') AS t) AS _let) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(DAY FROM elo_now('UTC')) = EXTRACT(DAY FROM elo_today('UTC')) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(MONTH FROM elo_now('UTC')) = EXTRACT(MONTH FROM elo_today('UTC')) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(YEAR FROM elo_now('UTC')) = EXTRACT(YEAR FROM elo_today('UTC')) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END



CASE WHEN (SELECT (EXTRACT(EPOCH FROM t - date_trunc('day', CAST(t AS timestamp))) / 3600.0) >= EXTRACT(HOUR FROM t) FROM (SELECT elo_now('UTC') AS t) AS _let) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT (EXTRACT(EPOCH FROM t - date_trunc('day', CAST(t AS timestamp))) / 3600.0) < EXTRACT(HOUR FROM t) + 1 FROM (SELECT elo_now('UTC') AS t) AS _let) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN (SELECT (EXTRACT(EPOCH FROM t - date_trunc('day', CAST(t AS timestamp))) / 60.0) >= EXTRACT(HOUR FROM t) * 60 + EXTRACT(MINUTE FROM t) FROM (SELECT elo_now('UTC') AS t) AS _let) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT (EXTRACT(EPOCH FROM t - date_trunc('day', CAST(t AS timestamp))) / 60.0) < EXTRACT(HOUR FROM t) * 60 + EXTRACT(MINUTE FROM t) + 1 FROM (SELECT elo_now('UTC') AS t) AS _let) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
