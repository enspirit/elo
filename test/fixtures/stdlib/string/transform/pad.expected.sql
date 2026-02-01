CASE WHEN LPAD('42', 5, '0') = '00042' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN RPAD('hi', 5, '.') = 'hi...' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
