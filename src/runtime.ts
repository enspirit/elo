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
