CASE WHEN LENGTH('hello') = 5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LENGTH('') = 0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LENGTH('abc def') = 7 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN UPPER('hello') = 'HELLO' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LOWER('WORLD') = 'world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN UPPER('MiXeD') = 'MIXED' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LOWER('MiXeD') = 'mixed' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TRIM('  hello  ') = 'hello' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TRIM('no spaces') = 'no spaces' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TRIM('   ') = '' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN starts_with('hello world', 'hello') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN NOT starts_with('hello world', 'world') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ('hello world' LIKE '%' || 'world') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN NOT ('hello world' LIKE '%' || 'hello') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (POSITION('lo wo' IN 'hello world') > 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (POSITION('hello' IN 'hello world') > 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN NOT (POSITION('xyz' IN 'hello world') > 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN SUBSTRING('hello' FROM 0 + 1 FOR 2) = 'he' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN SUBSTRING('hello' FROM 1 + 1 FOR 3) = 'ell' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN SUBSTRING('hello world' FROM 6 + 1 FOR 5) = 'world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CONCAT('hello', ' world') = 'hello world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CONCAT('', 'test') = 'test' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (NULLIF(POSITION('world' IN 'hello world'), 0) - 1) = 6 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (NULLIF(POSITION('o' IN 'hello world'), 0) - 1) = 4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (NULLIF(POSITION('xyz' IN 'hello world'), 0) - 1) IS NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REGEXP_REPLACE('hello world', 'world', 'there') = 'hello there' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REGEXP_REPLACE('abab', 'ab', 'x') = 'xab' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REGEXP_REPLACE('abab', 'ab', 'x', 'g') = 'xx' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (LENGTH('') = 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN NOT (LENGTH('hello') = 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LPAD('42', 5, '0') = '00042' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN RPAD('hi', 5, '.') = 'hi...' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 'hello' || ' ' || 'world' = 'hello world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
