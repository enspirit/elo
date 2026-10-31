CASE WHEN (SELECT MAX(v) FROM UNNEST(ARRAY[3, 1, 4, 1, 5]) AS v) = 5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT MAX(v) FROM UNNEST(ARRAY[42]) AS v) = 42 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT MAX(v) FROM UNNEST(ARRAY[-3, -1, -4]) AS v) = -1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT MAX(v) FROM UNNEST(ARRAY[]) AS v) IS NULL THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN CASE WHEN (SELECT MAX(v) FROM UNNEST(ARRAY[date_trunc('day', CURRENT_TIMESTAMP), date_trunc('day', CURRENT_TIMESTAMP) - INTERVAL 'P1D']) AS v) IS NULL THEN 'Null' WHEN pg_typeof((SELECT MAX(v) FROM UNNEST(ARRAY[date_trunc('day', CURRENT_TIMESTAMP), date_trunc('day', CURRENT_TIMESTAMP) - INTERVAL 'P1D']) AS v))::text LIKE '%[]' THEN 'List' ELSE CASE pg_typeof((SELECT MAX(v) FROM UNNEST(ARRAY[date_trunc('day', CURRENT_TIMESTAMP), date_trunc('day', CURRENT_TIMESTAMP) - INTERVAL 'P1D']) AS v))::text WHEN 'integer' THEN 'Int' WHEN 'bigint' THEN 'Int' WHEN 'double precision' THEN 'Float' WHEN 'numeric' THEN 'Float' WHEN 'boolean' THEN 'Bool' WHEN 'text' THEN 'String' WHEN 'character varying' THEN 'String' WHEN 'unknown' THEN 'String' WHEN 'interval' THEN 'Duration' WHEN 'date' THEN 'DateTime' WHEN 'timestamp without time zone' THEN 'DateTime' WHEN 'timestamp with time zone' THEN 'DateTime' ELSE 'Tuple' END END = 'DateTime' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT MAX(v) FROM UNNEST(ARRAY[date_trunc('day', CURRENT_TIMESTAMP), date_trunc('day', CURRENT_TIMESTAMP) - INTERVAL 'P1D']) AS v) = date_trunc('day', CURRENT_TIMESTAMP) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN GREATEST(3, 7) = 7 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN GREATEST(7, 3) = 7 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN GREATEST(-5, 2) = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN GREATEST(4, 4) = 4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN GREATEST(2.5, 1.5) = 2.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN GREATEST(1, 2.5) = 2.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END

CASE WHEN GREATEST(LEAST(15, 10), 0) = 10 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN GREATEST(LEAST(-3, 10), 0) = 0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN GREATEST(LEAST(5, 10), 0) = 5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN GREATEST('a', 'b') = 'b' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN GREATEST('b', 'a') = 'b' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
