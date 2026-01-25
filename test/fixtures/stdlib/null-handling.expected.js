(function (_) {
  function kIsNull(v) {
    return v === null || v === undefined;
  }
  return (function () {
    if (!(kIsNull(null) == true)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kIsNull(v) {
    return v === null || v === undefined;
  }
  return (function () {
    if (!(kIsNull(42) == false)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kIsNull(v) {
    return v === null || v === undefined;
  }
  return (function () {
    if (!(kIsNull("hello") == false)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kIsNull(v) {
    return v === null || v === undefined;
  }
  return (function () {
    if (!(kIsNull(true) == false)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kTypeOf(v) {
    if (v === null || v === undefined) return "Null";
    if (Duration.isDuration(v)) return "Duration";
    if (DateTime.isDateTime(v)) return "DateTime";
    if (typeof v === "number") return Number.isInteger(v) ? "Int" : "Float";
    if (typeof v === "boolean") return "Bool";
    if (typeof v === "string") return "String";
    if (typeof v === "function") return "Function";
    if (Array.isArray(v)) return "List";
    return "Tuple";
  }
  return (function () {
    if (!(kTypeOf(null) == "Null")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(42 ?? 0 == 42)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("hello" ?? "default" == "hello")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(1 + 1 ?? 0 == 2)) throw new Error("Assertion failed");
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
    if (!kEq(((i) => (i === -1 ? null : i))("hello".indexOf("l")), 2))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kIsNull(v) {
    return v === null || v === undefined;
  }
  return (function () {
    if (
      !(kIsNull(((i) => (i === -1 ? null : i))("hello".indexOf("l"))) == false)
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kIsNull(v) {
    return v === null || v === undefined;
  }
  return (function () {
    if (
      !(kIsNull(((i) => (i === -1 ? null : i))("hello".indexOf("x"))) == true)
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kTypeOf(v) {
    if (v === null || v === undefined) return "Null";
    if (Duration.isDuration(v)) return "Duration";
    if (DateTime.isDateTime(v)) return "DateTime";
    if (typeof v === "number") return Number.isInteger(v) ? "Int" : "Float";
    if (typeof v === "boolean") return "Bool";
    if (typeof v === "string") return "String";
    if (typeof v === "function") return "Function";
    if (Array.isArray(v)) return "List";
    return "Tuple";
  }
  return (function () {
    if (
      !(kTypeOf(((i) => (i === -1 ? null : i))("hello".indexOf("x"))) == "Null")
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(((i) => (i === -1 ? null : i))("hello".indexOf("x")) ?? -1 == -1))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(((i) => (i === -1 ? null : i))("hello".indexOf("l")) ?? -1 == 2))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
