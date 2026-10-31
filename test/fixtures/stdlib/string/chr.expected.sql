CASE WHEN CHR(65) = 'A' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CHR(98) = 'b' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CHR(10) = E'\n' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LENGTH(CHR(160)) = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CHR(160) <> ' ' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
