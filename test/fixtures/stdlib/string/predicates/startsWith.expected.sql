CASE WHEN starts_with('hello world', 'hello') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN NOT starts_with('hello world', 'world') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
