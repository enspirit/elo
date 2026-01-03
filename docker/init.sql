-- Elo SQL runtime helper functions
-- These functions support type coercion and error handling

-- Error handling: throw an exception with the given message
CREATE OR REPLACE FUNCTION elo_fail(msg TEXT) RETURNS VOID AS $$
BEGIN
  RAISE EXCEPTION '%', msg;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Type selector: Int - parse string to integer, throws on failure
CREATE OR REPLACE FUNCTION elo_int(v TEXT) RETURNS INTEGER AS $$
BEGIN
  RETURN v::INTEGER;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '.: expected Int, got %', quote_literal(v);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION elo_int(v ANYELEMENT) RETURNS INTEGER AS $$
BEGIN
  RETURN v::INTEGER;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '.: expected Int, got %', pg_typeof(v);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Type selector: Float - parse string to double precision, throws on failure
CREATE OR REPLACE FUNCTION elo_float(v TEXT) RETURNS DOUBLE PRECISION AS $$
BEGIN
  RETURN v::DOUBLE PRECISION;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '.: expected Float, got %', quote_literal(v);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION elo_float(v ANYELEMENT) RETURNS DOUBLE PRECISION AS $$
BEGIN
  RETURN v::DOUBLE PRECISION;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '.: expected Float, got %', pg_typeof(v);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Type selector: Date - parse ISO date string, throws on failure
CREATE OR REPLACE FUNCTION elo_date(v TEXT) RETURNS DATE AS $$
BEGIN
  IF v !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION '.: expected Date (YYYY-MM-DD), got %', quote_literal(v);
  END IF;
  RETURN v::DATE;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '.: expected Date (YYYY-MM-DD), got %', quote_literal(v);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION elo_date(v ANYELEMENT) RETURNS DATE AS $$
BEGIN
  RETURN v::DATE;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '.: expected Date, got %', pg_typeof(v);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Type selector: Datetime - parse ISO datetime string, throws on failure
CREATE OR REPLACE FUNCTION elo_datetime(v TEXT) RETURNS TIMESTAMP AS $$
BEGIN
  RETURN v::TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '.: expected Datetime, got %', quote_literal(v);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION elo_datetime(v ANYELEMENT) RETURNS TIMESTAMP AS $$
BEGIN
  RETURN v::TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '.: expected Datetime, got %', pg_typeof(v);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Type selector: Duration - parse ISO duration string, throws on failure
CREATE OR REPLACE FUNCTION elo_duration(v TEXT) RETURNS INTERVAL AS $$
BEGIN
  RETURN v::INTERVAL;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '.: expected Duration (ISO 8601), got %', quote_literal(v);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION elo_duration(v ANYELEMENT) RETURNS INTERVAL AS $$
BEGIN
  RETURN v::INTERVAL;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '.: expected Duration, got %', pg_typeof(v);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Type selector: Data - parse JSON string to JSONB, throws on failure
CREATE OR REPLACE FUNCTION elo_data(v TEXT) RETURNS JSONB AS $$
BEGIN
  RETURN v::JSONB;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '.: invalid JSON: %', quote_literal(v);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION elo_data(v ANYELEMENT) RETURNS JSONB AS $$
BEGIN
  RETURN to_jsonb(v);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '.: expected Data, got %', pg_typeof(v);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Patch a value at a path in JSONB, creating intermediate structures as needed
CREATE OR REPLACE FUNCTION elo_patch(data JSONB, path TEXT[], value JSONB) RETURNS JSONB AS $$
DECLARE
  seg TEXT;
  rest TEXT[];
  next_default JSONB;
  existing JSONB;
  arr JSONB;
  obj JSONB;
  i INTEGER;
  arr_len INTEGER;
BEGIN
  IF array_length(path, 1) IS NULL OR array_length(path, 1) = 0 THEN
    RETURN value;
  END IF;

  seg := path[1];
  rest := path[2:];

  -- Determine what default structure to create for next level
  IF array_length(rest, 1) IS NULL OR array_length(rest, 1) = 0 THEN
    next_default := 'null'::jsonb;
  ELSIF rest[1] ~ '^\d+$' THEN
    next_default := '[]'::jsonb;
  ELSE
    next_default := '{}'::jsonb;
  END IF;

  -- Is this an array index?
  IF seg ~ '^\d+$' THEN
    i := seg::INTEGER;
    IF data IS NOT NULL AND jsonb_typeof(data) != 'null' AND jsonb_typeof(data) != 'array' THEN
      RAISE EXCEPTION 'cannot patch array index on non-array';
    END IF;
    arr := COALESCE(NULLIF(data, 'null'::jsonb), '[]'::jsonb);
    arr_len := jsonb_array_length(arr);
    -- Extend array with nulls if needed
    WHILE arr_len <= i LOOP
      arr := arr || 'null'::jsonb;
      arr_len := arr_len + 1;
    END LOOP;
    existing := arr->i;
    IF existing IS NULL OR jsonb_typeof(existing) = 'null' THEN
      existing := next_default;
    END IF;
    arr := jsonb_set(arr, ARRAY[i::TEXT], elo_patch(existing, rest, value));
    RETURN arr;
  ELSE
    -- Object key
    IF data IS NOT NULL AND jsonb_typeof(data) != 'null' AND jsonb_typeof(data) = 'array' THEN
      RAISE EXCEPTION 'cannot patch object key on array';
    END IF;
    obj := COALESCE(NULLIF(data, 'null'::jsonb), '{}'::jsonb);
    existing := obj->seg;
    IF existing IS NULL OR jsonb_typeof(existing) = 'null' THEN
      existing := next_default;
    END IF;
    RETURN jsonb_set(obj, ARRAY[seg], elo_patch(existing, rest, value));
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- String selector: convert any value to Elo literal format
CREATE OR REPLACE FUNCTION elo_string(v JSONB) RETURNS TEXT AS $$
DECLARE
  t TEXT;
  result TEXT;
  elem JSONB;
  key TEXT;
  val JSONB;
  first_elem BOOLEAN;
BEGIN
  IF v IS NULL THEN
    RETURN 'null';
  END IF;
  t := jsonb_typeof(v);
  IF t = 'null' THEN
    RETURN 'null';
  ELSIF t = 'boolean' THEN
    RETURN CASE WHEN v::BOOLEAN THEN 'true' ELSE 'false' END;
  ELSIF t = 'number' THEN
    RETURN v#>>'{}';
  ELSIF t = 'string' THEN
    RETURN '''' || REPLACE(REPLACE(v#>>'{}', '\', '\\'), '''', '\''') || '''';
  ELSIF t = 'array' THEN
    result := '[';
    first_elem := TRUE;
    FOR elem IN SELECT * FROM jsonb_array_elements(v) LOOP
      IF NOT first_elem THEN result := result || ', '; END IF;
      result := result || elo_string(elem);
      first_elem := FALSE;
    END LOOP;
    RETURN result || ']';
  ELSIF t = 'object' THEN
    result := '{';
    first_elem := TRUE;
    FOR key, val IN SELECT * FROM jsonb_each(v) LOOP
      IF NOT first_elem THEN result := result || ', '; END IF;
      result := result || key || ': ' || elo_string(val);
      first_elem := FALSE;
    END LOOP;
    RETURN result || '}';
  ELSE
    RETURN v::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- elo_string for arrays (native PostgreSQL arrays to Elo format)
CREATE OR REPLACE FUNCTION elo_string(v ANYARRAY) RETURNS TEXT AS $$
BEGIN
  RETURN elo_string(to_jsonb(v));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Deep merge two JSONB objects recursively
CREATE OR REPLACE FUNCTION elo_deep_merge(a JSONB, b JSONB) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  key TEXT;
  val JSONB;
BEGIN
  -- If either is not an object, b wins
  IF jsonb_typeof(a) != 'object' OR jsonb_typeof(b) != 'object' THEN
    RETURN b;
  END IF;

  result := a;
  FOR key, val IN SELECT * FROM jsonb_each(b) LOOP
    IF result ? key AND jsonb_typeof(result->key) = 'object' AND jsonb_typeof(val) = 'object' THEN
      result := jsonb_set(result, ARRAY[key], elo_deep_merge(result->key, val));
    ELSE
      result := jsonb_set(result, ARRAY[key], val);
    END IF;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
