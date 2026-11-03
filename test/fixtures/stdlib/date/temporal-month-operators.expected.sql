














CASE WHEN DATE '2026-03-01' + INTERVAL 'P1M' * 2 = DATE '2026-05-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + 2 * INTERVAL 'P1M' = DATE '2026-05-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + INTERVAL 'P1M' * 3 = DATE '2026-06-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + -1 * INTERVAL 'P1M' = DATE '2026-02-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + INTERVAL 'P1M' * 1 = DATE '2026-04-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + INTERVAL 'P1M' * 0 = DATE '2026-03-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN DATE '2026-01-31' + INTERVAL 'P1M' * 1 = DATE '2026-02-28' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-12-31' + INTERVAL 'P1M' * 2 = DATE '2027-02-28' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN DATE '2026-03-01' + INTERVAL 'P1Y' * 2 = DATE '2028-03-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + INTERVAL 'P1M1D' * 2 = DATE '2026-05-03' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + INTERVAL 'P1Y1M' * 2 = DATE '2028-05-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN DATE '2026-01-31' + INTERVAL 'P1M' - INTERVAL 'P10D' = DATE '2026-02-18' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + INTERVAL 'P2M' - INTERVAL 'P1M' = DATE '2026-04-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + INTERVAL 'P1M' - INTERVAL 'P1M' = DATE '2026-03-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + INTERVAL 'P1M1D' - INTERVAL 'P1D' = DATE '2026-04-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + INTERVAL 'P1Y' - INTERVAL 'P1M' = DATE '2027-02-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN DATE '2026-03-01' + INTERVAL 'P1M' + INTERVAL 'P1M' = DATE '2026-05-01' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2026-03-01' + INTERVAL 'P1M' + INTERVAL 'P1D' = DATE '2026-04-02' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN TIMESTAMP '2026-05-31 08:00:00' + INTERVAL 'P1M' * 2 = TIMESTAMP '2026-07-31 08:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TIMESTAMP '2026-05-15 08:00:00' + INTERVAL 'P1M' - INTERVAL 'P1D' = TIMESTAMP '2026-06-14 08:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
