CASE WHEN DATE '2024-01-15' + INTERVAL 'P1D' > DATE '2024-01-15' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2024-01-15' + INTERVAL 'P1D' < DATE '2024-01-17' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2024-01-15' - INTERVAL 'P1D' < DATE '2024-01-15' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2024-01-15' - INTERVAL 'P1D' > DATE '2024-01-13' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2024-01-01' + INTERVAL 'P1D' * 2 = DATE '2024-01-03' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2024-01-01' + 2 * INTERVAL 'P1D' = DATE '2024-01-03' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2024-01-01' + INTERVAL 'P2D' / 2 = DATE '2024-01-02' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
