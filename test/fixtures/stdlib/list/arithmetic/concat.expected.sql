CASE WHEN ARRAY[1, 2] || ARRAY[3, 4] = ARRAY[1, 2, 3, 4] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[] || ARRAY[1, 2] = ARRAY[1, 2] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[1, 2] || ARRAY[] = ARRAY[1, 2] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY[] || ARRAY[] = ARRAY[] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ARRAY['a'] || ARRAY['b', 'c'] = ARRAY['a', 'b', 'c'] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
