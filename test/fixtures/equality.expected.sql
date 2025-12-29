CASE WHEN 42 = 42 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 40 + 2 = 42 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 42 <> 43 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 3.14 = 3.14 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 3 + 0.14 = 3.14 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 3.14 <> 3.15 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TRUE = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN FALSE = FALSE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TRUE <> FALSE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 1 = 1 = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 'hello' = 'hello' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 'hel' || 'lo' = 'hello' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 'hello' <> 'world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2024-01-15' = DATE '2024-01-15' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2024-01-14' + INTERVAL 'P1D' = DATE '2024-01-15' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2024-01-15' <> DATE '2024-01-16' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TIMESTAMP '2024-01-15 10:00:00' = TIMESTAMP '2024-01-15 10:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TIMESTAMP '2024-01-15 09:00:00' + INTERVAL 'PT1H' = TIMESTAMP '2024-01-15 10:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TIMESTAMP '2024-01-15 10:00:00' <> TIMESTAMP '2024-01-15 11:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'P1D' = INTERVAL 'P1D' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'P1D' + INTERVAL 'P1D' = INTERVAL 'P2D' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 2 * INTERVAL 'P1D' = INTERVAL 'P2D' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'P2D' / 2 = INTERVAL 'P1D' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'P1D' <> INTERVAL 'P2D' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'PT1H' = INTERVAL 'PT1H' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'PT30M' + INTERVAL 'PT30M' = INTERVAL 'PT1H' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'PT1H' <> INTERVAL 'PT2H' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'P2D' - INTERVAL 'P1D' = INTERVAL 'P1D' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'PT2H' - INTERVAL 'PT1H' = INTERVAL 'PT1H' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CASE WHEN TIMESTAMP '2024-01-15 10:00:00' - TIMESTAMP '2024-01-15 09:00:00' IS NULL THEN 'Null' WHEN pg_typeof(TIMESTAMP '2024-01-15 10:00:00' - TIMESTAMP '2024-01-15 09:00:00')::text LIKE '%[]' THEN 'List' ELSE CASE pg_typeof(TIMESTAMP '2024-01-15 10:00:00' - TIMESTAMP '2024-01-15 09:00:00')::text WHEN 'integer' THEN 'Int' WHEN 'bigint' THEN 'Int' WHEN 'double precision' THEN 'Float' WHEN 'numeric' THEN 'Float' WHEN 'boolean' THEN 'Bool' WHEN 'text' THEN 'String' WHEN 'character varying' THEN 'String' WHEN 'unknown' THEN 'String' WHEN 'interval' THEN 'Duration' WHEN 'date' THEN 'DateTime' WHEN 'timestamp without time zone' THEN 'DateTime' WHEN 'timestamp with time zone' THEN 'DateTime' ELSE 'Tuple' END END = 'Duration' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
