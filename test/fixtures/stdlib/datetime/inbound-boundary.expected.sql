














CASE WHEN EXTRACT(HOUR FROM elo_datetime('2026-01-15T10:00:00', 'UTC')) = 10 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(MINUTE FROM elo_datetime('2026-01-15T10:30:00', 'UTC')) = 30 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(DAY FROM elo_date('2026-01-15', 'UTC')) = 15 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END



CASE WHEN EXTRACT(HOUR FROM elo_datetime('2026-01-15T10:00:00Z', 'UTC')) = 10 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(HOUR FROM elo_datetime('2026-01-15T10:00:00+00:00', 'UTC')) = 10 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(HOUR FROM elo_datetime('2026-01-15T10:00:00-00:00', 'UTC')) = 10 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END




CASE WHEN EXTRACT(HOUR FROM elo_datetime('2026-01-15T10:00:00+01:00', 'UTC')) = 9 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(HOUR FROM elo_datetime('2026-01-15T10:00:00+05:30', 'UTC')) = 4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(MINUTE FROM elo_datetime('2026-01-15T10:00:00+05:30', 'UTC')) = 30 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(HOUR FROM elo_datetime('2026-01-15T10:00:00-05:00', 'UTC')) = 15 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN EXTRACT(DAY FROM elo_datetime('2026-01-15T00:30:00+02:00', 'UTC')) = 14 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(HOUR FROM elo_datetime('2026-01-15T00:30:00+02:00', 'UTC')) = 22 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN EXTRACT(DAY FROM elo_datetime('2026-01-15T23:30:00-02:00', 'UTC')) = 16 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END




CASE WHEN elo_datetime('2026-01-15T10:00:00+01:00', 'UTC') = elo_datetime('2026-01-15T09:00:00Z', 'UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_datetime('2026-01-15T12:00:00+03:00', 'UTC') = elo_datetime('2026-01-15T10:00:00+01:00', 'UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_datetime('2026-01-15T10:00:00+01:00', 'UTC') < elo_datetime('2026-01-15T10:00:00Z', 'UTC') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END



CASE WHEN elo_date(elo_datetime('2026-01-15T00:30:00+02:00', 'UTC'), 'UTC') = DATE '2026-01-14' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
