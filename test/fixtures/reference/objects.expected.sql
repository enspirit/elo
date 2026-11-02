CASE WHEN '{}'::jsonb->>'budget' IS NULL = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('budget', 1500)->>'budget')::numeric = 1500 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN jsonb_build_object('name', 'Alice', 'age', 30)->>'name' = 'Alice' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('name', 'Alice', 'age', 30)->>'age')::numeric = 30 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((SELECT obj->>'x' FROM (SELECT jsonb_build_object('x', 10) AS obj) AS _let))::numeric = 10 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
