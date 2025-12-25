/**
 * Klang runtime helpers for JavaScript execution.
 * These are used by compiled K expressions at runtime.
 *
 * This module provides:
 * 1. A factory function for creating the runtime (used by web frontend)
 * 2. Individual helper snippets for dynamic prelude generation
 */

export interface DayjsLike {
  isDayjs(value: any): boolean;
  isDuration(value: any): boolean;
}

export interface KlangRuntime {
  kAdd(left: any, right: any): any;
  kSub(left: any, right: any): any;
  kMul(left: any, right: any): any;
  kDiv(left: any, right: any): any;
  kMod(left: any, right: any): any;
  kPow(left: any, right: any): any;
  kNeg(value: any): any;
  kPos(value: any): any;
}

/**
 * Creates the klang runtime helpers using the provided dayjs instance.
 * Used by the web frontend where dayjs is already loaded.
 */
export function createKlangRuntime(dayjs: DayjsLike): KlangRuntime {
  return {
    kAdd(left: any, right: any): any {
      if (dayjs.isDayjs(left) && dayjs.isDuration(right)) return left.add(right);
      if (dayjs.isDuration(left) && dayjs.isDayjs(right)) return right.add(left);
      return left + right;
    },
    kSub(left: any, right: any): any {
      if (dayjs.isDayjs(left) && dayjs.isDuration(right)) return left.subtract(right);
      return left - right;
    },
    kMul(left: any, right: any): any {
      return left * right;
    },
    kDiv(left: any, right: any): any {
      return left / right;
    },
    kMod(left: any, right: any): any {
      return left % right;
    },
    kPow(left: any, right: any): any {
      return Math.pow(left, right);
    },
    kNeg(value: any): any {
      return -value;
    },
    kPos(value: any): any {
      return +value;
    }
  };
}

/**
 * Individual JavaScript helper function snippets.
 * Each helper is a standalone function that can be included in the output.
 */
export const JS_HELPERS: Record<string, string> = {
  kAdd: `function kAdd(l, r) {
  if (dayjs.isDayjs(l) && dayjs.isDuration(r)) return l.add(r);
  if (dayjs.isDuration(l) && dayjs.isDayjs(r)) return r.add(l);
  return l + r;
}`,
  kSub: `function kSub(l, r) {
  if (dayjs.isDayjs(l) && dayjs.isDuration(r)) return l.subtract(r);
  return l - r;
}`,
  kMul: `function kMul(l, r) { return l * r; }`,
  kDiv: `function kDiv(l, r) { return l / r; }`,
  kMod: `function kMod(l, r) { return l % r; }`,
  kPow: `function kPow(l, r) { return Math.pow(l, r); }`,
  kNeg: `function kNeg(v) { return -v; }`,
  kPos: `function kPos(v) { return +v; }`,
};
