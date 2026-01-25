(function (_) {
  function kAdd(l, r) {
    if (DateTime.isDateTime(l) && Duration.isDuration(r)) return l.plus(r);
    if (Duration.isDuration(l) && DateTime.isDateTime(r)) return r.plus(l);
    if (Duration.isDuration(l) && Duration.isDuration(r))
      return Duration.fromMillis(l.toMillis() + r.toMillis());
    return l + r;
  }
  function kEq(l, r) {
    if (Duration.isDuration(l) && Duration.isDuration(r))
      return l.toMillis() === r.toMillis();
    if (DateTime.isDateTime(l) && DateTime.isDateTime(r))
      return l.toMillis() === r.toMillis();
    if (Array.isArray(l) && Array.isArray(r)) {
      if (l.length !== r.length) return false;
      for (let i = 0; i < l.length; i++) if (!kEq(l[i], r[i])) return false;
      return true;
    }
    if (
      typeof l === "object" &&
      typeof r === "object" &&
      l !== null &&
      r !== null &&
      !Array.isArray(l) &&
      !Array.isArray(r)
    ) {
      const keysL = Object.keys(l);
      const keysR = Object.keys(r);
      if (keysL.length !== keysR.length) return false;
      for (const key of keysL)
        if (!(key in r) || !kEq(l[key], r[key])) return false;
      return true;
    }
    return l == r;
  }
  return (function () {
    if (!kEq(kAdd(_.x, _.y), 15)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kAdd(l, r) {
    if (DateTime.isDateTime(l) && Duration.isDuration(r)) return l.plus(r);
    if (Duration.isDuration(l) && DateTime.isDateTime(r)) return r.plus(l);
    if (Duration.isDuration(l) && Duration.isDuration(r))
      return Duration.fromMillis(l.toMillis() + r.toMillis());
    return l + r;
  }
  function kEq(l, r) {
    if (Duration.isDuration(l) && Duration.isDuration(r))
      return l.toMillis() === r.toMillis();
    if (DateTime.isDateTime(l) && DateTime.isDateTime(r))
      return l.toMillis() === r.toMillis();
    if (Array.isArray(l) && Array.isArray(r)) {
      if (l.length !== r.length) return false;
      for (let i = 0; i < l.length; i++) if (!kEq(l[i], r[i])) return false;
      return true;
    }
    if (
      typeof l === "object" &&
      typeof r === "object" &&
      l !== null &&
      r !== null &&
      !Array.isArray(l) &&
      !Array.isArray(r)
    ) {
      const keysL = Object.keys(l);
      const keysR = Object.keys(r);
      if (keysL.length !== keysR.length) return false;
      for (const key of keysL)
        if (!(key in r) || !kEq(l[key], r[key])) return false;
      return true;
    }
    return l == r;
  }
  return (function () {
    if (!kEq(kAdd(_.price, _.tax), 110)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kAdd(l, r) {
    if (DateTime.isDateTime(l) && Duration.isDuration(r)) return l.plus(r);
    if (Duration.isDuration(l) && DateTime.isDateTime(r)) return r.plus(l);
    if (Duration.isDuration(l) && Duration.isDuration(r))
      return Duration.fromMillis(l.toMillis() + r.toMillis());
    return l + r;
  }
  function kEq(l, r) {
    if (Duration.isDuration(l) && Duration.isDuration(r))
      return l.toMillis() === r.toMillis();
    if (DateTime.isDateTime(l) && DateTime.isDateTime(r))
      return l.toMillis() === r.toMillis();
    if (Array.isArray(l) && Array.isArray(r)) {
      if (l.length !== r.length) return false;
      for (let i = 0; i < l.length; i++) if (!kEq(l[i], r[i])) return false;
      return true;
    }
    if (
      typeof l === "object" &&
      typeof r === "object" &&
      l !== null &&
      r !== null &&
      !Array.isArray(l) &&
      !Array.isArray(r)
    ) {
      const keysL = Object.keys(l);
      const keysR = Object.keys(r);
      if (keysL.length !== keysR.length) return false;
      for (const key of keysL)
        if (!(key in r) || !kEq(l[key], r[key])) return false;
      return true;
    }
    return l == r;
  }
  return (function () {
    if (!kEq(kAdd(_.user_age, _.account_balance), 2525))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kAdd(l, r) {
    if (DateTime.isDateTime(l) && Duration.isDuration(r)) return l.plus(r);
    if (Duration.isDuration(l) && DateTime.isDateTime(r)) return r.plus(l);
    if (Duration.isDuration(l) && Duration.isDuration(r))
      return Duration.fromMillis(l.toMillis() + r.toMillis());
    return l + r;
  }
  function kEq(l, r) {
    if (Duration.isDuration(l) && Duration.isDuration(r))
      return l.toMillis() === r.toMillis();
    if (DateTime.isDateTime(l) && DateTime.isDateTime(r))
      return l.toMillis() === r.toMillis();
    if (Array.isArray(l) && Array.isArray(r)) {
      if (l.length !== r.length) return false;
      for (let i = 0; i < l.length; i++) if (!kEq(l[i], r[i])) return false;
      return true;
    }
    if (
      typeof l === "object" &&
      typeof r === "object" &&
      l !== null &&
      r !== null &&
      !Array.isArray(l) &&
      !Array.isArray(r)
    ) {
      const keysL = Object.keys(l);
      const keysR = Object.keys(r);
      if (keysL.length !== keysR.length) return false;
      for (const key of keysL)
        if (!(key in r) || !kEq(l[key], r[key])) return false;
      return true;
    }
    return l == r;
  }
  return (function () {
    if (!kEq(kAdd(_.var1, _.var2), 30)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
