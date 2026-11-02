











CASE WHEN ((7 % 3) + 3) % 3 = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((9 % 3) + 3) % 3 = 0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((0 % 5) + 5) % 5 = 0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((1 % 5) + 5) % 5 = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN ((-7 % 3) + 3) % 3 = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((-1 % 3) + 3) % 3 = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((-3 % 3) + 3) % 3 = 0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((-9 % 5) + 5) % 5 = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN ((7 % -3) + -3) % -3 = -2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((1 % -3) + -3) % -3 = -2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((-7 % -3) + -3) % -3 = -1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((-9 % -5) + -5) % -5 = -4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN ((7.5 % 2) + 2) % 2 = 1.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((-7.5 % 2) + 2) % 2 = 0.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((7.5 % -2) + -2) % -2 = -0.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN ((-1 % 7) + 7) % 7 = 6 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((-8 % 7) + 7) % 7 = 6 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (((0 - 15) % 7) + 7) % 7 = 6 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN ((7 % 3) + 3) % 3 + 10 = 11 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((-7 % 3) + 3) % 3 * 2 = 4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT ((n % 3) + 3) % 3 FROM (SELECT -7 AS n) AS _let) = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
