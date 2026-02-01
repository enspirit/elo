CASE WHEN (POSITION('lo wo' IN 'hello world') > 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (POSITION('hello' IN 'hello world') > 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN NOT (POSITION('xyz' IN 'hello world') > 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
