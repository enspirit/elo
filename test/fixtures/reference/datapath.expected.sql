CASE WHEN (jsonb_build_object('name', 'Alice'))::jsonb #> (ARRAY['name'])::text[] = 'Alice' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('user', jsonb_build_object('name', 'Bob')))::jsonb #> (ARRAY['user', 'name'])::text[] = 'Bob' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('items', ARRAY[10, 20, 30]))::jsonb #> (ARRAY['items', 0])::text[] = 10 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('items', ARRAY[10, 20, 30]))::jsonb #> (ARRAY['items', 2])::text[] = 30 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('list', ARRAY[jsonb_build_object('id', 1), jsonb_build_object('id', 2)]))::jsonb #> (ARRAY['list', 0, 'id'])::text[] = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('name', 'Alice'))::jsonb #> (ARRAY['missing'])::text[] IS NULL THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('name', 'Alice'))::jsonb #> (ARRAY['name', 'child'])::text[] IS NULL THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (NULL)::jsonb #> (ARRAY['x'])::text[] IS NULL THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN jsonb_build_object('x', (jsonb_build_object('a', 1, 'b', 2))::jsonb #> (ARRAY['a'])::text[], 'y', (jsonb_build_object('a', 1, 'b', 2))::jsonb #> (ARRAY['b'])::text[]) = jsonb_build_object('x', 1, 'y', 2) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN jsonb_build_object('v', (jsonb_build_object('foo', jsonb_build_object('bar', 10)))::jsonb #> (ARRAY['foo', 'bar'])::text[]) = jsonb_build_object('v', 10) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN jsonb_build_object('first', (jsonb_build_object('items', ARRAY[1, 2, 3]))::jsonb #> (ARRAY['items', 0])::text[], 'last', (jsonb_build_object('items', ARRAY[1, 2, 3]))::jsonb #> (ARRAY['items', 2])::text[]) = jsonb_build_object('first', 1, 'last', 3) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('x', 12))::jsonb #> ARRAY['x']::text[] = 12 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('x', 12))::jsonb #> (ARRAY['x'])::text[] = 12 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('user', jsonb_build_object('name', 'Bob')))::jsonb #> (ARRAY['user', 'name'])::text[] = 'Bob' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
