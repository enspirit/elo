CASE WHEN REGEXP_REPLACE('hello world', 'world', 'there') = 'hello there' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REGEXP_REPLACE('abab', 'ab', 'x') = 'xab' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REGEXP_REPLACE('abab', 'ab', 'x', 'g') = 'xx' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
