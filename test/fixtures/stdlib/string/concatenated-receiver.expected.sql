








CASE WHEN starts_with('ab' || 'cd', 'abc') = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN ('ab' || 'cd' LIKE '%' || 'bcd') = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (POSITION('bc' IN 'ab' || 'cd') > 0) = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (NULLIF(POSITION('c' IN 'ab' || 'cd'), 0) - 1) = 2 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN CONCAT('ab' || 'cd', 'e') = 'abcde' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN SUBSTRING('ab' || 'cd' FROM 1 + 1 FOR 2) = 'bc' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN SUBSTRING('ab' || 'cd' FROM 1 + 1 FOR (3) - (1)) = 'bc' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (CASE WHEN POSITION('c' IN 'ab' || 'cd') > 0 THEN LEFT('ab' || 'cd', POSITION('c' IN 'ab' || 'cd') - 1) || 'Z' || SUBSTRING('ab' || 'cd' FROM POSITION('c' IN 'ab' || 'cd') + LENGTH('c')) ELSE 'ab' || 'cd' END) = 'abZd' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REPLACE('ab' || 'cdc', 'c', 'Z') = 'abZdZ' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_lpad('a' || 'b', 4, '0') = '00ab' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_rpad('a' || 'b', 4, '0') = 'ab00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN elo_split('a,' || 'b', ',') = ARRAY['a', 'b'] THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN REVERSE('ab' || 'cd') = 'dcba' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (LENGTH('a' || 'b') = 0) = FALSE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN (LENGTH(TRIM(' ' || ' ')) = 0) = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN LENGTH('ab' || 'cd') = 4 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN UPPER('ab' || 'cd') = 'ABCD' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
