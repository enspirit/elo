(function (_) {
  return (function () {
    if (!(42 == 42)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(40 + 2 == 42)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(42 != 43)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(3.14 == 3.14)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(3 + 0.14 == 3.14)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(3.14 != 3.15)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(true == true)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(false == false)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(true != false)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!((1 == 1) == true)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("hello" == "hello")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("hel" + "lo" == "hello")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!("hello" != "world")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        DateTime.fromISO("2024-01-15").toMillis() ===
        DateTime.fromISO("2024-01-15").toMillis()
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        DateTime.fromISO("2024-01-14")
          .plus(Duration.fromISO("P1D"))
          .toMillis() === DateTime.fromISO("2024-01-15").toMillis()
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        DateTime.fromISO("2024-01-15").toMillis() !==
        DateTime.fromISO("2024-01-16").toMillis()
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        DateTime.fromISO("2024-01-15T10:00:00Z").toMillis() ===
        DateTime.fromISO("2024-01-15T10:00:00Z").toMillis()
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        DateTime.fromISO("2024-01-15T09:00:00Z")
          .plus(Duration.fromISO("PT1H"))
          .toMillis() === DateTime.fromISO("2024-01-15T10:00:00Z").toMillis()
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        DateTime.fromISO("2024-01-15T10:00:00Z").toMillis() !==
        DateTime.fromISO("2024-01-15T11:00:00Z").toMillis()
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        Duration.fromISO("P1D").toMillis() ===
        Duration.fromISO("P1D").toMillis()
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        Duration.fromISO("P1D").plus(Duration.fromISO("P1D")).toMillis() ===
        Duration.fromISO("P2D").toMillis()
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        Duration.fromMillis(
          Duration.fromISO("P1D").toMillis() * 2,
        ).toMillis() === Duration.fromISO("P2D").toMillis()
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        Duration.fromMillis(
          Duration.fromISO("P2D").toMillis() / 2,
        ).toMillis() === Duration.fromISO("P1D").toMillis()
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        Duration.fromISO("P1D").toMillis() !==
        Duration.fromISO("P2D").toMillis()
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        Duration.fromISO("PT1H").toMillis() ===
        Duration.fromISO("PT1H").toMillis()
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        Duration.fromISO("PT30M").plus(Duration.fromISO("PT30M")).toMillis() ===
        Duration.fromISO("PT1H").toMillis()
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        Duration.fromISO("PT1H").toMillis() !==
        Duration.fromISO("PT2H").toMillis()
      )
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
  function kSub(l, r) {
    if (DateTime.isDateTime(l) && Duration.isDuration(r)) return l.minus(r);
    if (DateTime.isDateTime(l) && DateTime.isDateTime(r))
      return Duration.fromMillis(l.toMillis() - r.toMillis());
    if (Duration.isDuration(l) && Duration.isDuration(r))
      return Duration.fromMillis(l.toMillis() - r.toMillis());
    return l - r;
  }
  return (function () {
    if (
      !kEq(
        kSub(Duration.fromISO("P2D"), Duration.fromISO("P1D")),
        Duration.fromISO("P1D"),
      )
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
  function kSub(l, r) {
    if (DateTime.isDateTime(l) && Duration.isDuration(r)) return l.minus(r);
    if (DateTime.isDateTime(l) && DateTime.isDateTime(r))
      return Duration.fromMillis(l.toMillis() - r.toMillis());
    if (Duration.isDuration(l) && Duration.isDuration(r))
      return Duration.fromMillis(l.toMillis() - r.toMillis());
    return l - r;
  }
  return (function () {
    if (
      !kEq(
        kSub(Duration.fromISO("PT2H"), Duration.fromISO("PT1H")),
        Duration.fromISO("PT1H"),
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kSub(l, r) {
    if (DateTime.isDateTime(l) && Duration.isDuration(r)) return l.minus(r);
    if (DateTime.isDateTime(l) && DateTime.isDateTime(r))
      return Duration.fromMillis(l.toMillis() - r.toMillis());
    if (Duration.isDuration(l) && Duration.isDuration(r))
      return Duration.fromMillis(l.toMillis() - r.toMillis());
    return l - r;
  }
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
      !(
        kTypeOf(
          kSub(
            DateTime.fromISO("2024-01-15T10:00:00Z"),
            DateTime.fromISO("2024-01-15T09:00:00Z"),
          ),
        ) == "Duration"
      )
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
    if (!kEq([1, 2, 3], [1, 2, 3])) throw new Error("Assertion failed");
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
  function kNeq(l, r) {
    return !kEq(l, r);
  }
  return (function () {
    if (!kNeq([1, 2], [1, 2, 3])) throw new Error("Assertion failed");
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
  function kNeq(l, r) {
    return !kEq(l, r);
  }
  return (function () {
    if (!kNeq([1, 2, 3], [1, 2, 4])) throw new Error("Assertion failed");
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
    if (!kEq([], [])) throw new Error("Assertion failed");
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
    if (!kEq(["a", "b"], ["a", "b"])) throw new Error("Assertion failed");
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
    if (!kEq({ name: "Alice" }, { name: "Alice" }))
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
    if (!kEq({ a: 1, b: 2 }, { a: 1, b: 2 }))
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
  function kNeq(l, r) {
    return !kEq(l, r);
  }
  return (function () {
    if (!kNeq({ a: 1 }, { a: 2 })) throw new Error("Assertion failed");
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
  function kNeq(l, r) {
    return !kEq(l, r);
  }
  return (function () {
    if (!kNeq({ a: 1 }, { b: 1 })) throw new Error("Assertion failed");
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
    if (!kEq({}, {})) throw new Error("Assertion failed");
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
    if (!kEq({ nested: { x: 1 } }, { nested: { x: 1 } }))
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
      !kEq(
        [
          [1, 2],
          [3, 4],
        ],
        [
          [1, 2],
          [3, 4],
        ],
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
