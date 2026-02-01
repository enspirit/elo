CASE WHEN LOWER('WORLD') = 'world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LOWER('MiXeD') = 'mixed' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LOWER('HELLO' || ' ' || 'WORLD') = 'hello world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
