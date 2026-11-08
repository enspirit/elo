/**
 * SQL prelude: the PL/pgSQL runtime helpers the SQL compiler calls.
 *
 * This is the one difference from the other three targets. The JavaScript,
 * Ruby and Python preludes are *prepended to the compiled expression*; this
 * one cannot be, because a pure SQL expression has nowhere to define a
 * function. It has to be installed in the database once, which makes it a
 * deployment step for the host:
 *
 *     eloc --prelude-only -t sql | psql "$DATABASE_URL"
 *
 * `src/bindings/sql.ts` is the only place calls to these helpers are emitted;
 * `test/unit/sql-prelude-consistency.unit.test.ts` keeps the two in step.
 *
 * String.raw is required: the definitions contain backslash escapes (`\d` in
 * regexes, `'\\'` in elo_string) that a plain template literal would eat.
 */
import { MAX_STRING_LENGTH } from '../runtime';

export const sqlPrelude = String.raw`-- Elo SQL runtime helper functions
-- These functions support type coercion and error handling
--
-- Unlike the JavaScript, Ruby and Python preludes, this one is NOT prepended
-- to the compiled expression: a pure SQL expression cannot define a function.
-- Install it in the database once, before running any compiled Elo:
--
--   eloc --prelude-only -t sql | psql "$DATABASE_URL"
--
-- Every definition is CREATE OR REPLACE, so re-running it is idempotent.

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
    -- A short expression (patch([], .N, 1)) must not force an N-element array:
    -- bound the fill by the same limit as string repeat/pad.
    IF i >= ${MAX_STRING_LENGTH} THEN
      RAISE EXCEPTION 'Array length limit (%) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger arrays', ${MAX_STRING_LENGTH};
    END IF;
    -- Extend with nulls in a single concatenation. A per-element loop re-copies
    -- the growing array each step, which is O(N^2) and let a modest index pin a
    -- database backend for minutes.
    IF arr_len <= i THEN
      arr := arr || COALESCE((SELECT jsonb_agg('null'::jsonb) FROM generate_series(arr_len, i)), '[]'::jsonb);
    END IF;
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

-- String() where the argument's type is not known statically.
--
-- elo_string *renders*: it quotes a string, so that '[1, 'a']' reads back as
-- Elo. String() *converts*, and on a string that is the identity — which is
-- what the typed String(String) does. Routing the unknown case through
-- elo_string made String(min(['abc'])) answer '''abc''' where String('abc')
-- answered 'abc'. Everything that is not a JSON string renders as before.
CREATE OR REPLACE FUNCTION elo_to_string(v JSONB) RETURNS TEXT AS $$
BEGIN
  IF v IS NOT NULL AND jsonb_typeof(v) = 'string' THEN
    RETURN v#>>'{}';
  END IF;
  RETURN elo_string(v);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- split(string, separator). string_to_array answers the whole string for an
-- empty separator, where the other three targets answer its characters, and it
-- is the only way Elo has to walk a string. regexp_split_to_array does split
-- into characters, but answers one empty string for an empty subject.
CREATE OR REPLACE FUNCTION elo_split(v TEXT, sep TEXT) RETURNS TEXT[] AS $$
BEGIN
  IF v = '' THEN RETURN ARRAY[]::TEXT[]; END IF;
  IF sep = '' THEN RETURN regexp_split_to_array(v, ''); END IF;
  RETURN string_to_array(v, sep);
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

-- String repeat and padding, bounded by ELO_MAX_STRING_LENGTH. The other
-- targets cap these through kRepeat/kPad; bare REPEAT/LPAD/RPAD let a short
-- expression ('a' * 1e9) build an arbitrarily large string on the backend.
-- The bound is checked on the *result* length, before PostgreSQL allocates it.
CREATE OR REPLACE FUNCTION elo_repeat(s TEXT, n INTEGER) RETURNS TEXT AS $$
BEGIN
  IF n <= 0 THEN RETURN ''; END IF;
  IF LENGTH(s)::BIGINT * n > ${MAX_STRING_LENGTH} THEN
    RAISE EXCEPTION 'String length limit (${MAX_STRING_LENGTH}) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings';
  END IF;
  RETURN REPEAT(s, n);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION elo_lpad(s TEXT, n INTEGER, pad TEXT) RETURNS TEXT AS $$
BEGIN
  IF n > ${MAX_STRING_LENGTH} THEN
    RAISE EXCEPTION 'String length limit (${MAX_STRING_LENGTH}) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings';
  END IF;
  RETURN LPAD(s, n, pad);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION elo_rpad(s TEXT, n INTEGER, pad TEXT) RETURNS TEXT AS $$
BEGIN
  IF n > ${MAX_STRING_LENGTH} THEN
    RAISE EXCEPTION 'String length limit (${MAX_STRING_LENGTH}) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings';
  END IF;
  RETURN RPAD(s, n, pad);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
`;
