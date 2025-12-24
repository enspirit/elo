-- SQL prelude for Klang
-- These functions provide time injection for testable SQL compilation mode.
-- Set klang.now via: SET klang.now = '2025-12-01T12:00:00';
-- Clear with: RESET klang.now;

CREATE OR REPLACE FUNCTION klang_now() RETURNS TIMESTAMP AS $$
BEGIN
  -- Check if klang.now is set and not empty
  IF current_setting('klang.now', true) IS NOT NULL
     AND current_setting('klang.now', true) <> '' THEN
    RETURN current_setting('klang.now', true)::TIMESTAMP;
  ELSE
    RETURN CURRENT_TIMESTAMP;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION klang_today() RETURNS DATE AS $$
BEGIN
  -- Check if klang.now is set and not empty
  IF current_setting('klang.now', true) IS NOT NULL
     AND current_setting('klang.now', true) <> '' THEN
    RETURN current_setting('klang.now', true)::DATE;
  ELSE
    RETURN CURRENT_DATE;
  END IF;
END;
$$ LANGUAGE plpgsql;
