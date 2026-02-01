CASE WHEN ('hello world' LIKE '%' || 'world') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN NOT ('hello world' LIKE '%' || 'hello') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
