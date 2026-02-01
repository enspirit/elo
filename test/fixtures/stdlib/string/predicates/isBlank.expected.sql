CASE WHEN (LENGTH(TRIM('')) = 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (LENGTH(TRIM('   ')) = 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN NOT (LENGTH(TRIM('hello')) = 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN NOT (LENGTH(TRIM(' hi ')) = 0) THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
