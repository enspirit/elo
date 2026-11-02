







CASE WHEN 7::double precision / 2 = 3.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 1::double precision / 4 = 0.25 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 10::double precision / 4 = 2.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 1::double precision / 3 > 0.33 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 3::double precision / 2 * 2 = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 100::double precision / 8 = 12.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN -7::double precision / 2 = -3.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 0::double precision / 5 = 0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN 7.0 / 2 = 3.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 7 / 2.0 = 3.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 7.5 / 2.5 = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN (SELECT 7::double precision / n FROM (SELECT 2 AS n) AS _let) = 3.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT (SELECT a::double precision / b FROM (SELECT 4 AS b) AS _let) FROM (SELECT 10 AS a) AS _let) = 2.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN (1 + 1)::double precision / 4 = 0.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 24 / (6::double precision / 2) = 8 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ROUND((7::double precision / 2)::numeric) = 4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
