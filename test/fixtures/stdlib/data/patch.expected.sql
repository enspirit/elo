CASE WHEN elo_patch(('{}'::jsonb)::jsonb, (ARRAY['name'])::text[], to_jsonb('Alice')) = jsonb_build_object('name', 'Alice') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_patch((jsonb_build_object('name', 'Alice'))::jsonb, (ARRAY['name'])::text[], to_jsonb('Bob')) = jsonb_build_object('name', 'Bob') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_patch((jsonb_build_object('name', 'Alice'))::jsonb, (ARRAY['age'])::text[], to_jsonb(30)) = jsonb_build_object('name', 'Alice', 'age', 30) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_patch(('{}'::jsonb)::jsonb, (ARRAY['user', 'name'])::text[], to_jsonb('Bob')) = jsonb_build_object('user', jsonb_build_object('name', 'Bob')) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_patch(('{}'::jsonb)::jsonb, (ARRAY['foo', 0, 'bar'])::text[], to_jsonb(12)) = jsonb_build_object('foo', ARRAY[jsonb_build_object('bar', 12)]) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_patch((jsonb_build_object('items', ARRAY[1, 2, 3]))::jsonb, (ARRAY['items', 1])::text[], to_jsonb(99)) = jsonb_build_object('items', ARRAY[1, 99, 3]) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_patch((jsonb_build_object('items', ARRAY[1]))::jsonb, (ARRAY['items', 3])::text[], to_jsonb(99)) = jsonb_build_object('items', ARRAY[1, NULL, NULL, 99]) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_patch((NULL)::jsonb, (ARRAY['x'])::text[], to_jsonb(1)) = jsonb_build_object('x', 1) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_patch(('{}'::jsonb)::jsonb, (ARRAY['a', 'b', 'c'])::text[], to_jsonb(1)) = jsonb_build_object('a', jsonb_build_object('b', jsonb_build_object('c', 1))) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
TRUE /* assertFails not supported in SQL */
TRUE /* assertFails not supported in SQL */
TRUE /* assertFails not supported in SQL */
