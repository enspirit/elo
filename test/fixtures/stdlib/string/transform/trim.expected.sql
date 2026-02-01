CASE WHEN TRIM('  hello  ') = 'hello' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TRIM('no spaces') = 'no spaces' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TRIM('   ') = '' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TRIM(' hello ' || ' world ') = 'hello  world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
