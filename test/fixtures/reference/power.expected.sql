








CASE WHEN POWER(2, 10) = 1024 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN POWER(2, 1) = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN POWER(2, 0) = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN POWER(9, 0.5) = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END

CASE WHEN POWER(2, -1) = 0.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN POWER(2, -2) = 0.25 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN POWER(4, -1) = 0.25 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN POWER(10, -3) = 0.001 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN CASE WHEN POWER(2, -1) IS NULL THEN 'Null' WHEN pg_typeof(POWER(2, -1))::text LIKE '%[]' THEN 'List' ELSE CASE pg_typeof(POWER(2, -1))::text WHEN 'integer' THEN 'Int' WHEN 'bigint' THEN 'Int' WHEN 'double precision' THEN 'Float' WHEN 'numeric' THEN 'Float' WHEN 'boolean' THEN 'Bool' WHEN 'text' THEN 'String' WHEN 'character varying' THEN 'String' WHEN 'unknown' THEN 'String' WHEN 'interval' THEN 'Duration' WHEN 'date' THEN 'DateTime' WHEN 'timestamp without time zone' THEN 'DateTime' WHEN 'timestamp with time zone' THEN 'DateTime' ELSE 'Tuple' END END = 'Float' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CASE WHEN POWER(2, -2) IS NULL THEN 'Null' WHEN pg_typeof(POWER(2, -2))::text LIKE '%[]' THEN 'List' ELSE CASE pg_typeof(POWER(2, -2))::text WHEN 'integer' THEN 'Int' WHEN 'bigint' THEN 'Int' WHEN 'double precision' THEN 'Float' WHEN 'numeric' THEN 'Float' WHEN 'boolean' THEN 'Bool' WHEN 'text' THEN 'String' WHEN 'character varying' THEN 'String' WHEN 'unknown' THEN 'String' WHEN 'interval' THEN 'Duration' WHEN 'date' THEN 'DateTime' WHEN 'timestamp without time zone' THEN 'DateTime' WHEN 'timestamp with time zone' THEN 'DateTime' ELSE 'Tuple' END END = 'Float' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN POWER(2, -1) IS NULL = FALSE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN POWER(2, -1) + 0.5 = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN POWER(2, -1) * 4 = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT POWER(2, e) FROM (SELECT -1 AS e) AS _let) = 0.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END





