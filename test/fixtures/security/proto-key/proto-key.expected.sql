














CASE WHEN (jsonb_build_object('__proto__', 1, 'a', 2)->>'a')::numeric = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', 2, '__proto__', 1)->>'a')::numeric = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN jsonb_build_object('__proto__', 1) IS NOT NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('x', jsonb_build_object('__proto__', 1, 'b', 3)) #>> ARRAY['x', 'b'])::numeric = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
