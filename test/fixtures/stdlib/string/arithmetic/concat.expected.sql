CASE WHEN CONCAT('hello', ' world') = 'hello world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CONCAT('', 'test') = 'test' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 'hello' || ' ' || 'world' = 'hello world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_repeat('hi', 3) = 'hihihi' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_repeat('hi', 3) = 'hihihi' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_repeat('ab', 2) = 'abab' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_repeat('', 5) = '' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_repeat('x', 0) = '' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
