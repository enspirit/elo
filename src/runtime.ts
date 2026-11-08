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
 * Maximum length, in characters, of a string the compiled code is allowed to
 * build with a single repeat (`'a' * n`) or pad operation. Repeating or padding
 * without a bound lets a short expression allocate gigabytes and OOM the host,
 * so the compiled runtime refuses to cross this ceiling.
 *
 * The default is safe; it is read once, at compile time, from the
 * `ELO_MAX_STRING_LENGTH` environment variable (when running under Node) so a
 * deployment can raise or lower it. Raising it re-opens the denial-of-service
 * window — see the security page.
 */
export const DEFAULT_MAX_STRING_LENGTH = 10_000_000;
export const MAX_STRING_LENGTH: number = (() => {
  // Guard `process`: this module is bundled into the browser (the playground
  // compiles Elo in-page), where `process` is undefined. A bare reference would
  // throw ReferenceError at import time.
  const raw = (typeof process !== 'undefined' && process.env)
    ? process.env.ELO_MAX_STRING_LENGTH
    : undefined;
  const v = Number(raw);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : DEFAULT_MAX_STRING_LENGTH;
})();

/**
 * The error compiled JavaScript raises when a value is refused.
 *
 * `message` is for a human, and nothing promises its wording: a diagnostic
 * worth rewording would otherwise be a breaking change for every host that
 * read a category out of it. The other fields are the host's, and say what the
 * message says in prose.
 */
export interface EloFailure extends Error {
  /** Which construct refused the value. */
  kind:
    /** A value arrived and did not fit the type. */
    | 'schema'
    /** No value arrived at all — an attribute that is not there. */
    | 'missing'
    /** A subtype constraint did not hold. */
    | 'constraint'
    /** A `guard` did not hold. */
    | 'guard'
    /** A `check` did not hold. */
    | 'check';
  /** Where in the input, as a dotted path. Set for `schema` and `missing`. */
  path?: string;
  /** The name the constraint, guard or check was written under, if it had one. */
  label?: string;
}

/**
 * Dependencies between helpers. If helper A uses helper B, A depends on B.
 */
export const JS_HELPER_DEPS: Record<string, string[]> = {
  kRepeat: [],
  kMul: ['kRepeat'],
  kPad: [],
  kMin2: [],
  kMax2: [],
  kAt: [],
  kRound: [],
  kRoundTo: ['kRound'],
  kInt: ['pInt', 'pUnwrap', 'pOk', 'pFail'],
  kNeq: ['kEq'],
  kToString: ['kString'],
  kMember: [],
  kFetch: ['kMember'],
  kFetchObject: ['kFetch', 'kMember'],
  kFetchAny: ['kFetch', 'kFetchObject', 'kMember'],
  kPatch: ['kMember'],
  kDeepMerge: ['kMember'],
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
  // pSet and kMember: a schema key named `__proto__` is data on both sides.
  pSchema: ['pOk', 'pFail', 'pSet', 'kMember'],
  pSet: [],
  pArray: ['pOk', 'pFail'],
  pUnion: ['pFail'],
  pSubtype: ['pFail'],
};

export const JS_HELPERS: Record<string, string> = {
  kRepeat: `function kRepeat(s, n) {
  if (n <= 0) return "";
  if (s.length * n > ${MAX_STRING_LENGTH}) throw new Error("String length limit (${MAX_STRING_LENGTH}) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings");
  return s.repeat(n);
}`,
  kPad: `function kPad(s, n, p, atStart) {
  if (n > ${MAX_STRING_LENGTH}) throw new Error("String length limit (${MAX_STRING_LENGTH}) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings");
  return atStart ? s.padStart(n, p) : s.padEnd(n, p);
}`,
  kAdd: `function kAdd(l, r) {
  if (DateTime.isDateTime(l) && Duration.isDuration(r)) return l.plus(r);
  if (Duration.isDuration(l) && DateTime.isDateTime(r)) return r.plus(l);
  if (Duration.isDuration(l) && Duration.isDuration(r)) return l.plus(r);
  /* Elo's + on two lists concatenates, as add:array,array does. JavaScript's
     native + stringifies them instead, so [1, 2] + [3, 4] came out "1,23,4" —
     a wrong value, silently, where the typed path and the other three targets
     answer a list. The dispatcher has to carry every overload the typed path
     has, not the subset someone remembered. */
  if (Array.isArray(l) && Array.isArray(r)) return l.concat(r);
  return l + r;
}`,
  kSub: `function kSub(l, r) {
  if (DateTime.isDateTime(l) && Duration.isDuration(r)) return l.minus(r);
  if (DateTime.isDateTime(l) && DateTime.isDateTime(r)) return Duration.fromMillis(l.toMillis() - r.toMillis());
  if (Duration.isDuration(l) && Duration.isDuration(r)) return l.minus(r);
  return l - r;
}`,
  kMul: `function kMul(l, r) {
  if (Array.isArray(l) || Array.isArray(r)) throw new Error("Array multiplication is not supported");
  if (typeof l === 'string' && typeof r === 'number' && Number.isInteger(r)) return kRepeat(l, r);
  if (typeof r === 'string' && typeof l === 'number' && Number.isInteger(l)) return kRepeat(r, l);
  if (Duration.isDuration(l)) return Number.isInteger(r) ? l.mapUnits(u => u * r) : Duration.fromMillis(l.toMillis() * r);
  if (Duration.isDuration(r)) return Number.isInteger(l) ? r.mapUnits(u => u * l) : Duration.fromMillis(r.toMillis() * l);
  return l * r;
}`,
  kDiv: `function kDiv(l, r) {
  if (Duration.isDuration(l) && typeof r === 'number') return Duration.fromMillis(l.toMillis() / r);
  return l / r;
}`,
  kMin2: `function kMin2(a, b) { return a < b ? a : b; }`,
  kMax2: `function kMax2(a, b) { return a > b ? a : b; }`,
  /* at() is array indexing by an integer. The typed at(List, Int) binding
     indexes an array directly; this is the fallback for operands whose types
     are not statically known (a lambda parameter is `any`). A bare a[k] there
     would let a string key such as 'constructor' walk the prototype chain to
     the Function constructor — a sandbox escape. Indexing only a real array,
     by an integer, in range, and null otherwise is exactly what at() means. */
  kAt: `function kAt(a, i) {
  if (!Array.isArray(a)) return null;
  if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= a.length) return null;
  return a[i] ?? null;
}`,
  kRound: `function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); }`,
  kRoundTo: `function kRoundTo(x, n) { const f = Math.pow(10, n); return kRound(x * f) / f; }`,
  /* Reversing a string and reversing a list are different operations in
     JavaScript, so an unknown type has to be looked at. Ruby's `.reverse` and
     Python's `[::-1]` cover both and need no helper. */
  kReverse: `function kReverse(x) { return Array.isArray(x) ? [...x].reverse() : x.split('').reverse().join(''); }`,
  /* Elo's `%` is floored: the result takes the sign of the divisor, as it does
     in Ruby and Python. JavaScript's `%` is truncated like C's, so `-7 % 3` is
     -1 there where Elo says 2. */
  // Elo's `%` is floored and numeric. A String operand would otherwise reach a
  // native overload — in Ruby and Python `str % x` is sprintf — so the dynamic
  // path, where operands are not statically typed, must reject a non-number
  // rather than diverge (JS returned NaN) or format.
  kMod: `function kMod(l, r) { if (typeof l !== 'number' || typeof r !== 'number') throw new Error("Modulo requires numeric operands"); return ((l % r) + r) % r; }`,
  // An integer power builds an exact bignum on Ruby and Python, so a one-token
  // literal (2 ^ 1e9) allocates gigabytes there; JavaScript's float Math.pow
  // does not, but must refuse the same expression so the targets agree. The
  // result's bit length is about r*log2(|l|); cap it by the same knob as the
  // string and array bounds.
  kPow: `function kPow(l, r) { if (Number.isInteger(l) && Number.isInteger(r) && r > 1 && Math.abs(l) > 1 && r * Math.log2(Math.abs(l)) > ${MAX_STRING_LENGTH}) throw new Error("Exponentiation result exceeds the size limit (${MAX_STRING_LENGTH} bits); raise ELO_MAX_STRING_LENGTH to allow larger results"); return Math.pow(l, r); }`,
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
  /* A member read must reach data, never the host prototype. A JavaScript
     property read walks the chain, so an absent key hands back Object.prototype
     or a builtin method (toString, map, call...) as a live function. Reading
     only an *own* property, and null otherwise, closes that for every name at
     once — a denylist cannot enumerate them — while leaving real data intact,
     since a key the author wrote is an own property that shadows any namesake
     on the prototype. This is the one guard; the name denylists in kFetch and
     kPatch are the older, narrower layer kept behind it. */
  kMember: `function kMember(o, k) {
  if (o === null || typeof o !== 'object') return null;
  return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null;
}`,
  kFetch: `function kFetch(data, path) {
  var FORBIDDEN = ['constructor', '__proto__', 'prototype', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__'];
  /* A path that is not a list of segments has nothing to walk. Without this
     the for-of raised "path is not iterable" — an uncaught host exception from
     ordinary Elo source, which the security page promises cannot happen:
     fetch({a: 1}, {k: 42}) reached here through kFetchObject with 42. */
  if (!Array.isArray(path)) return null;
  let current = data;
  for (const segment of path) {
    if (current === null || current === undefined) return null;
    if (typeof segment === 'number') {
      if (!Array.isArray(current)) return null;
      current = current[segment];
    } else {
      if (typeof current !== 'object' || current === null) return null;
      /* The segment coerces to a string on the read, so a non-string key (an array, or an object with a toString) must be coerced before the denylist too, or it slips past a === check and lands on the coerced name. kMember then reads an own property only, so a name the denylist does not list still cannot reach the prototype. */
      const key = String(segment);
      if (FORBIDDEN.indexOf(key) !== -1) return null;
      current = kMember(current, key);
    }
  }
  return current === undefined ? null : current;
}`,
  kFetchObject: `function kFetchObject(data, paths) {
  const result = {};
  for (const key of Object.keys(paths)) {
    /* Assigning result['__proto__'] directly runs the prototype setter, so a path object with a '__proto__' key would repoint the result's prototype instead of storing a value. defineProperty makes it an own data property either way. */
    const value = kFetch(data, paths[key]);
    if (key === '__proto__') { Object.defineProperty(result, key, { value: value, writable: true, enumerable: true, configurable: true }); }
    else { result[key] = value; }
  }
  return result;
}`,
  /* `fetch(d, p)` has four forms and the *type* of `p` tells them apart. Where
     the type is unknown — a lambda parameter, a member read — the shape of the
     value has to, the way kMul asks whether its operand is a String. Before
     this the arity fallback chose the path form for every one of them, so the
     mapping form walked an object as if it were a list of segments. */
  kFetchAny: `function kFetchAny(data, path) {
  if (typeof path === 'string') return kFetch(data, [path]);
  if (Array.isArray(path)) return kFetch(data, path);
  if (path !== null && typeof path === 'object') return kFetchObject(data, path);
  return null;
}`,
  kPatch: `function kPatch(data, path, value) {
  var FORBIDDEN = ['constructor', '__proto__', 'prototype', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__'];
  if (path.length === 0) return value;
  const seg = path[0];
  const rest = path.slice(1);
  /* A meta-property name is never a valid data key; writing (or reading) one would reach the host prototype chain, so reject it however the segment was supplied. A write coerces the key to a string, so a non-string segment must be coerced before the denylist too — otherwise an array or toString-bearing key slips past and lands on the coerced name. */
  const key = typeof seg === 'number' ? seg : String(seg);
  if (typeof key === 'string' && FORBIDDEN.indexOf(key) !== -1) throw new Error("patch() segment '" + key + "' is forbidden: this name would expose the host runtime and is not a valid Elo property.");
  const nextDefault = rest.length === 0 ? null : typeof rest[0] === 'number' ? [] : {};
  if (typeof key === 'number') {
    if (data !== null && data !== undefined && !Array.isArray(data)) throw new Error('cannot patch array index on non-array');
    /* A short expression (patch([], .N, 1)) must not force an N-element array:
       bound the fill by the same limit as string repeat/pad. */
    if (key >= ${MAX_STRING_LENGTH}) throw new Error("Array length limit (${MAX_STRING_LENGTH}) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger arrays");
    const arr = Array.isArray(data) ? [...data] : [];
    while (arr.length <= key) arr.push(null);
    const existing = arr[key];
    arr[key] = kPatch(existing === null || existing === undefined ? nextDefault : existing, rest, value);
    return arr;
  } else {
    if (Array.isArray(data)) throw new Error('cannot patch object key on array');
    const obj = data !== null && data !== undefined && typeof data === 'object' ? {...data} : {};
    const existing = kMember(obj, key);
    const patched = kPatch(existing === null || existing === undefined ? nextDefault : existing, rest, value);
    /* Assigning obj['__proto__'] runs the prototype setter; defineProperty keeps it a data property. */
    if (key === '__proto__') { Object.defineProperty(obj, key, { value: patched, writable: true, enumerable: true, configurable: true }); }
    else { obj[key] = patched; }
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
    const merged = kDeepMerge(kMember(a, key), kMember(b, key));
    /* Assigning result['__proto__'] runs the prototype setter; defineProperty keeps __proto__ a data key, as kFetchObject and kPatch do. Reads go through kMember so a __proto__ key reads its own data, not the prototype chain. */
    if (key === '__proto__') { Object.defineProperty(result, key, { value: merged, writable: true, enumerable: true, configurable: true }); }
    else { result[key] = merged; }
  }
  return result;
}`,
  // Type selectors. The Int() selector on a value the compiler could not type:
  // a number truncates, as the typed Int(Float) emission does; anything else
  // goes through the schema parser, which is strict about what a String holds.
  kInt: `function kInt(v) { return typeof v === 'number' ? Math.trunc(v) : pUnwrap(pInt(v, '')); }`,
  kBool: `function kBool(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') { if (v === 'true') return true; if (v === 'false') return false; }
  return null;
}`,
  // A Date or Datetime this target produces is always in UTC, literal or
  // coerced: Elo's temporal values are zone-free, and Luxon is the only one of
  // the four runtimes that would otherwise read the host's zone into them.
  // See `dateLiteral` in `src/compilers/javascript.ts`.
  kDate: `function kDate(v) {
  if (v === null || v === undefined) return null;
  if (DateTime.isDateTime(v)) return v.setZone("utc").startOf('day');
  if (typeof v === 'string') { const d = DateTime.fromISO(v, { zone: "utc" }); return d.isValid && /^\\d{4}-\\d{2}-\\d{2}$/.test(v) ? d.startOf('day') : null; }
  return null;
}`,
  kDatetime: `function kDatetime(v) {
  if (v === null || v === undefined) return null;
  if (DateTime.isDateTime(v)) return v.setZone("utc");
  if (typeof v === 'string') { const d = DateTime.fromISO(v, { zone: "utc" }); return d.isValid ? d : null; }
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
  /* `String(x)` is a *conversion*; kString is a *rendering*. They differ on
     exactly one input — a string, which kString quotes so that `[1, 'a']`
     reads back as Elo — and `String:any` used to be kString, so a string that
     reached it through a lambda parameter came back as "'hello'". The typed
     `String:string` is the identity; this is what makes the dynamic path agree
     with it. The two helpers are both needed: a string *nested* in a list is
     still rendered. */
  kToString: `function kToString(v) {
  return typeof v === 'string' ? v : kString(v);
}`,
  kIntersection: `function kIntersection(a, b) {
  const s = DateTime.max(a.start, b.start);
  const e = DateTime.min(a.end, b.end);
  return s >= e ? Interval.fromDateTimes(s, s) : Interval.fromDateTimes(s, e);
}`,

  // Parser helpers - return Result: { success, path, message, value, cause, kind, label }
  //
  // `kind` and `label` are what a host branches on, and say what the message
  // says in prose: a value refused ('schema'), a value that never arrived
  // ('missing'), or a named constraint that did not hold ('constraint', with
  // its label). They are set by the site that fails, so rewording a message
  // leaves them alone.
  pOk: `function pOk(v, p) { return { success: true, path: p, message: '', value: v, cause: [] }; }`,
  /* Store a key as data, whatever it is called. `o['__proto__'] = v` runs the
     [[Prototype]] setter rather than storing anything: a primitive is dropped
     and an object becomes the result's prototype. Every helper that builds an
     object from keys it did not choose needs this. */
  pSet: `function pSet(o, k, v) {
  if (k === '__proto__') { Object.defineProperty(o, k, { value: v, writable: true, enumerable: true, configurable: true }); return; }
  o[k] = v;
}`,
  pFail: `function pFail(p, m, c, k, l) { return { success: false, path: p, message: m || '', value: null, cause: c || [], kind: k || 'schema', label: l }; }`,
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
  if (typeof v === 'string' && /^[+-]?\\d+$/.test(v.trim())) return pOk(parseInt(v.trim(), 10), p);
  return pFail(p, 'expected Int, got ' + (v === null ? 'Null' : typeof v === 'string' ? JSON.stringify(v) : typeof v));
}`,
  pBool: `function pBool(v, p) {
  if (typeof v === 'boolean') return pOk(v, p);
  if (v === 'true') return pOk(true, p);
  if (v === 'false') return pOk(false, p);
  return pFail(p, 'expected Bool, got ' + (v === null ? 'Null' : typeof v === 'string' ? JSON.stringify(v) : typeof v));
}`,
  pDatetime: `function pDatetime(v, p) {
  if (DateTime.isDateTime(v)) return pOk(v.setZone("utc"), p);
  if (typeof v === 'string') { const d = DateTime.fromISO(v, { zone: "utc" }); if (d.isValid) return pOk(d, p); }
  return pFail(p, 'expected Datetime, got ' + (v === null ? 'Null' : typeof v === 'string' ? 'invalid datetime ' + JSON.stringify(v) : typeof v));
}`,
  pFloat: `function pFloat(v, p) {
  if (typeof v === 'number') return pOk(v, p);
  if (typeof v === 'string' && /^[+-]?(\\d+\\.?\\d*|\\.\\d+)([eE][+-]?\\d+)?$/.test(v.trim())) return pOk(parseFloat(v.trim()), p);
  return pFail(p, 'expected Float, got ' + (v === null ? 'Null' : typeof v === 'string' ? JSON.stringify(v) : typeof v));
}`,
  pDate: `function pDate(v, p) {
  if (DateTime.isDateTime(v)) return pOk(v.setZone("utc").startOf('day'), p);
  if (typeof v === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(v)) { const d = DateTime.fromISO(v, { zone: "utc" }); if (d.isValid) return pOk(d.startOf('day'), p); }
  return pFail(p, 'expected Date (YYYY-MM-DD), got ' + (v === null ? 'Null' : typeof v === 'string' ? JSON.stringify(v) : typeof v));
}`,
  pDuration: `function pDuration(v, p) {
  if (Duration.isDuration(v)) return pOk(v, p);
  /* Duration(interval) is the interval's length on the typed path, so the
     unknown-type path has to answer the same rather than refuse. */
  if (Interval.isInterval(v)) return pOk(v.end.diff(v.start), p);
  if (typeof v === 'string') { const d = Duration.fromISO(v); if (d.isValid) return pOk(d, p); }
  return pFail(p, 'expected Duration (ISO 8601), got ' + (v === null ? 'Null' : typeof v === 'string' ? JSON.stringify(v) : typeof v));
}`,
  pData: `function pData(v, p) {
  if (typeof v === 'string') { try { return pOk(JSON.parse(v), p); } catch { return pFail(p, 'invalid JSON: ' + JSON.stringify(v)); } }
  return pOk(v, p);
}`,
  /* `__proto__` is a legal Elo identifier, so it is a legal schema key and a
     legal data key. In JavaScript it is neither by default: reading v['__proto__']
     yields the input's prototype rather than its own property, and writing
     o['__proto__'] runs the [[Prototype]] setter — which silently drops a
     primitive and, for an object, repoints the result's prototype at the
     attacker's data. kMember and pSet keep it a data key on both sides, as
     kFetchObject, kPatch and kDeepMerge already do. */
  pSchema: `function pSchema(props, extrasMode, extrasParser) {
  const known = props.map(pr => pr[0]);
  return (v, p) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return pFail(p, 'expected object, got ' + (v === null ? 'Null' : typeof v));
    const o = {};
    for (const [key, parser, optional] of props) {
      if (optional && kMember(v, key) == null) continue;
      const r = parser(kMember(v, key), p + '.' + key);
      if (!r.success) return pFail(p, null, [Object.prototype.hasOwnProperty.call(v, key) ? r : { ...r, kind: 'missing' }]);
      pSet(o, key, r.value);
    }
    if (extrasMode === 'closed') {
      for (const k in v) if (!known.includes(k)) return pFail(p + '.' + k, 'unexpected attribute');
    } else if (extrasMode === 'typed' && extrasParser) {
      for (const k in v) {
        if (known.includes(k)) continue;
        const re = extrasParser(kMember(v, k), p + '.' + k);
        if (!re.success) return pFail(p, null, [re]);
        pSet(o, k, re.value);
      }
    }
    return pOk(o, p);
  };
}`,
  pArray: `function pArray(elemParser) {
  return (v, p) => {
    if (!Array.isArray(v)) return pFail(p, 'expected array, got ' + (v === null ? 'Null' : typeof v));
    const a = [];
    for (let i = 0; i < v.length; i++) {
      const r = elemParser(v[i], p + '.' + i);
      if (!r.success) return pFail(p, null, [r]);
      a.push(r.value);
    }
    return pOk(a, p);
  };
}`,
  pUnion: `function pUnion(parsers) {
  return (v, p) => {
    const causes = [];
    for (const up of parsers) {
      const r = up(v, p);
      if (r.success) return r;
      causes.push(r);
    }
    return pFail(p, 'no union alternative matched', causes);
  };
}`,
  pSubtype: `function pSubtype(baseParser, checks) {
  return (v, p) => {
    const r = baseParser(v, p);
    if (!r.success) return r;
    for (const [message, label, fn] of checks) {
      if (!fn(r.value)) return pFail(p, message, [], 'constraint', label);
    }
    return r;
  };
}`,
  // The message is for a human and is not promised to anyone; `kind`, `path`
  // and `label` are the host's, and carry what it used to read out of the prose.
  pUnwrap: `function pUnwrap(r) {
  if (r.success) return r.value;
  function findError(e) { if (e.message) return e; if (e.cause && e.cause[0]) return findError(e.cause[0]); return e; }
  const err = findError(r);
  const e = new Error((err.path || '.') + ': ' + (err.message || 'type error'));
  e.kind = err.kind || 'schema';
  e.path = err.path || '.';
  if (err.label) e.label = err.label;
  throw e;
}`,
  // A guard or a check: no path, since it is about the expression it guards
  // rather than about a place in the input.
  pRaise: `function pRaise(k, l, m) {
  const e = new Error(m);
  e.kind = k;
  if (l) e.label = l;
  throw e;
}`,
};

/**
 * Ruby parser helper function snippets.
 * These are embedded in compiled Ruby output when type definitions are used.
 */
export const RUBY_HELPER_DEPS: Record<string, string[]> = {
  k_add: [],
  k_sub: [],
  k_round_to: [],
  k_pow: [],
  k_div: [],
  k_mul: ['k_str_mul'],
  k_mod: [],
  k_str_mul: [],
  k_pad: [],
  k_float: [],
  k_fetch: [],
  k_fetch_object: ['k_fetch'],
  k_fetch_any: ['k_fetch', 'k_fetch_object'],
  k_to_string: ['k_string'],
  p_any: ['p_ok'],
  p_null: ['p_ok', 'p_fail'],
  p_string: ['p_ok', 'p_fail'],
  p_int: ['p_ok', 'p_fail'],
  p_bool: ['p_ok', 'p_fail'],
  p_datetime: ['p_ok', 'p_fail'],
  p_float: ['p_ok', 'p_fail', 'k_float'],
  p_date: ['p_ok', 'p_fail'],
  p_duration: ['p_ok', 'p_fail'],
  p_data: ['p_ok', 'p_fail'],
  p_schema: ['p_ok', 'p_fail'],
  p_array: ['p_ok', 'p_fail'],
  p_union: ['p_fail'],
  p_subtype: ['p_fail'],
  p_unwrap: ['p_err'],
  p_raise: ['p_err'],
};

export const RUBY_HELPERS: Record<string, string> = {
  // A class test in a helper is written `Klass === v`, never `v.is_a?(Klass)`.
  //
  // `ActiveSupport::Duration#is_a?` delegates to the Duration's numeric value,
  // so `P2D.is_a?(Integer)` is **true** — and so is `instance_of?(Integer)`,
  // which goes through the same `method_missing`. `Integer === P2D` is false,
  // because `Module#===` does the real class check. Every dispatcher below
  // receives operands whose types nothing knows, so the difference is not
  // academic: `k_div` took its Integer branch for `P2D / 2` and answered the
  // Float 86400.0 where the typed path answers a Duration, and `k_mul` would
  // have taken a Duration for the repeat count of a String.
  //
  // What a String has to look like to be a Float. Kernel#Float is not that
  // question: it answers 1.0 for "1." on Ruby 3.4 and raises on 3.2, so the
  // same Elo program would mean two things depending on the host's Ruby. The
  // grammar is the one the other three targets accept.
  k_float: `def k_float(v)
  return v.to_f if v.is_a?(Numeric)
  s = v.to_s.strip
  raise ArgumentError, "not a Float: #{s.inspect}" unless s.match?(/\\A[+-]?(\\d+\\.?\\d*|\\.\\d+)([eE][+-]?\\d+)?\\z/)
  s.to_f
end`,
  k_str_mul: `def k_str_mul(s, n)
  return '' if n <= 0
  raise "String length limit (${MAX_STRING_LENGTH}) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > ${MAX_STRING_LENGTH}
  s * n
end`,
  k_pad: `def k_pad(s, n, p, at_start)
  raise "String length limit (${MAX_STRING_LENGTH}) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if n > ${MAX_STRING_LENGTH}
  at_start ? s.rjust(n, p) : s.ljust(n, p)
end`,
  /* Ruby answers a Rational for an Integer base and a negative Integer
     exponent: `2 ** -1` is (1/2), where every other target says 0.5. A
     Rational compares equal to the Float, so only typeOf and formatting show
     it — typeOf said 'Tuple', having no case for one. */
  k_pow: `def k_pow(l, r)
  raise "Exponentiation result exceeds the size limit (${MAX_STRING_LENGTH} bits); raise ELO_MAX_STRING_LENGTH to allow larger results" if Integer === l && Integer === r && r > 1 && l.abs > 1 && r * Math.log2(l.abs) > ${MAX_STRING_LENGTH}
  v = l ** r
  Rational === v ? v.to_f : v
end`,
  // Elo's `*` on a String is a length-bounded repeat; on the dynamic path the
  // operands are not statically typed, so route a String here rather than let
  // Ruby's unbounded `String#*` run. Everything else (numbers, durations) keeps
  // the native operator.
  k_mul: `def k_mul(l, r)
  return k_str_mul(l, r) if String === l && Integer === r
  return k_str_mul(r, l) if String === r && Integer === l
  l * r
end`,
  // Elo's `%` is numeric modulo; Ruby's `String#%` is sprintf, so a String
  // operand on the dynamic path must be refused rather than formatted.
  k_mod: `def k_mod(l, r)
  raise "Modulo requires numeric operands" unless Numeric === l && Numeric === r
  l % r
end`,
  k_round_to: `def k_round_to(x, n)
  f = 10 ** n
  (x * f).round.fdiv(f)
end`,
  // Subtracting two dates/datetimes yields a Rational number of days in Ruby,
  // not a duration. The typed implementations convert it, so the dynamic path
  // must too or the two disagree. Kept comment-free: helper bodies are inlined
  // onto one line, where a `#` would swallow the rest of the program.
  k_sub: `def k_sub(l, r)
  if (Date === l || Time === l) && (Date === r || Time === r)
    return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds
  end
  l - r
end`,
  // Elo's `+` on a Duration and a Date reads the same either way round, but
  // ActiveSupport only defines Date + Duration — `P1D + D2024-01-15` raised
  // "Date can't be coerced into Integer". The typed registrations swap the
  // operands for exactly this reason; `add:any,any` was a bare `+` and did
  // not, which is the shape CLAUDE.md warns about: a native operator on an
  // `any` operand reaching overloads Elo never asked for.
  k_add: `def k_add(l, r)
  return r + l if ActiveSupport::Duration === l && (Date === r || Time === r)
  l + r
end`,
  // Durations are tested first and by class: see the note at the top. With
  // `is_a?` and the Integer branch first, `P2D / 2` answered the Float
  // 86400.0 where the typed path and the other three targets answer P1D, so
  // typeOf said 'Float'. `Duration#/` already returns a Duration.
  k_div: `def k_div(l, r)
  return l / r if ActiveSupport::Duration === l
  return l.fdiv(r) if Integer === l && Integer === r
  l / r
end`,
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
    raise "Array length limit (${MAX_STRING_LENGTH}) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger arrays" if seg >= ${MAX_STRING_LENGTH}
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
  // Data path navigation. One helper per form, and one that picks a form by
  // the runtime shape of the path, because `fetch(d, p)` tells its four forms
  // apart by the *type* of `p` and that type is not always known. These used
  // to be lambdas inlined at each of the four registrations; a bound that
  // lives in four copies is a bound three of them can lose.
  //
  // Ruby hashes built from Elo objects are symbol-keyed, so a string segment
  // is converted; there is no prototype chain behind `Hash#[]`, so no
  // meta-property a computed key could reach (see helper-region.unit.test.ts,
  // "Why JavaScript only").
  k_fetch: `def k_fetch(d, p)
  return nil unless p.is_a?(Array)
  p.reduce(d) { |cur, seg| break nil if cur.nil?; seg.is_a?(Integer) ? (cur.is_a?(Array) ? cur[seg] : nil) : (cur.is_a?(Hash) ? cur[seg.is_a?(String) ? seg.to_sym : seg] : nil) }
end`,
  k_fetch_object: `def k_fetch_object(d, ps)
  return nil unless ps.is_a?(Hash)
  ps.transform_values { |p| k_fetch(d, p) }
end`,
  k_fetch_any: `def k_fetch_any(d, p)
  return k_fetch(d, [p]) if p.is_a?(String)
  return k_fetch(d, p) if p.is_a?(Array)
  return k_fetch_object(d, p) if p.is_a?(Hash)
  nil
end`,
  // `String(x)` converts; k_string renders, and renders a string quoted. The
  // typed `String:string` is the identity, so the dynamic path must be too.
  k_to_string: `def k_to_string(v)
  v.is_a?(String) ? v : k_string(v)
end`,
  k_intersection: `def k_intersection(a, b)
  s = [a.first, b.first].max
  e = [a.last, b.last].min
  s >= e ? (s..s) : (s..e)
end`,
  p_ok: `def p_ok(v, p) { success: true, path: p, message: '', value: v, cause: [] } end`,
  p_fail: `def p_fail(p, m = nil, c = nil, k = nil, l = nil) { success: false, path: p, message: m || '', value: nil, cause: c || [], kind: k || 'schema', label: l } end`,
  /* A failure carrying what a host branches on. Ruby cannot open a class here
     — these helpers are defined inside the lambda the expression compiles to,
     and `class` is not allowed in a body — so the readers are attached to the
     instance. */
  p_err: `def p_err(m, k, pa, l)
  e = StandardError.new(m)
  e.define_singleton_method(:kind) { k }
  e.define_singleton_method(:path) { pa }
  e.define_singleton_method(:label) { l }
  e
end`,
  p_schema: `def p_schema(props, extras_mode, extras_parser = nil)
  known = props.map { |pr| pr[0] }
  lambda do |v, p|
    return p_fail(p, "expected object, got #{v.nil? ? 'Null' : v.class}") unless v.is_a?(Hash)
    o = {}
    props.each do |key, parser, optional|
      next if optional && v[key].nil?
      r = parser.call(v[key], "#{p}.#{key}")
      return p_fail(p, nil, [v.key?(key) ? r : r.merge(kind: 'missing')]) unless r[:success]
      o[key] = r[:value]
    end
    if extras_mode == 'closed'
      v.each_key do |k|
        return p_fail("#{p}.#{k}", 'unexpected attribute') unless known.include?(k)
      end
    elsif extras_mode == 'typed' && !extras_parser.nil?
      v.each_key do |k|
        next if known.include?(k)
        re = extras_parser.call(v[k], "#{p}.#{k}")
        return p_fail(p, nil, [re]) unless re[:success]
        o[k] = re[:value]
      end
    end
    p_ok(o, p)
  end
end`,
  p_array: `def p_array(elem_parser)
  lambda do |v, p|
    return p_fail(p, "expected array, got #{v.nil? ? 'Null' : v.class}") unless v.is_a?(Array)
    a = []
    v.each_with_index do |e, i|
      r = elem_parser.call(e, "#{p}.#{i}")
      return p_fail(p, nil, [r]) unless r[:success]
      a << r[:value]
    end
    p_ok(a, p)
  end
end`,
  p_union: `def p_union(parsers)
  lambda do |v, p|
    causes = []
    parsers.each do |up|
      r = up.call(v, p)
      return r if r[:success]
      causes << r
    end
    p_fail(p, 'no union alternative matched', causes)
  end
end`,
  p_subtype: `def p_subtype(base_parser, checks)
  lambda do |v, p|
    r = base_parser.call(v, p)
    return r unless r[:success]
    val = r[:value]
    checks.each do |message, label, fn|
      return p_fail(p, message, [], 'constraint', label) unless fn.call(val)
    end
    r
  end
end`,
  p_raise: `def p_raise(k, l, m)
  raise p_err(m, k, nil, l)
end`,
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
  return p_ok(k_float(v), p) if v.is_a?(String) rescue nil
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
  if v.is_a?(String)
    begin
      return p_ok(JSON.parse(v, symbolize_names: true), p)
    rescue
      return p_fail(p, "invalid JSON: #{v.inspect}")
    end
  end
  p_ok(v, p)
end`,
  // `||` is not a default here, because an **empty string is truthy in Ruby**
  // where it is falsy in JavaScript and Python. `err[:path] || '.'` therefore
  // left the root path empty on this target alone, and `{a: 1} |> [{a: Int}]`
  // reported `path: ''` where the other two report `.` — the same program
  // meaning two things, which is the one thing Elo must not do. Read the two
  // fields through something that treats empty as absent.
  p_unwrap: `def p_unwrap(r)
  return r[:value] if r[:success]
  find_error = ->(e) {
    return e if e[:message] && !e[:message].empty?
    return find_error.call(e[:cause][0]) if e[:cause] && e[:cause][0]
    e
  }
  err = find_error.call(r)
  given = ->(v, fallback) { v.nil? || (v.respond_to?(:empty?) && v.empty?) ? fallback : v }
  path = given.call(err[:path], '.')
  raise p_err("#{path}: #{given.call(err[:message], 'type error')}", given.call(err[:kind], 'schema'), path, err[:label])
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
  kStrMul: [],
  kPad: [],
  kRound: ['_import_math'],
  kRoundTo: ['kRound'],
  kEq: [],
  kNeq: ['kEq'],
  kIntersection: ['_EloInterval'],
  kFetch: [],
  kFetchObject: ['kFetch'],
  kFetchAny: ['kFetch', 'kFetchObject'],
  kToString: ['kString'],
  kDeepMerge: [],
  kPatch: [],
  kTypeOf: [],
  kAssert: [],
  kFail: [],
  kAssertFails: [],
  kAdd: [],
  kSub: [],
  kMul: ['kStrMul'],
  kDiv: [],
  kMod: [],
  kPow: [],
  kNeg: [],
  kBool: [],
  kString: ['_elo_dur_to_iso'],
  kParseDate: ['_elo_dt_helpers'],
  kParseDatetime: ['_elo_dt_helpers'],
  kParseDuration: ['_elo_duration', '_EloInterval'],
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
  pDate: ['pOk', 'pFail', 'kParseDate'],
  pDatetime: ['pOk', 'pFail', 'kParseDatetime'],
  pDuration: ['pOk', 'pFail', '_elo_duration'],
  pData: ['pOk', 'pFail'],
  pSchema: ['pOk', 'pFail'],
  pArray: ['pOk', 'pFail'],
  pUnion: ['pFail'],
  pSubtype: ['pOk', 'pFail'],
  pUnwrap: ['EloFailure'],
  pAssert: ['EloFailure'],
};

export const PY_HELPERS: Record<string, string> = {
  kStrMul: `def kStrMul(s, n):
    if n <= 0: return ""
    if len(s) * n > ${MAX_STRING_LENGTH}: raise ValueError("String length limit (${MAX_STRING_LENGTH}) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings")
    return s * n`,
  kPad: `def kPad(s, n, p, at_start):
    if n > ${MAX_STRING_LENGTH}: raise ValueError("String length limit (${MAX_STRING_LENGTH}) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings")
    return s.rjust(n, p) if at_start else s.ljust(n, p)`,
  _import_math: `import math`,
  _import_functools: `import functools`,
  _import_datetime: `import datetime as _dt`,
  _import_re: `import re`,
  _import_collections: `from collections import namedtuple`,
  _EloInterval: `EloInterval = namedtuple('EloInterval', ['start', 'end'])`,
  // A duration keeps its year and month components apart from its time
  // component, because they are not a number of milliseconds: a month is a
  // calendar month, so `date + P1M` lands on the same day-of-month of the next
  // month whatever that month's length. Folding them into milliseconds made
  // Python add thirty days per month, where JavaScript, Ruby and SQL all did
  // calendar arithmetic.
  //
  // `to_ms` remains, for the comparisons and the in_* conversions, which need a
  // total order. It uses the same nominal lengths as the other targets — 365
  // days for a year, 30 for a month — so `P1Y != P12M` there, as on JavaScript.
  //
  // Scaling (`scale`, `divide`, `negate`) collapses to milliseconds, which is
  // what the JavaScript target does too: `Duration.fromMillis(l.toMillis() * r)`
  // has no month left either. Ruby keeps the month, so `date + P1M * 2` already
  // differs between those two; that divergence is its own defect, not this one.
  _elo_duration: `class EloDuration:
    __slots__ = ('_ms', '_years', '_months')
    def __init__(self, ms, years=0, months=0):
        self._ms = ms
        self._years = years
        self._months = months
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
        total_days = wks * 7 + dys
        return EloDuration(((total_days * 24 + hrs) * 60 + mns) * 60000 + scs * 1000, yrs, mos)
    @staticmethod
    def from_timedelta(td):
        return EloDuration(td.total_seconds() * 1000)
    def to_ms(self): return self._ms + (self._years * 365 + self._months * 30) * 86400000
    def time_ms(self): return self._ms
    def calendar_months(self): return self._years * 12 + self._months
    def plus(self, other):
        if isinstance(other, EloDuration): return EloDuration(self._ms + other._ms, self._years + other._years, self._months + other._months)
        if isinstance(other, _dt.datetime): return _elo_dt_plus(other, self)
        raise Exception('Cannot add duration to ' + type(other).__name__)
    def minus(self, other):
        if isinstance(other, EloDuration): return EloDuration(self._ms - other._ms, self._years - other._years, self._months - other._months)
        raise Exception('Cannot subtract ' + type(other).__name__ + ' from duration')
    def scale(self, n):
        # An integer scales each component, so P1M * 2 is two calendar months.
        # A non-integer cannot — half a calendar month is not a thing — so it
        # collapses to the nominal length, which is what division gives.
        if float(n).is_integer(): return EloDuration(self._ms * n, self._years * int(n), self._months * int(n))
        return EloDuration(self.to_ms() * n)
    def divide(self, n): return EloDuration(self.to_ms() / n)
    def negate(self): return EloDuration(-self._ms, -self._years, -self._months)
    def __eq__(self, other): return isinstance(other, EloDuration) and self.to_ms() == other.to_ms()
    def __ne__(self, other): return not self.__eq__(other)
    def __lt__(self, other): return self.to_ms() < other.to_ms()
    def __le__(self, other): return self.to_ms() <= other.to_ms()
    def __gt__(self, other): return self.to_ms() > other.to_ms()
    def __ge__(self, other): return self.to_ms() >= other.to_ms()
    def __repr__(self): return f'EloDuration({self._years}Y{self._months}M{self._ms}ms)'
    def in_seconds(self): return self.to_ms() / 1000.0
    def in_minutes(self): return self.to_ms() / 60000.0
    def in_hours(self): return self.to_ms() / 3600000.0
    def in_days(self): return self.to_ms() / 86400000.0
    def in_weeks(self): return self.to_ms() / 604800000.0
    def in_months(self): return self.to_ms() / (30.4375 * 86400000.0)
    def in_quarters(self): return self.to_ms() / (91.3125 * 86400000.0)
    def in_years(self): return self.to_ms() / (365.25 * 86400000.0)`,
  _elo_dt_helpers: `def _elo_shift_months(dt, n):
    if not n: return dt
    import calendar
    m = dt.month - 1 + n
    y = dt.year + m // 12
    m = m % 12 + 1
    return dt.replace(year=y, month=m, day=min(dt.day, calendar.monthrange(y, m)[1]))
def _elo_dt_plus(dt, dur):
    from datetime import timedelta
    return _elo_shift_months(dt, dur.calendar_months()) + timedelta(milliseconds=dur.time_ms())
def _elo_dt_minus_dur(dt, dur):
    from datetime import timedelta
    return _elo_shift_months(dt, -dur.calendar_months()) - timedelta(milliseconds=dur.time_ms())
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
    # A path that is not a list of segments has nothing to walk; without this
    # the loop raised TypeError from ordinary Elo source, which the security
    # page promises cannot happen. See kFetchAny.
    if not isinstance(path, list): return None
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
  // `fetch(d, p)` has four forms told apart by the type of `p`. With the type
  // unknown, the shape of the value has to tell them apart instead.
  kFetchAny: `def kFetchAny(data, path):
    if isinstance(path, str): return kFetch(data, [path])
    if isinstance(path, list): return kFetch(data, path)
    if isinstance(path, dict): return kFetchObject(data, path)
    return None`,
  // `String(x)` converts; kString renders, and renders a string quoted. The
  // typed `String:string` is the identity, so the dynamic path must be too.
  kToString: `def kToString(v):
    return v if isinstance(v, str) else kString(v)`,
  kPatch: `def kPatch(data, path, value):
    if len(path) == 0: return value
    seg = path[0]
    rest = path[1:]
    next_default = None if len(rest) == 0 else ([] if isinstance(rest[0], int) else {})
    if isinstance(seg, int):
        if data is not None and not isinstance(data, list): raise Exception('cannot patch array index on non-array')
        if seg >= ${MAX_STRING_LENGTH}: raise Exception("Array length limit (${MAX_STRING_LENGTH}) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger arrays")
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
    if sep == '': return list(s)
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
    mos = d.calendar_months()
    ms = d.time_ms()
    if mos and ms and (mos < 0) != (ms < 0): mos, ms = 0, d.to_ms()
    if mos == 0 and ms == 0: return 'PT0S'
    neg = mos < 0 or ms < 0
    mos = abs(mos)
    ms = abs(ms)
    secs = ms / 1000
    days = int(secs // 86400); secs -= days * 86400
    hours = int(secs // 3600); secs -= hours * 3600
    mins = int(secs // 60); secs -= mins * 60
    s = '-P' if neg else 'P'
    if mos // 12: s += str(mos // 12) + 'Y'
    if mos % 12: s += str(mos % 12) + 'M'
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
    if isinstance(l, list) or isinstance(r, list): raise ValueError("Array multiplication is not supported")
    if isinstance(l, str) and isinstance(r, int) and not isinstance(r, bool): return kStrMul(l, r)
    if isinstance(r, str) and isinstance(l, int) and not isinstance(l, bool): return kStrMul(r, l)
    if isinstance(l, EloDuration): return l.scale(r)
    if isinstance(r, EloDuration): return r.scale(l)
    return l * r`,
  kRound: `def kRound(x):
    return math.floor(x + 0.5) if x >= 0 else math.ceil(x - 0.5)`,
  kRoundTo: `def kRoundTo(x, n):
    f = 10 ** n
    return kRound(x * f) / f`,
  kDiv: `def kDiv(l, r):
    if isinstance(l, EloDuration) and isinstance(r, (int, float)): return l.divide(r)
    return l / r`,
  kMod: `def kMod(l, r):
    if not isinstance(l, (int, float)) or not isinstance(r, (int, float)): raise ValueError("Modulo requires numeric operands")
    return l % r`,
  kPow: `def kPow(l, r):
    import math
    if isinstance(l, int) and isinstance(r, int) and r > 1 and abs(l) > 1 and r * math.log2(abs(l)) > ${MAX_STRING_LENGTH}: raise ValueError("Exponentiation result exceeds the size limit (${MAX_STRING_LENGTH} bits); raise ELO_MAX_STRING_LENGTH to allow larger results")
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
  // `Duration:duration` is the identity, so `Duration:any` has to accept a
  // Duration too — `EloDuration.from_iso` alone fed one to `re.match` and
  // raised a host TypeError. kParseDate and kParseDatetime already did this;
  // this is the third of three, and it was the one left out.
  kParseDuration: `def kParseDuration(v):
    if isinstance(v, EloDuration): return v
    if isinstance(v, str): return EloDuration.from_iso(v)
    # Duration(interval) is the interval's length on the typed path.
    if isinstance(v, EloInterval): return EloDuration.from_timedelta(v.end - v.start)
    raise Exception('Cannot parse duration: ' + repr(v))`,
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
  pFail: `def pFail(p, m=None, c=None, k=None, l=None):
    return {"success": False, "path": p, "message": m or "", "value": None, "cause": c or [], "kind": k or "schema", "label": l}`,
  pUnwrap: `def pUnwrap(r):
    if r["success"]: return r["value"]
    def find_error(e):
        if e.get("message"): return e
        if e.get("cause") and len(e["cause"]) > 0: return find_error(e["cause"][0])
        return e
    err = find_error(r)
    raise EloFailure(
        (err.get("path") or ".") + ": " + (err.get("message") or "type error"),
        err.get("kind") or "schema",
        err.get("path") or ".",
        err.get("label"),
    )`,
  // A failure carrying what a host branches on: the message is prose and is
  // not promised to anyone, `kind`, `path` and `label` are the interface.
  EloFailure: `class EloFailure(Exception):
    def __init__(self, message, kind=None, path=None, label=None):
        super().__init__(message)
        self.kind = kind
        self.path = path
        self.label = label`,
  // A guard or a check: no path, since it is about the expression it guards
  // rather than about a place in the input.
  // A guard or a check, as an expression: Python has no `raise` in one, so the
  // condition is tested by a call that answers True or raises.
  pAssert: `def pAssert(cond, k, l, m):
    if not cond: raise EloFailure(m, k, None, l)
    return True`,
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
  pDuration: `def pDuration(v, p):
    if isinstance(v, EloDuration): return pOk(v, p)
    if isinstance(v, str):
        try: return pOk(EloDuration.from_iso(v), p)
        except: pass
    return pFail(p, "expected Duration (ISO 8601), got " + ("Null" if v is None else repr(v) if isinstance(v, str) else type(v).__name__))`,
  pData: `def pData(v, p):
    import json
    if isinstance(v, str):
        try: return pOk(json.loads(v), p)
        except: return pFail(p, "invalid JSON: " + repr(v))
    return pOk(v, p)`,
  pDate: `def pDate(v, p):
    if isinstance(v, _dt.datetime): return pOk(kParseDate(v), p)
    if isinstance(v, str):
        try: return pOk(kParseDate(v), p)
        except: pass
    return pFail(p, "expected Date (YYYY-MM-DD), got " + ("Null" if v is None else repr(v) if isinstance(v, str) else type(v).__name__))`,
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
            if not r["success"]:
                # A key that never arrived is a different event from one that
                # arrived and was refused, and only the schema can tell them
                # apart: a dict answers None for both.
                return pFail(p, None, [r if key in v else dict(r, kind="missing")])
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
        for message, label, check in checks:
            if not check(val): return pFail(p, message, [], "constraint", label)
        return r
    return parser`,
};
