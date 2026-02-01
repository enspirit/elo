CASE WHEN UPPER('hello') = 'HELLO' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN UPPER('MiXeD') = 'MIXED' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN UPPER('hello' || ' ' || 'world') = 'HELLO WORLD' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
