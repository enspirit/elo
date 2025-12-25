/**
 * Klang runtime helpers for JavaScript execution.
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
  kNeg: `function kNeg(v) {
  if (dayjs.isDuration(v)) return dayjs.duration(-v.asMilliseconds());
  return -v;
}`,
  kPos: `function kPos(v) { return +v; }`,
};
