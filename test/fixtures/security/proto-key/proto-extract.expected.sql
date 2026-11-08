










CASE WHEN to_jsonb((SELECT CASE WHEN _m IS NOT NULL THEN jsonb_build_object('__proto__', _m[1]) ELSE jsonb_build_object('__proto__', NULL) END FROM (SELECT regexp_match('xmatchy', 'x(.*?)y')) AS _t(_m))) = jsonb_build_object('__proto__', 'match') THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN to_jsonb((SELECT CASE WHEN _m IS NOT NULL THEN jsonb_build_object('__proto__', _m[1]) ELSE jsonb_build_object('__proto__', NULL) END FROM (SELECT regexp_match('no match', 'x(.*?)y')) AS _t(_m))) = jsonb_build_object('__proto__', NULL) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ((SELECT CASE WHEN _m IS NOT NULL THEN jsonb_build_object('name', _m[1], '__proto__', _m[2]) ELSE jsonb_build_object('name', NULL, '__proto__', NULL) END FROM (SELECT regexp_match('From: John <john@acme.com>', 'From: (.*?) <(.*?)>')) AS _t(_m))->>'name') = 'John' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
