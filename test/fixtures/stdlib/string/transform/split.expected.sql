CASE WHEN elo_split('a,b,c', ',') = ARRAY['a', 'b', 'c'] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_split('hello world', ' ') = ARRAY['hello', 'world'] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_split('one', ',') = ARRAY['one'] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (elo_split('', ',') IS NOT NULL AND CARDINALITY(elo_split('', ',')) = 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN elo_split('abc', '') = ARRAY['a', 'b', 'c'] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_split('9', '') = ARRAY['9'] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (elo_split('', '') IS NOT NULL AND CARDINALITY(elo_split('', '')) = 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN COALESCE(CARDINALITY(elo_split('BE68539007547034', '')), 0) = 16 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
