CASE WHEN CASE WHEN TRUE THEN 1 ELSE 2 END = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CASE WHEN 5 > 3 THEN 'yes' ELSE 'no' END = 'yes' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CASE WHEN 1 > 2 THEN 'a' ELSE CASE WHEN 2 > 1 THEN 'b' ELSE 'c' END END = 'b' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CASE WHEN 10 > 5 THEN 100 + 1 ELSE 200 - 1 END = 101 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT CASE WHEN x > 5 THEN 'big' ELSE 'small' END FROM (SELECT 10 AS x) AS _let) = 'big' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CASE WHEN TRUE THEN (SELECT x + 1 FROM (SELECT 1 AS x) AS _let) ELSE (SELECT y + 2 FROM (SELECT 2 AS y) AS _let) END = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CASE WHEN TRUE AND TRUE THEN 1 ELSE 0 END = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CASE WHEN TRUE THEN TRUE ELSE FALSE END THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CASE WHEN 5 > 3 THEN 10 = 10 ELSE FALSE END THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END




CASE WHEN 1 + CASE WHEN TRUE THEN 10 ELSE 20 END = 11 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 1 + CASE WHEN FALSE THEN 10 ELSE 20 END = 21 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CASE WHEN TRUE THEN 10 ELSE 20 END + 1 = 11 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CASE WHEN FALSE THEN 10 ELSE 20 END + 1 = 21 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 2 * CASE WHEN FALSE THEN 3 ELSE 4 END = 8 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CASE WHEN FALSE THEN 3 ELSE 4 END * 2 = 8 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 10 - CASE WHEN FALSE THEN 3 ELSE 4 END = 6 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 12::double precision / CASE WHEN FALSE THEN 3 ELSE 4 END = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 'a' || CASE WHEN FALSE THEN 'b' ELSE 'c' END = 'ac' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN -CASE WHEN FALSE THEN 3 ELSE 4 END = -4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN NOT CASE WHEN FALSE THEN TRUE ELSE FALSE END THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CASE WHEN FALSE THEN 1 ELSE 2 END = 2 AND CASE WHEN TRUE THEN 1 ELSE 2 END = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CASE WHEN FALSE THEN 1 ELSE 2 END + CASE WHEN TRUE THEN 10 ELSE 20 END = 12 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (ROUND(((CASE WHEN FALSE THEN 1.26 ELSE 2.34 END) * POWER(10, 1))::numeric) / POWER(10, 1)) = 2.3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
