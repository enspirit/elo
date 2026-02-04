/**
 * Elo runtime helpers for JavaScript execution.
 *
 * These helper function snippets are embedded directly in compiled output
 * when needed, wrapped in an IIFE for encapsulation.
 */

/**
 * Individual JavaScript helper function snippets.
 * Each helper is a standalone function that can be included in the output.
 * Used for dynamically-typed operations where types aren't known at compile time.
 */
/**
 * Dependencies between helpers. If helper A uses helper B, A depends on B.
 */
export const JS_HELPER_DEPS: Record<string, string[]> = {
  kNeq: ['kEq'],
  kFetchObject: ['kFetch'],
  kFetchArray: ['kFetch'],
  // Parser helpers depend on pOk/pFail
  pAny: ['pOk'],
  pNull: ['pOk', 'pFail'],
  pString: ['pOk', 'pFail'],
  pInt: ['pOk', 'pFail'],
  pBool: ['pOk', 'pFail'],
  pDatetime: ['pOk', 'pFail'],
  pFloat: ['pOk', 'pFail'],
  pDate: ['pOk', 'pFail'],
  pDuration: ['pOk', 'pFail'],
  pData: ['pOk', 'pFail'],
};

export const JS_HELPERS: Record<string, string> = {
  kAdd: `function kAdd(l, r) {
  if (DateTime.isDateTime(l) && Duration.isDuration(r)) return l.plus(r);
  if (Duration.isDuration(l) && DateTime.isDateTime(r)) return r.plus(l);
  if (Duration.isDuration(l) && Duration.isDuration(r)) return Duration.fromMillis(l.toMillis() + r.toMillis());
  return l + r;
}`,
  kSub: `function kSub(l, r) {
  if (DateTime.isDateTime(l) && Duration.isDuration(r)) return l.minus(r);
  if (DateTime.isDateTime(l) && DateTime.isDateTime(r)) return Duration.fromMillis(l.toMillis() - r.toMillis());
  if (Duration.isDuration(l) && Duration.isDuration(r)) return Duration.fromMillis(l.toMillis() - r.toMillis());
  return l - r;
}`,
  kMul: `function kMul(l, r) {
  if (Duration.isDuration(l)) return Duration.fromMillis(l.toMillis() * r);
  if (Duration.isDuration(r)) return Duration.fromMillis(r.toMillis() * l);
  return l * r;
}`,
  kDiv: `function kDiv(l, r) {
  if (Duration.isDuration(l) && typeof r === 'number') return Duration.fromMillis(l.toMillis() / r);
  return l / r;
}`,
  kMod: `function kMod(l, r) { return l % r; }`,
  kPow: `function kPow(l, r) { return Math.pow(l, r); }`,
  kEq: `function kEq(l, r) {
  if (Duration.isDuration(l) && Duration.isDuration(r)) return l.toMillis() === r.toMillis();
  if (DateTime.isDateTime(l) && DateTime.isDateTime(r)) return l.toMillis() === r.toMillis();
  if (Array.isArray(l) && Array.isArray(r)) {
    if (l.length !== r.length) return false;
    for (let i = 0; i < l.length; i++) if (!kEq(l[i], r[i])) return false;
    return true;
  }
  if (typeof l === 'object' && typeof r === 'object' && l !== null && r !== null && !Array.isArray(l) && !Array.isArray(r)) {
    const keysL = Object.keys(l);
    const keysR = Object.keys(r);
    if (keysL.length !== keysR.length) return false;
    for (const key of keysL) if (!(key in r) || !kEq(l[key], r[key])) return false;
    return true;
  }
  return l == r;
}`,
  kNeq: `function kNeq(l, r) {
  return !kEq(l, r);
}`,
  kNeg: `function kNeg(v) {
  if (Duration.isDuration(v)) return Duration.fromMillis(-v.toMillis());
  return -v;
}`,
  kPos: `function kPos(v) { return +v; }`,
  kTypeOf: `function kTypeOf(v) {
  if (v === null || v === undefined) return 'Null';
  if (Duration.isDuration(v)) return 'Duration';
  if (DateTime.isDateTime(v)) return 'DateTime';
  if (typeof v === 'number') return Number.isInteger(v) ? 'Int' : 'Float';
  if (typeof v === 'boolean') return 'Bool';
  if (typeof v === 'string') return 'String';
  if (typeof v === 'function') return 'Function';
  if (Array.isArray(v)) return 'List';
  return 'Tuple';
}`,
  kIsNull: `function kIsNull(v) { return v === null || v === undefined; }`,
  kFetch: `function kFetch(data, path) {
  let current = data;
  for (const segment of path) {
    if (current === null || current === undefined) return null;
    if (typeof segment === 'number') {
      if (!Array.isArray(current)) return null;
      current = current[segment];
    } else {
      if (typeof current !== 'object' || current === null) return null;
      current = current[segment];
    }
  }
  return current === undefined ? null : current;
}`,
  kFetchObject: `function kFetchObject(data, paths) {
  const result = {};
  for (const key of Object.keys(paths)) {
    result[key] = kFetch(data, paths[key]);
  }
  return result;
}`,
  kFetchArray: `function kFetchArray(data, paths) {
  return paths.map(p => kFetch(data, p));
}`,
  kPatch: `function kPatch(data, path, value) {
  if (path.length === 0) return value;
  const seg = path[0];
  const rest = path.slice(1);
  const nextDefault = rest.length === 0 ? null : typeof rest[0] === 'number' ? [] : {};
  if (typeof seg === 'number') {
    if (data !== null && data !== undefined && !Array.isArray(data)) throw new Error('cannot patch array index on non-array');
    const arr = Array.isArray(data) ? [...data] : [];
    while (arr.length <= seg) arr.push(null);
    const existing = arr[seg];
    arr[seg] = kPatch(existing === null || existing === undefined ? nextDefault : existing, rest, value);
    return arr;
  } else {
    if (Array.isArray(data)) throw new Error('cannot patch object key on array');
    const obj = data !== null && data !== undefined && typeof data === 'object' ? {...data} : {};
    const existing = obj[seg];
    obj[seg] = kPatch(existing === null || existing === undefined ? nextDefault : existing, rest, value);
    return obj;
  }
}`,
  kMerge: `function kMerge(a, b) {
  return {...a, ...b};
}`,
  kDeepMerge: `function kDeepMerge(a, b) {
  if (typeof a !== 'object' || a === null || Array.isArray(a)) return b;
  if (typeof b !== 'object' || b === null || Array.isArray(b)) return b;
  const result = {...a};
  for (const key of Object.keys(b)) {
    result[key] = kDeepMerge(a[key], b[key]);
  }
  return result;
}`,
  // Type selectors
  kInt: `function kInt(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Math.trunc(v);
  if (typeof v === 'string') { const n = parseInt(v, 10); return isNaN(n) ? null : n; }
  return null;
}`,
  kFloat: `function kFloat(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? null : n; }
  return null;
}`,
  kBool: `function kBool(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') { if (v === 'true') return true; if (v === 'false') return false; }
  return null;
}`,
  kDate: `function kDate(v) {
  if (v === null || v === undefined) return null;
  if (DateTime.isDateTime(v)) return v.startOf('day');
  if (typeof v === 'string') { const d = DateTime.fromISO(v); return d.isValid && /^\\d{4}-\\d{2}-\\d{2}$/.test(v) ? d.startOf('day') : null; }
  return null;
}`,
  kDatetime: `function kDatetime(v) {
  if (v === null || v === undefined) return null;
  if (DateTime.isDateTime(v)) return v;
  if (typeof v === 'string') { const d = DateTime.fromISO(v); return d.isValid ? d : null; }
  return null;
}`,
  kDuration: `function kDuration(v) {
  if (v === null || v === undefined) return null;
  if (Duration.isDuration(v)) return v;
  if (typeof v === 'string') { const d = Duration.fromISO(v); return d.isValid ? d : null; }
  return null;
}`,
  kData: `function kData(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } }
  return v;
}`,
  kString: `function kString(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return "'" + v.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'") + "'";
  if (Duration.isDuration(v)) return v.toISO();
  if (DateTime.isDateTime(v)) {
    const iso = v.toISO();
    return iso.includes('T') && !iso.endsWith('T00:00:00.000') ? 'D' + iso.substring(0, 19) : 'D' + iso.substring(0, 10);
  }
  if (Array.isArray(v)) return '[' + v.map(kString).join(', ') + ']';
  if (typeof v === 'object') return '{' + Object.keys(v).map(k => k + ': ' + kString(v[k])).join(', ') + '}';
  return String(v);
}`,
  kIntersection: `function kIntersection(a, b) {
  const s = DateTime.max(a.start, b.start);
  const e = DateTime.min(a.end, b.end);
  return s >= e ? Interval.fromDateTimes(s, s) : Interval.fromDateTimes(s, e);
}`,

  // Parser helpers - return Result: { success: boolean, path: string, message: string, value: any, cause: Result[] }
  pOk: `function pOk(v, p) { return { success: true, path: p, message: '', value: v, cause: [] }; }`,
  pFail: `function pFail(p, m, c) { return { success: false, path: p, message: m || '', value: null, cause: c || [] }; }`,
  pAny: `function pAny(v, p) { return pOk(v, p); }`,
  pNull: `function pNull(v, p) {
  if (v === null || v === undefined) return pOk(null, p);
  return pFail(p, 'expected Null, got ' + typeof v);
}`,
  pString: `function pString(v, p) {
  if (typeof v === 'string') return pOk(v, p);
  return pFail(p, 'expected String, got ' + (v === null ? 'Null' : typeof v));
}`,
  pInt: `function pInt(v, p) {
  if (typeof v === 'number' && Number.isInteger(v)) return pOk(v, p);
  if (typeof v === 'string') { const n = parseInt(v, 10); if (!isNaN(n)) return pOk(n, p); }
  return pFail(p, 'expected Int, got ' + (v === null ? 'Null' : typeof v === 'string' ? JSON.stringify(v) : typeof v));
}`,
  pBool: `function pBool(v, p) {
  if (typeof v === 'boolean') return pOk(v, p);
  if (v === 'true') return pOk(true, p);
  if (v === 'false') return pOk(false, p);
  return pFail(p, 'expected Bool, got ' + (v === null ? 'Null' : typeof v === 'string' ? JSON.stringify(v) : typeof v));
}`,
  pDatetime: `function pDatetime(v, p) {
  if (DateTime.isDateTime(v)) return pOk(v, p);
  if (typeof v === 'string') { const d = DateTime.fromISO(v); if (d.isValid) return pOk(d, p); }
  return pFail(p, 'expected Datetime, got ' + (v === null ? 'Null' : typeof v === 'string' ? 'invalid datetime ' + JSON.stringify(v) : typeof v));
}`,
  pFloat: `function pFloat(v, p) {
  if (typeof v === 'number') return pOk(v, p);
  if (typeof v === 'string') { const n = parseFloat(v); if (!isNaN(n)) return pOk(n, p); }
  return pFail(p, 'expected Float, got ' + (v === null ? 'Null' : typeof v === 'string' ? JSON.stringify(v) : typeof v));
}`,
  pDate: `function pDate(v, p) {
  if (DateTime.isDateTime(v)) return pOk(v.startOf('day'), p);
  if (typeof v === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(v)) { const d = DateTime.fromISO(v); if (d.isValid) return pOk(d.startOf('day'), p); }
  return pFail(p, 'expected Date (YYYY-MM-DD), got ' + (v === null ? 'Null' : typeof v === 'string' ? JSON.stringify(v) : typeof v));
}`,
  pDuration: `function pDuration(v, p) {
  if (Duration.isDuration(v)) return pOk(v, p);
  if (typeof v === 'string') { const d = Duration.fromISO(v); if (d.isValid) return pOk(d, p); }
  return pFail(p, 'expected Duration (ISO 8601), got ' + (v === null ? 'Null' : typeof v === 'string' ? JSON.stringify(v) : typeof v));
}`,
  pData: `function pData(v, p) {
  if (typeof v === 'string') { try { return pOk(JSON.parse(v), p); } catch { return pFail(p, 'invalid JSON: ' + JSON.stringify(v)); } }
  return pOk(v, p);
}`,
  pUnwrap: `function pUnwrap(r) {
  if (r.success) return r.value;
  function findError(e) { if (e.message) return e; if (e.cause && e.cause[0]) return findError(e.cause[0]); return e; }
  const err = findError(r);
  throw new Error((err.path || '.') + ': ' + (err.message || 'type error'));
}`,
};

/**
 * Ruby parser helper function snippets.
 * These are embedded in compiled Ruby output when type definitions are used.
 */
export const RUBY_HELPER_DEPS: Record<string, string[]> = {
  p_any: ['p_ok'],
  p_null: ['p_ok', 'p_fail'],
  p_string: ['p_ok', 'p_fail'],
  p_int: ['p_ok', 'p_fail'],
  p_bool: ['p_ok', 'p_fail'],
  p_datetime: ['p_ok', 'p_fail'],
  p_float: ['p_ok', 'p_fail'],
  p_date: ['p_ok', 'p_fail'],
  p_duration: ['p_ok', 'p_fail'],
  p_data: ['p_ok', 'p_fail'],
};

export const RUBY_HELPERS: Record<string, string> = {
  k_deep_merge: `def k_deep_merge(a, b)
  return b unless a.is_a?(Hash) && b.is_a?(Hash)
  result = a.dup
  b.each { |k, v| result[k] = k_deep_merge(a[k], v) }
  result
end`,
  k_patch: `def k_patch(d, p, v)
  return v if p.empty?
  seg = p[0]
  rest = p[1..]
  next_default = rest.empty? ? nil : (rest[0].is_a?(Integer) ? [] : {})
  if seg.is_a?(Integer)
    raise 'cannot patch array index on non-array' if !d.nil? && !d.is_a?(Array)
    arr = d.is_a?(Array) ? d.dup : []
    arr[seg] = nil while arr.length <= seg
    existing = arr[seg]
    arr[seg] = k_patch(existing.nil? ? next_default : existing, rest, v)
    arr
  else
    raise 'cannot patch object key on array' if d.is_a?(Array)
    obj = d.is_a?(Hash) ? d.dup : {}
    existing = obj[seg]
    obj[seg] = k_patch(existing.nil? ? next_default : existing, rest, v)
    obj
  end
end`,
  k_intersection: `def k_intersection(a, b)
  s = [a.first, b.first].max
  e = [a.last, b.last].min
  s >= e ? (s..s) : (s..e)
end`,
  p_ok: `def p_ok(v, p) { success: true, path: p, message: '', value: v, cause: [] } end`,
  p_fail: `def p_fail(p, m = nil, c = nil) { success: false, path: p, message: m || '', value: nil, cause: c || [] } end`,
  p_any: `def p_any(v, p) p_ok(v, p) end`,
  p_null: `def p_null(v, p)
  return p_ok(nil, p) if v.nil?
  p_fail(p, "expected Null, got #{v.class}")
end`,
  p_string: `def p_string(v, p)
  return p_ok(v, p) if v.is_a?(String)
  p_fail(p, "expected String, got #{v.nil? ? 'Null' : v.class}")
end`,
  p_int: `def p_int(v, p)
  return p_ok(v, p) if v.is_a?(Integer)
  return p_ok(Integer(v, 10), p) if v.is_a?(String) rescue nil
  p_fail(p, "expected Int, got #{v.nil? ? 'Null' : v.is_a?(String) ? v.inspect : v.class}")
end`,
  p_bool: `def p_bool(v, p)
  return p_ok(v, p) if v == true || v == false
  return p_ok(true, p) if v == 'true'
  return p_ok(false, p) if v == 'false'
  p_fail(p, "expected Bool, got #{v.nil? ? 'Null' : v.is_a?(String) ? v.inspect : v.class}")
end`,
  p_datetime: `def p_datetime(v, p)
  return p_ok(v, p) if v.is_a?(DateTime) || v.is_a?(Time)
  return p_ok(DateTime.parse(v), p) if v.is_a?(String) rescue nil
  p_fail(p, "expected Datetime, got #{v.nil? ? 'Null' : v.is_a?(String) ? 'invalid datetime ' + v.inspect : v.class}")
end`,
  p_float: `def p_float(v, p)
  return p_ok(v, p) if v.is_a?(Numeric)
  return p_ok(Float(v), p) if v.is_a?(String) rescue nil
  p_fail(p, "expected Float, got #{v.nil? ? 'Null' : v.is_a?(String) ? v.inspect : v.class}")
end`,
  p_date: `def p_date(v, p)
  return p_ok(v.to_date, p) if v.is_a?(DateTime) || v.is_a?(Time)
  return p_ok(v, p) if v.is_a?(Date)
  return p_ok(Date.parse(v), p) if v.is_a?(String) && v.match?(/^\\d{4}-\\d{2}-\\d{2}$/) rescue nil
  p_fail(p, "expected Date (YYYY-MM-DD), got #{v.nil? ? 'Null' : v.is_a?(String) ? v.inspect : v.class}")
end`,
  p_duration: `def p_duration(v, p)
  return p_ok(v, p) if v.is_a?(ActiveSupport::Duration)
  return p_ok(ActiveSupport::Duration.parse(v), p) if v.is_a?(String) rescue nil
  p_fail(p, "expected Duration (ISO 8601), got #{v.nil? ? 'Null' : v.is_a?(String) ? v.inspect : v.class}")
end`,
  p_data: `def p_data(v, p)
  return p_ok(JSON.parse(v), p) if v.is_a?(String) rescue p_fail(p, "invalid JSON: #{v.inspect}")
  p_ok(v, p)
end`,
  p_unwrap: `def p_unwrap(r)
  return r[:value] if r[:success]
  find_error = ->(e) {
    return e if e[:message] && !e[:message].empty?
    return find_error.call(e[:cause][0]) if e[:cause] && e[:cause][0]
    e
  }
  err = find_error.call(r)
  raise "#{err[:path] || '.'}: #{err[:message] || 'type error'}"
end`,
  k_string: `def k_string(v)
  return 'null' if v.nil?
  return v ? 'true' : 'false' if v == true || v == false
  return v.to_s if v.is_a?(Numeric)
  return "'" + v.gsub("\\\\", "\\\\\\\\").gsub("'", "\\\\'") + "'" if v.is_a?(String)
  return v.iso8601 if v.is_a?(ActiveSupport::Duration)
  return v.strftime(v.to_time == v.to_date.to_time ? 'D%Y-%m-%d' : 'D%Y-%m-%dT%H:%M:%S') if v.is_a?(Date) || v.is_a?(DateTime) || v.is_a?(Time)
  return '[' + v.map { |e| k_string(e) }.join(', ') + ']' if v.is_a?(Array)
  return '{' + v.map { |k, val| k.to_s + ': ' + k_string(val) }.join(', ') + '}' if v.is_a?(Hash)
  v.to_s
end`,
};

/**
 * Python helper function snippets.
 * These are embedded in compiled Python output when needed.
 * Special entries starting with _ are import statements, not functions.
 */
export const PY_HELPER_DEPS: Record<string, string[]> = {
  kEq: [],
  kNeq: ['kEq'],
  kIntersection: ['_EloInterval'],
  kFetch: [],
  kFetchObject: ['kFetch'],
  kFetchArray: ['kFetch'],
  kDeepMerge: [],
  kPatch: [],
  kTypeOf: [],
  kAssert: [],
  kFail: [],
  kAssertFails: [],
  kAdd: [],
  kSub: [],
  kMul: [],
  kDiv: [],
  kMod: [],
  kPow: [],
  kNeg: [],
  kBool: [],
  kString: ['_elo_dur_to_iso'],
  kParseDate: ['_elo_dt_helpers'],
  kParseDatetime: ['_elo_dt_helpers'],
  _elo_dt_helpers: ['_import_datetime', '_elo_duration'],
  _EloInterval: ['_import_collections'],
  _elo_duration: ['_import_re'],
  // Parser helpers
  pAny: ['pOk'],
  pNull: ['pOk', 'pFail'],
  pString: ['pOk', 'pFail'],
  pInt: ['pOk', 'pFail'],
  pFloat: ['pOk', 'pFail'],
  pBool: ['pOk', 'pFail'],
  pDatetime: ['pOk', 'pFail', 'kParseDatetime'],
  pSchema: ['pOk', 'pFail'],
  pArray: ['pOk', 'pFail'],
  pUnion: ['pFail'],
  pSubtype: ['pOk', 'pFail'],
};

export const PY_HELPERS: Record<string, string> = {
  _import_math: `import math`,
  _import_functools: `import functools`,
  _import_datetime: `import datetime as _dt`,
  _import_re: `import re`,
  _import_collections: `from collections import namedtuple`,
  _EloInterval: `EloInterval = namedtuple('EloInterval', ['start', 'end'])`,
  _elo_duration: `class EloDuration:
    __slots__ = ('_ms',)
    def __init__(self, ms):
        self._ms = ms
    @staticmethod
    def from_iso(s):
        m = re.match(r'^P(?:(\\d+)Y)?(?:(\\d+)M)?(?:(\\d+)W)?(?:(\\d+)D)?(?:T(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+(?:\\.\\d+)?)S)?)?$', s)
        if not m: raise Exception('Invalid ISO duration: ' + s)
        yrs = int(m.group(1) or 0)
        mos = int(m.group(2) or 0)
        wks = int(m.group(3) or 0)
        dys = int(m.group(4) or 0)
        hrs = int(m.group(5) or 0)
        mns = int(m.group(6) or 0)
        scs = float(m.group(7) or 0)
        total_days = yrs * 365 + mos * 30 + wks * 7 + dys
        return EloDuration(((total_days * 24 + hrs) * 60 + mns) * 60000 + scs * 1000)
    @staticmethod
    def from_timedelta(td):
        return EloDuration(td.total_seconds() * 1000)
    def to_ms(self): return self._ms
    def plus(self, other):
        if isinstance(other, EloDuration): return EloDuration(self._ms + other._ms)
        if isinstance(other, _dt.datetime): return _elo_dt_plus(other, self)
        raise Exception('Cannot add duration to ' + type(other).__name__)
    def minus(self, other):
        if isinstance(other, EloDuration): return EloDuration(self._ms - other._ms)
        raise Exception('Cannot subtract ' + type(other).__name__ + ' from duration')
    def scale(self, n): return EloDuration(self._ms * n)
    def divide(self, n): return EloDuration(self._ms / n)
    def negate(self): return EloDuration(-self._ms)
    def __eq__(self, other): return isinstance(other, EloDuration) and self._ms == other._ms
    def __ne__(self, other): return not self.__eq__(other)
    def __lt__(self, other): return self._ms < other._ms
    def __le__(self, other): return self._ms <= other._ms
    def __gt__(self, other): return self._ms > other._ms
    def __ge__(self, other): return self._ms >= other._ms
    def __repr__(self): return f'EloDuration({self._ms}ms)'
    def in_seconds(self): return self._ms / 1000.0
    def in_minutes(self): return self._ms / 60000.0
    def in_hours(self): return self._ms / 3600000.0
    def in_days(self): return self._ms / 86400000.0
    def in_weeks(self): return self._ms / 604800000.0
    def in_months(self): return self._ms / (30.4375 * 86400000.0)
    def in_quarters(self): return self._ms / (91.3125 * 86400000.0)
    def in_years(self): return self._ms / (365.25 * 86400000.0)`,
  _elo_dt_helpers: `def _elo_dt_plus(dt, dur):
    from datetime import timedelta
    return dt + timedelta(milliseconds=dur.to_ms())
def _elo_dt_minus_dur(dt, dur):
    from datetime import timedelta
    return dt - timedelta(milliseconds=dur.to_ms())
def _elo_dt_diff(a, b):
    diff = a - b
    return EloDuration(diff.total_seconds() * 1000)
def _elo_dt(y, mo, d, h=0, mi=0, s=0):
    return _dt.datetime(y, mo, d, h, mi, s)
def _elo_start_of_day(dt):
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)
def _elo_end_of_day(dt):
    return dt.replace(hour=23, minute=59, second=59, microsecond=999000)
def _elo_start_of_week(dt):
    d = dt - _dt.timedelta(days=dt.weekday())
    return d.replace(hour=0, minute=0, second=0, microsecond=0)
def _elo_end_of_week(dt):
    d = dt + _dt.timedelta(days=6 - dt.weekday())
    return d.replace(hour=23, minute=59, second=59, microsecond=999000)
def _elo_start_of_month(dt):
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
def _elo_end_of_month(dt):
    import calendar
    last_day = calendar.monthrange(dt.year, dt.month)[1]
    return dt.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999000)
def _elo_start_of_quarter(dt):
    qm = ((dt.month - 1) // 3) * 3 + 1
    return dt.replace(month=qm, day=1, hour=0, minute=0, second=0, microsecond=0)
def _elo_end_of_quarter(dt):
    import calendar
    qm = ((dt.month - 1) // 3) * 3 + 3
    last_day = calendar.monthrange(dt.year, qm)[1]
    return dt.replace(month=qm, day=last_day, hour=23, minute=59, second=59, microsecond=999000)
def _elo_start_of_year(dt):
    return dt.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
def _elo_end_of_year(dt):
    return dt.replace(month=12, day=31, hour=23, minute=59, second=59, microsecond=999000)`,
  kAssert: `def kAssert(cond, msg="Assertion failed"):
    if not cond: raise Exception(msg)
    return True`,
  kFail: `def kFail(msg):
    raise Exception(msg)`,
  kAssertFails: `def kAssertFails(fn):
    try:
        fn()
        raise Exception("Expected function to fail but it did not")
    except Exception as e:
        if str(e) == "Expected function to fail but it did not": raise
        return True`,
  kEq: `def kEq(l, r):
    if isinstance(l, EloDuration) and isinstance(r, EloDuration): return l == r
    if isinstance(l, _dt.datetime) and isinstance(r, _dt.datetime): return l == r
    if isinstance(l, list) and isinstance(r, list):
        if len(l) != len(r): return False
        return all(kEq(a, b) for a, b in zip(l, r))
    if isinstance(l, dict) and isinstance(r, dict):
        if set(l.keys()) != set(r.keys()): return False
        return all(kEq(l[k], r[k]) for k in l)
    return l == r`,
  kNeq: `def kNeq(l, r):
    return not kEq(l, r)`,
  kIntersection: `def kIntersection(a, b):
    s = max(a.start, b.start)
    e = min(a.end, b.end)
    return EloInterval(s, s) if s >= e else EloInterval(s, e)`,
  kTypeOf: `def kTypeOf(v):
    if v is None: return 'Null'
    if isinstance(v, EloDuration): return 'Duration'
    if isinstance(v, _dt.datetime): return 'DateTime'
    if isinstance(v, bool): return 'Bool'
    if isinstance(v, int): return 'Int'
    if isinstance(v, float): return 'Float'
    if isinstance(v, str): return 'String'
    if isinstance(v, list): return 'List'
    if isinstance(v, dict): return 'Tuple'
    if callable(v): return 'Function'
    return 'Unknown'`,
  kFetch: `def kFetch(data, path):
    current = data
    for segment in path:
        if current is None: return None
        if isinstance(segment, int):
            if not isinstance(current, list): return None
            if segment >= len(current): return None
            current = current[segment]
        else:
            if not isinstance(current, dict): return None
            current = current.get(segment)
    return current`,
  kFetchObject: `def kFetchObject(data, paths):
    return {key: kFetch(data, paths[key]) for key in paths}`,
  kFetchArray: `def kFetchArray(data, paths):
    return [kFetch(data, p) for p in paths]`,
  kPatch: `def kPatch(data, path, value):
    if len(path) == 0: return value
    seg = path[0]
    rest = path[1:]
    next_default = None if len(rest) == 0 else ([] if isinstance(rest[0], int) else {})
    if isinstance(seg, int):
        if data is not None and not isinstance(data, list): raise Exception('cannot patch array index on non-array')
        arr = list(data) if isinstance(data, list) else []
        while len(arr) <= seg: arr.append(None)
        existing = arr[seg]
        arr[seg] = kPatch(next_default if existing is None else existing, rest, value)
        return arr
    else:
        if isinstance(data, list): raise Exception('cannot patch object key on array')
        obj = dict(data) if isinstance(data, dict) else {}
        existing = obj.get(seg)
        obj[seg] = kPatch(next_default if existing is None else existing, rest, value)
        return obj`,
  kDeepMerge: `def kDeepMerge(a, b):
    if not isinstance(a, dict) or not isinstance(b, dict): return b
    result = dict(a)
    for key in b:
        result[key] = kDeepMerge(a.get(key), b[key])
    return result`,
  kFirst: `def kFirst(arr):
    return arr[0] if len(arr) > 0 else None`,
  kLast: `def kLast(arr):
    return arr[-1] if len(arr) > 0 else None`,
  kAt: `def kAt(arr, idx):
    if idx < 0 or idx >= len(arr): return None
    return arr[idx]`,
  kIndexOf: `def kIndexOf(s, sub):
    idx = s.find(sub)
    return None if idx == -1 else idx`,
  kSplit: `def kSplit(s, sep):
    if s == '': return []
    return s.split(sep)`,
  kData: `def kData(v):
    import json
    if v is None: return None
    if isinstance(v, str):
        try: return json.loads(v)
        except: raise Exception('invalid JSON: ' + repr(v))
    return v`,
  kString: `def kString(v):
    if v is None: return 'null'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, int): return str(v)
    if isinstance(v, float): return str(v)
    if isinstance(v, str): return "'" + v.replace("\\\\", "\\\\\\\\").replace("'", "\\\\'") + "'"
    if isinstance(v, EloDuration): return _elo_dur_to_iso(v)
    if isinstance(v, _dt.datetime):
        if v.hour == 0 and v.minute == 0 and v.second == 0: return 'D' + v.strftime('%Y-%m-%d')
        return 'D' + v.strftime('%Y-%m-%dT%H:%M:%S')
    if isinstance(v, list): return '[' + ', '.join(kString(e) for e in v) + ']'
    if isinstance(v, dict): return '{' + ', '.join(k + ': ' + kString(v[k]) for k in v) + '}'
    return str(v)`,
  _elo_dur_to_iso: `def _elo_dur_to_iso(d):
    ms = d.to_ms()
    if ms == 0: return 'PT0S'
    neg = ms < 0
    ms = abs(ms)
    secs = ms / 1000
    days = int(secs // 86400); secs -= days * 86400
    hours = int(secs // 3600); secs -= hours * 3600
    mins = int(secs // 60); secs -= mins * 60
    s = '-P' if neg else 'P'
    if days: s += str(days) + 'D'
    if hours or mins or secs: s += 'T'
    if hours: s += str(hours) + 'H'
    if mins: s += str(mins) + 'M'
    if secs: s += str(int(secs) if secs == int(secs) else secs) + 'S'
    return s`,
  kAdd: `def kAdd(l, r):
    if isinstance(l, _dt.datetime) and isinstance(r, EloDuration): return _elo_dt_plus(l, r)
    if isinstance(l, EloDuration) and isinstance(r, _dt.datetime): return _elo_dt_plus(r, l)
    if isinstance(l, EloDuration) and isinstance(r, EloDuration): return l.plus(r)
    return l + r`,
  kSub: `def kSub(l, r):
    if isinstance(l, _dt.datetime) and isinstance(r, EloDuration): return _elo_dt_minus_dur(l, r)
    if isinstance(l, _dt.datetime) and isinstance(r, _dt.datetime): return _elo_dt_diff(l, r)
    if isinstance(l, EloDuration) and isinstance(r, EloDuration): return l.minus(r)
    return l - r`,
  kMul: `def kMul(l, r):
    if isinstance(l, EloDuration): return l.scale(r)
    if isinstance(r, EloDuration): return r.scale(l)
    return l * r`,
  kDiv: `def kDiv(l, r):
    if isinstance(l, EloDuration) and isinstance(r, (int, float)): return l.divide(r)
    return l / r`,
  kMod: `def kMod(l, r):
    return l % r`,
  kPow: `def kPow(l, r):
    return l ** r`,
  kNeg: `def kNeg(v):
    if isinstance(v, EloDuration): return v.negate()
    return -v`,
  kBool: `def kBool(v):
    if isinstance(v, bool): return v
    if isinstance(v, str):
        if v == 'true': return True
        if v == 'false': return False
        raise Exception('Cannot convert to Bool: ' + repr(v))
    raise Exception('Cannot convert to Bool: ' + repr(v))`,
  kParseDate: `def kParseDate(v):
    if isinstance(v, _dt.datetime): return _elo_dt(v.year, v.month, v.day)
    if isinstance(v, str):
        parts = v.split('-')
        if len(parts) == 3: return _elo_dt(int(parts[0]), int(parts[1]), int(parts[2]))
    raise Exception('Cannot parse date: ' + repr(v))`,
  kParseDatetime: `def kParseDatetime(v):
    if isinstance(v, _dt.datetime): return v
    if isinstance(v, str):
        v2 = v.replace('Z', '')
        if 'T' in v2:
            dp, tp = v2.split('T')
            dy, dm, dd = dp.split('-')
            tps = tp.split(':')
            return _elo_dt(int(dy), int(dm), int(dd), int(tps[0]), int(tps[1]), int(tps[2]) if len(tps) > 2 else 0)
        parts = v2.split('-')
        if len(parts) == 3: return _elo_dt(int(parts[0]), int(parts[1]), int(parts[2]))
    raise Exception('Cannot parse datetime: ' + repr(v))`,
  // Parser helpers - return Result: { "success": bool, "path": str, "message": str, "value": any, "cause": list }
  pOk: `def pOk(v, p):
    return {"success": True, "path": p, "message": "", "value": v, "cause": []}`,
  pFail: `def pFail(p, m=None, c=None):
    return {"success": False, "path": p, "message": m or "", "value": None, "cause": c or []}`,
  pUnwrap: `def pUnwrap(r):
    if r["success"]: return r["value"]
    def find_error(e):
        if e.get("message"): return e
        if e.get("cause") and len(e["cause"]) > 0: return find_error(e["cause"][0])
        return e
    err = find_error(r)
    raise Exception((err.get("path") or ".") + ": " + (err.get("message") or "type error"))`,
  pAny: `def pAny(v, p):
    return pOk(v, p)`,
  pNull: `def pNull(v, p):
    if v is None: return pOk(None, p)
    return pFail(p, "expected Null, got " + type(v).__name__)`,
  pString: `def pString(v, p):
    if isinstance(v, str): return pOk(v, p)
    return pFail(p, "expected String, got " + ("Null" if v is None else type(v).__name__))`,
  pInt: `def pInt(v, p):
    if isinstance(v, bool): return pFail(p, "expected Int, got Bool")
    if isinstance(v, int): return pOk(v, p)
    if isinstance(v, str):
        try: return pOk(int(v), p)
        except: pass
    return pFail(p, "expected Int, got " + ("Null" if v is None else repr(v) if isinstance(v, str) else type(v).__name__))`,
  pFloat: `def pFloat(v, p):
    if isinstance(v, bool): return pFail(p, "expected Float, got Bool")
    if isinstance(v, (int, float)): return pOk(float(v), p)
    if isinstance(v, str):
        try: return pOk(float(v), p)
        except: pass
    return pFail(p, "expected Float, got " + ("Null" if v is None else repr(v) if isinstance(v, str) else type(v).__name__))`,
  pBool: `def pBool(v, p):
    if isinstance(v, bool): return pOk(v, p)
    if v == "true": return pOk(True, p)
    if v == "false": return pOk(False, p)
    return pFail(p, "expected Bool, got " + ("Null" if v is None else repr(v) if isinstance(v, str) else type(v).__name__))`,
  pDatetime: `def pDatetime(v, p):
    if isinstance(v, _dt.datetime): return pOk(v, p)
    if isinstance(v, str):
        try: return pOk(kParseDatetime(v), p)
        except: pass
    return pFail(p, "expected Datetime, got " + ("Null" if v is None else "invalid datetime " + repr(v) if isinstance(v, str) else type(v).__name__))`,
  pSchema: `def pSchema(props, extras_mode, extras_parser=None):
    known_keys = [p[0] for p in props]
    def parser(v, p):
        if not isinstance(v, dict): return pFail(p, "expected object, got " + ("Null" if v is None else type(v).__name__))
        o = {}
        for key, prop_parser, optional in props:
            val = v.get(key)
            if optional and val is None:
                continue
            r = prop_parser(val, p + "." + key)
            if not r["success"]: return pFail(p, None, [r])
            o[key] = r["value"]
        if extras_mode == "closed":
            for k in v:
                if k not in known_keys: return pFail(p + "." + k, "unexpected attribute")
        elif extras_mode == "typed" and extras_parser is not None:
            for k in v:
                if k not in known_keys:
                    re = extras_parser(v[k], p + "." + k)
                    if not re["success"]: return pFail(p, None, [re])
                    o[k] = re["value"]
        return pOk(o, p)
    return parser`,
  pArray: `def pArray(elem_parser):
    def parser(v, p):
        if not isinstance(v, list): return pFail(p, "expected array, got " + ("Null" if v is None else type(v).__name__))
        a = []
        for i, e in enumerate(v):
            r = elem_parser(e, p + "." + str(i))
            if not r["success"]: return pFail(p, None, [r])
            a.append(r["value"])
        return pOk(a, p)
    return parser`,
  pUnion: `def pUnion(parsers):
    def parser(v, p):
        causes = []
        for up in parsers:
            r = up(v, p)
            if r["success"]: return r
            causes.append(r)
        return pFail(p, "no union alternative matched", causes)
    return parser`,
  pSubtype: `def pSubtype(base_parser, checks):
    def parser(v, p):
        r = base_parser(v, p)
        if not r["success"]: return r
        val = r["value"]
        for label, check in checks:
            if not check(val): return pFail(p, label)
        return r
    return parser`,
};
