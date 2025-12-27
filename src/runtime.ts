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
export const JS_HELPERS: Record<string, string> = {
  kAdd: `function kAdd(l, r) {
  if (dayjs.isDayjs(l) && dayjs.isDuration(r)) return l.add(r);
  if (dayjs.isDuration(l) && dayjs.isDayjs(r)) return r.add(l);
  if (dayjs.isDuration(l) && dayjs.isDuration(r)) return dayjs.duration(l.asMilliseconds() + r.asMilliseconds());
  return l + r;
}`,
  kSub: `function kSub(l, r) {
  if (dayjs.isDayjs(l) && dayjs.isDuration(r)) return l.subtract(r);
  if (dayjs.isDuration(l) && dayjs.isDuration(r)) return dayjs.duration(l.asMilliseconds() - r.asMilliseconds());
  return l - r;
}`,
  kMul: `function kMul(l, r) {
  if (dayjs.isDuration(l)) return dayjs.duration(l.asMilliseconds() * r);
  if (dayjs.isDuration(r)) return dayjs.duration(r.asMilliseconds() * l);
  return l * r;
}`,
  kDiv: `function kDiv(l, r) {
  if (dayjs.isDuration(l) && typeof r === 'number') return dayjs.duration(l.asMilliseconds() / r);
  return l / r;
}`,
  kMod: `function kMod(l, r) { return l % r; }`,
  kPow: `function kPow(l, r) { return Math.pow(l, r); }`,
  kEq: `function kEq(l, r) {
  if (dayjs.isDuration(l) && dayjs.isDuration(r)) return l.asMilliseconds() === r.asMilliseconds();
  if (dayjs.isDayjs(l) && dayjs.isDayjs(r)) return l.valueOf() === r.valueOf();
  return l == r;
}`,
  kNeq: `function kNeq(l, r) {
  if (dayjs.isDuration(l) && dayjs.isDuration(r)) return l.asMilliseconds() !== r.asMilliseconds();
  if (dayjs.isDayjs(l) && dayjs.isDayjs(r)) return l.valueOf() !== r.valueOf();
  return l != r;
}`,
  kNeg: `function kNeg(v) {
  if (dayjs.isDuration(v)) return dayjs.duration(-v.asMilliseconds());
  return -v;
}`,
  kPos: `function kPos(v) { return +v; }`,
  kTypeOf: `function kTypeOf(v) {
  if (v === null || v === undefined) return 'Null';
  if (dayjs.isDuration(v)) return 'Duration';
  if (dayjs.isDayjs(v)) return 'DateTime';
  if (typeof v === 'number') return Number.isInteger(v) ? 'Int' : 'Float';
  if (typeof v === 'boolean') return 'Bool';
  if (typeof v === 'string') return 'String';
  if (typeof v === 'function') return 'Fn';
  return 'Object';
}`,
  kIsNull: `function kIsNull(v) { return v === null || v === undefined; }`,
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
  if (dayjs.isDayjs(v)) return v.startOf('day');
  if (typeof v === 'string') { const d = dayjs(v); return d.isValid() && /^\\d{4}-\\d{2}-\\d{2}$/.test(v) ? d.startOf('day') : null; }
  return null;
}`,
  kDatetime: `function kDatetime(v) {
  if (v === null || v === undefined) return null;
  if (dayjs.isDayjs(v)) return v;
  if (typeof v === 'string') { const d = dayjs(v); return d.isValid() ? d : null; }
  return null;
}`,
  kDuration: `function kDuration(v) {
  if (v === null || v === undefined) return null;
  if (dayjs.isDuration(v)) return v;
  if (typeof v === 'string') { const d = dayjs.duration(v); return isNaN(d.asMilliseconds()) ? null : d; }
  return null;
}`,
};
