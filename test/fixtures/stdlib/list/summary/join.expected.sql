CASE WHEN array_to_string(ARRAY['a', 'b', 'c'], ',') = 'a,b,c' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN array_to_string(ARRAY['hello', 'world'], ' ') = 'hello world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN array_to_string(ARRAY['one'], '-') = 'one' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN array_to_string(ARRAY[], ',') = '' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
