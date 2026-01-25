(function (_) {
  return (function () {
    if (!("hello".length == 5)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("".length == 0)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("abc def".length == 7)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("hello".toUpperCase() == "HELLO"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("WORLD".toLowerCase() == "world"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("MiXeD".toUpperCase() == "MIXED"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("MiXeD".toLowerCase() == "mixed"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("  hello  ".trim() == "hello")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("no spaces".trim() == "no spaces"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("   ".trim() == "")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!"hello world".startsWith("hello")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!!"hello world".startsWith("world"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!"hello world".endsWith("world")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!!"hello world".endsWith("hello")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!"hello world".includes("lo wo")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!"hello world".includes("hello")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!!"hello world".includes("xyz")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("hello".substring(0, 0 + 2) == "he"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("hello".substring(1, 1 + 3) == "ell"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("hello world".substring(6, 6 + 5) == "world"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("hello".substring(2, 2 + 100) == "llo"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("hello".concat(" world") == "hello world"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("".concat("test") == "test")) throw new Error("Assertion failed");
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
    if (!kEq(((i) => (i === -1 ? null : i))("hello world".indexOf("world")), 6))
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
    if (!kEq(((i) => (i === -1 ? null : i))("hello world".indexOf("o")), 4))
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
      !(
        kIsNull(((i) => (i === -1 ? null : i))("hello world".indexOf("xyz"))) ==
        true
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("hello world".replace("world", "there") == "hello there"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("abab".replace("ab", "x") == "xab"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("abab".replaceAll("ab", "x") == "xx"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("".length === 0)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!!("hello".length === 0)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("42".padStart(5, "0") == "00042"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("hi".padEnd(5, ".") == "hi...")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("hello" + " " + "world" == "hello world"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(("hello" + " " + "world").toUpperCase() == "HELLO WORLD"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(("HELLO" + " " + "WORLD").toLowerCase() == "hello world"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!((" hello " + " world ").trim() == "hello  world"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(("ab" + "cd").length == 4)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("hi".repeat(3) == "hihihi")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("hi".repeat(3) == "hihihi")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("ab".repeat(2) == "abab")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("".repeat(5) == "")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("x".repeat(0) == "")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
