







CASE WHEN (jsonb_build_object('v', 'x'))::jsonb #> (ARRAY['v'])::text[] = to_jsonb('x'::text) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('v', 'x'))::jsonb #> (ARRAY['v'])::text[] <> to_jsonb('y'::text) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('v', 42))::jsonb #> (ARRAY['v'])::text[] = to_jsonb(42::integer) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('v', 42))::jsonb #> (ARRAY['v'])::text[] <> to_jsonb(43::integer) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('v', 1.5))::jsonb #> (ARRAY['v'])::text[] = to_jsonb(1.5::double precision) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('v', TRUE))::jsonb #> (ARRAY['v'])::text[] = to_jsonb(TRUE::boolean) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('v', FALSE))::jsonb #> (ARRAY['v'])::text[] = to_jsonb(FALSE::boolean) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('v', ARRAY[1, 2]))::jsonb #> (ARRAY['v'])::text[] = to_jsonb(ARRAY[1, 2]) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('v', jsonb_build_object('a', 1)))::jsonb #> (ARRAY['v'])::text[] = jsonb_build_object('a', 1) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('v', DATE '2024-01-15'))::jsonb #> (ARRAY['v'])::text[] = to_jsonb(DATE '2024-01-15'::date) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END



CASE WHEN (jsonb_build_object('a', jsonb_build_object('b', 7)))::jsonb #> (ARRAY['a', 'b'])::text[] = to_jsonb(7::integer) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', jsonb_build_object('b', jsonb_build_object('c', 'deep'))))::jsonb #> (ARRAY['a', 'b', 'c'])::text[] = to_jsonb('deep'::text) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN (jsonb_build_object('v', 42)->>'v')::numeric = 42 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((elo_data('{"v": 42}')->>'v'))::numeric = 42 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (elo_data('{"v": "x"}')->>'v') = 'x' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((elo_data('{"v": true}')->>'v'))::boolean = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((elo_data('{"v": 1.5}')->>'v'))::numeric = 1.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((elo_data('{"a": {"b": 7}}') #>> ARRAY['a', 'b']))::numeric = 7 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (elo_data('{"a": {"b": {"c": "deep"}}}') #>> ARRAY['a', 'b', 'c']) = 'deep' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
