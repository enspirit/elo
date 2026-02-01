CASE WHEN RTRIM('hello  ') = 'hello' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN RTRIM('  hello  ') = '  hello' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN RTRIM('hello') = 'hello' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN RTRIM('   ') = '' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
