CASE WHEN (SELECT ARRAY_AGG(elem) FROM UNNEST(ARRAY[ARRAY[1, 2], ARRAY[3, 4]]) AS sub, UNNEST(sub) AS elem) = ARRAY[1, 2, 3, 4] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT ARRAY_AGG(elem) FROM UNNEST(ARRAY[ARRAY[1], ARRAY[2], ARRAY[3]]) AS sub, UNNEST(sub) AS elem) = ARRAY[1, 2, 3] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT ARRAY_AGG(elem) FROM UNNEST(ARRAY[ARRAY[], ARRAY[1, 2]]) AS sub, UNNEST(sub) AS elem) = ARRAY[1, 2] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT ARRAY_AGG(elem) FROM UNNEST(ARRAY[]) AS sub, UNNEST(sub) AS elem) = ARRAY[] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
