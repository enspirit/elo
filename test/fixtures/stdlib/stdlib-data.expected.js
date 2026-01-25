(function (_) {
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
    if (!kEq([...[1, 2, 3]].reverse(), [3, 2, 1]))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
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
    if (!kEq([...[]].reverse(), [])) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
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
    if (!kEq([...["a", "b", "c"]].reverse(), ["c", "b", "a"]))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
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
    if (!kEq([...[1]].reverse(), [1])) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
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
    if (!kEq(["a", "b", "c"].join(","), "a,b,c"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
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
    if (!kEq(["hello", "world"].join(" "), "hello world"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
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
    if (!kEq(["one"].join("-"), "one")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
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
    if (!kEq([].join(","), "")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
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
    if (!kEq("a,b,c" === "" ? [] : "a,b,c".split(","), ["a", "b", "c"]))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
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
    if (
      !kEq("hello world" === "" ? [] : "hello world".split(" "), [
        "hello",
        "world",
      ])
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
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
    if (!kEq("one" === "" ? [] : "one".split(","), ["one"]))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
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
    if (!kEq("" === "" ? [] : "".split(","), []))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
