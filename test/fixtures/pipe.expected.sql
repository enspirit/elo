CASE WHEN UPPER('hello') = 'HELLO' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LOWER(TRIM('  HELLO  ')) = 'hello' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LPAD('42', 5, '0') = '00042' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ABS(0 - 5) = 5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REGEXP_REPLACE('hello world', 'world', 'elo') = 'hello elo' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
