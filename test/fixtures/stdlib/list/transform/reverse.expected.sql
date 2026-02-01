CASE WHEN (SELECT ARRAY_AGG(elem ORDER BY ord DESC) FROM UNNEST(ARRAY[1, 2, 3]) WITH ORDINALITY AS t(elem, ord)) = ARRAY[3, 2, 1] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT ARRAY_AGG(elem ORDER BY ord DESC) FROM UNNEST(ARRAY[]) WITH ORDINALITY AS t(elem, ord)) = ARRAY[] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT ARRAY_AGG(elem ORDER BY ord DESC) FROM UNNEST(ARRAY['a', 'b', 'c']) WITH ORDINALITY AS t(elem, ord)) = ARRAY['c', 'b', 'a'] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT ARRAY_AGG(elem ORDER BY ord DESC) FROM UNNEST(ARRAY[1]) WITH ORDINALITY AS t(elem, ord)) = ARRAY[1] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
