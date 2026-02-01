CASE WHEN LENGTH('hello') = 5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LENGTH('') = 0 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LENGTH('abc def') = 7 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LENGTH('ab' || 'cd') = 4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
