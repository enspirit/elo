CASE WHEN string_to_array('a,b,c', ',') = ARRAY['a', 'b', 'c'] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN string_to_array('hello world', ' ') = ARRAY['hello', 'world'] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN string_to_array('one', ',') = ARRAY['one'] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (string_to_array('', ',') IS NOT NULL AND CARDINALITY(string_to_array('', ',')) = 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
