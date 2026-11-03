












CASE WHEN (jsonb_build_object('a', 1)->>'a')::numeric = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', 1)->>'a')::numeric <> 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', 1.5)->>'a')::numeric = 1.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', 1.0)->>'a')::numeric = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', TRUE)->>'a')::boolean = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', FALSE)->>'a')::boolean <> TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', 'x')->>'a') = 'x' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', DATE '2024-01-15')->>'a')::date = DATE '2024-01-15' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', TIMESTAMP '2024-01-15 10:30:00')->>'a')::timestamp = TIMESTAMP '2024-01-15 10:30:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN (jsonb_build_object('a', 1)->>'a')::numeric + 1 = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', 7)->>'a')::numeric - 2 = 5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', 3)->>'a')::numeric * 3 = 9 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', 10)->>'a')::numeric::double precision / 4 = 2.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', 1, 'b', 2)->>'a')::numeric + (jsonb_build_object('a', 1, 'b', 2)->>'b')::numeric = 3 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN (jsonb_build_object('a', 'x', 'b', 'y')->>'a') || (jsonb_build_object('a', 'x', 'b', 'y')->>'b') = 'xy' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN (jsonb_build_object('a', 10)->>'a')::numeric > 9 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', 10)->>'a')::numeric >= 10 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', 10)->>'a')::numeric < 11 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (jsonb_build_object('a', 1, 'b', 2)->>'a')::numeric < (jsonb_build_object('a', 1, 'b', 2)->>'b')::numeric THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END

CASE WHEN (jsonb_build_object('a', 'a', 'b', 'b')->>'a') < (jsonb_build_object('a', 'a', 'b', 'b')->>'b') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END




CASE WHEN UPPER((jsonb_build_object('a', 'x')->>'a')) = 'X' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TRIM((jsonb_build_object('a', ' x ')->>'a')) = 'x' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END


CASE WHEN (SELECT (o->>'n')::numeric FROM (SELECT jsonb_build_object('n', 10) AS o) AS _let) = 10 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT (o->>'n')::numeric + 5 FROM (SELECT jsonb_build_object('n', 10) AS o) AS _let) = 15 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT elo_int(COALESCE((o->>'x'), (0)::text)) FROM (SELECT jsonb_build_object('x', '12') AS o) AS _let) = 12 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END






CASE WHEN (SELECT (SELECT n FROM (SELECT (o->>'n')::numeric AS n) AS _let) FROM (SELECT jsonb_build_object('n', 10) AS o) AS _let) = 10 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT (SELECT n + 5 FROM (SELECT (o->>'n')::numeric AS n) AS _let) FROM (SELECT jsonb_build_object('n', 10) AS o) AS _let) = 15 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT (SELECT (SELECT m * 2 FROM (SELECT n AS m) AS _let) FROM (SELECT (o->>'n')::numeric AS n) AS _let) FROM (SELECT jsonb_build_object('n', 10) AS o) AS _let) = 20 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT (SELECT (SELECT m > 9 FROM (SELECT n AS m) AS _let) FROM (SELECT (o->>'n')::numeric AS n) AS _let) FROM (SELECT jsonb_build_object('n', 10) AS o) AS _let) = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT (SELECT f FROM (SELECT (o->>'f')::numeric AS f) AS _let) FROM (SELECT jsonb_build_object('f', 1.5) AS o) AS _let) = 1.5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT (SELECT b FROM (SELECT (o->>'b')::boolean AS b) AS _let) FROM (SELECT jsonb_build_object('b', TRUE) AS o) AS _let) = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT (SELECT d FROM (SELECT (o->>'d')::date AS d) AS _let) FROM (SELECT jsonb_build_object('d', DATE '2024-01-15') AS o) AS _let) = DATE '2024-01-15' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END

CASE WHEN (SELECT (SELECT s || '-a' FROM (SELECT (o->>'s') AS s) AS _let) FROM (SELECT jsonb_build_object('s', 'x') AS o) AS _let) = 'x-a' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT (SELECT (SELECT s < t FROM (SELECT (o->>'t') AS t) AS _let) FROM (SELECT (o->>'s') AS s) AS _let) FROM (SELECT jsonb_build_object('s', 'a', 't', 'b') AS o) AS _let) = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
