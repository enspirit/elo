CASE WHEN (SELECT ARRAY_AGG(v ORDER BY v) FROM UNNEST(ARRAY[3, 1, 4, 1, 5]) AS v) = ARRAY[1, 1, 3, 4, 5] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT ARRAY_AGG(v ORDER BY v) FROM UNNEST(ARRAY['banana', 'apple', 'cherry']) AS v) = ARRAY['apple', 'banana', 'cherry'] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT ARRAY_AGG(v ORDER BY v) FROM UNNEST(ARRAY[]) AS v) = ARRAY[] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (SELECT ARRAY_AGG(v ORDER BY v) FROM UNNEST(ARRAY[1]) AS v) = ARRAY[1] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
