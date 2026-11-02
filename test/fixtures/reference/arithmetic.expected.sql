CASE WHEN 2 + 3 = 5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 2 + 3 * 4 = 14 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN POWER(2, 3) = 8 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN POWER(2, 3) + 1 = 9 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (5 + 5) * (10 - 3)::double precision / 2 = 35 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN -5 + 10 = 5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 10 % 3 + 8::double precision / 2 = 5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
