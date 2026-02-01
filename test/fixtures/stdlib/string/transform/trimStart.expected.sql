CASE WHEN LTRIM('  hello') = 'hello' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LTRIM('  hello  ') = 'hello  ' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LTRIM('hello') = 'hello' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LTRIM('   ') = '' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
