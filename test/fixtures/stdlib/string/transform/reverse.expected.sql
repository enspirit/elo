CASE WHEN REVERSE('hello') = 'olleh' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REVERSE('ab') = 'ba' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REVERSE('') = '' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REVERSE('a') = 'a' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
