CASE WHEN CONCAT('hello', ' world') = 'hello world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CONCAT('', 'test') = 'test' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 'hello' || ' ' || 'world' = 'hello world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REPEAT('hi', 3) = 'hihihi' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REPEAT('hi', 3) = 'hihihi' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REPEAT('ab', 2) = 'abab' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REPEAT('', 5) = '' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REPEAT('x', 0) = '' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
