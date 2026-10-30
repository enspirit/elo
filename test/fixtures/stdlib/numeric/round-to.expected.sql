





CASE WHEN (ROUND(((3.14159) * POWER(10, 2))::numeric) / POWER(10, 2)) = 3.14 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ROUND(((3.14159) * POWER(10, 4))::numeric) / POWER(10, 4)) = 3.1416 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ROUND(((2.5) * POWER(10, 0))::numeric) / POWER(10, 0)) = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ROUND(((0.797381) * POWER(10, 4))::numeric) / POWER(10, 4)) = 0.7974 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ROUND(((271.6954) * POWER(10, 2))::numeric) / POWER(10, 2)) = 271.7 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ROUND(((103.125) * POWER(10, 2))::numeric) / POWER(10, 2)) = 103.13 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ROUND(((2.675) * POWER(10, 2))::numeric) / POWER(10, 2)) = 2.68 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ROUND(((1.0 / 3) * POWER(10, 3))::numeric) / POWER(10, 3)) = 0.333 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ROUND(((123.456) * POWER(10, 1))::numeric) / POWER(10, 1)) = 123.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ROUND(((123.456) * POWER(10, 0))::numeric) / POWER(10, 0)) = 123 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN (ROUND(((-3.14159) * POWER(10, 2))::numeric) / POWER(10, 2)) = -3.14 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ROUND(((-2.5) * POWER(10, 0))::numeric) / POWER(10, 0)) = -3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ROUND(((-0.125) * POWER(10, 2))::numeric) / POWER(10, 2)) = -0.13 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN (ROUND(((42) * POWER(10, 2))::numeric) / POWER(10, 2)) = 42 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ROUND(((7) * POWER(10, 0))::numeric) / POWER(10, 0)) = 7 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
