











CASE WHEN DATE '2026-03-01' + INTERVAL 'P1M' = DATE '2026-04-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + INTERVAL 'P2M' = DATE '2026-05-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + INTERVAL 'P3M' = DATE '2026-06-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-04-01' - INTERVAL 'P1M' = DATE '2026-03-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN DATE '2026-01-31' + INTERVAL 'P1M' = DATE '2026-02-28' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-31' - INTERVAL 'P1M' = DATE '2026-02-28' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-05-31' + INTERVAL 'P1M' = DATE '2026-06-30' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-01-31' + INTERVAL 'P1M' + INTERVAL 'P1M' = DATE '2026-03-28' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-01-31' + INTERVAL 'P1Y' = DATE '2027-01-31' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN DATE '2026-03-01' + INTERVAL 'P1M1D' = DATE '2026-04-02' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-01-31' + INTERVAL 'P1M1D' = DATE '2026-03-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + INTERVAL 'P1Y1M1D' = DATE '2027-04-02' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + INTERVAL 'P1M' + INTERVAL 'P1M' = DATE '2026-05-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + INTERVAL 'P1M' + INTERVAL 'P1D' = DATE '2026-04-02' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN TIMESTAMP '2026-05-15 08:00:00' + INTERVAL 'P1M' = TIMESTAMP '2026-06-15 08:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TIMESTAMP '2026-06-30 08:00:00' - INTERVAL 'P1M' = TIMESTAMP '2026-05-30 08:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TIMESTAMP '2026-05-31 08:00:00' + INTERVAL 'P1M' = TIMESTAMP '2026-06-30 08:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
