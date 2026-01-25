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
    if (!(kTypeOf(() => 42) == "Function")) throw new Error("Assertion failed");
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
    if (!(kTypeOf(() => 2 * 3) == "Function"))
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
    if (!(kTypeOf((x) => x) == "Function")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kMul(l, r) {
    if (Duration.isDuration(l)) return Duration.fromMillis(l.toMillis() * r);
    if (Duration.isDuration(r)) return Duration.fromMillis(r.toMillis() * l);
    return l * r;
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
    if (!(kTypeOf((x) => kMul(x, 2)) == "Function"))
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
    if (!(kTypeOf((x, y) => kAdd(x, y)) == "Function"))
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
    if (!(kTypeOf((a, b, c) => kAdd(kAdd(a, b), c)) == "Function"))
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
  function kMul(l, r) {
    if (Duration.isDuration(l)) return Duration.fromMillis(l.toMillis() * r);
    if (Duration.isDuration(r)) return Duration.fromMillis(r.toMillis() * l);
    return l * r;
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
    if (!(kTypeOf((x) => kAdd(kMul(x, x), 1)) == "Function"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kMul(l, r) {
    if (Duration.isDuration(l)) return Duration.fromMillis(l.toMillis() * r);
    if (Duration.isDuration(r)) return Duration.fromMillis(r.toMillis() * l);
    return l * r;
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
    if (!(kTypeOf((price) => kMul(price, 1.21)) == "Function"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kMul(l, r) {
    if (Duration.isDuration(l)) return Duration.fromMillis(l.toMillis() * r);
    if (Duration.isDuration(r)) return Duration.fromMillis(r.toMillis() * l);
    return l * r;
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
    if (!(kTypeOf((_) => kMul(_.budget, 1.21)) == "Function"))
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
    if (!(kTypeOf((item) => kAdd(item.price, item.tax)) == "Function"))
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
  function kMul(l, r) {
    if (Duration.isDuration(l)) return Duration.fromMillis(l.toMillis() * r);
    if (Duration.isDuration(r)) return Duration.fromMillis(r.toMillis() * l);
    return l * r;
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
        kTypeOf((x) =>
          (() => {
            const doubled = kMul(x, 2);
            return kAdd(doubled, 1);
          })(),
        ) == "Function"
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
    if (!(kTypeOf((x) => (x > 0 ? x : kSub(0, x))) == "Function"))
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
  function kMul(l, r) {
    if (Duration.isDuration(l)) return Duration.fromMillis(l.toMillis() * r);
    if (Duration.isDuration(r)) return Duration.fromMillis(r.toMillis() * l);
    return l * r;
  }
  return (function () {
    if (
      !kEq(
        (() => {
          const double = (x) => kMul(x, 2);
          return double(5);
        })(),
        10,
      )
    )
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
    if (
      !kEq(
        (() => {
          const add = (x, y) => kAdd(x, y);
          return add(3, 4);
        })(),
        7,
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
  function kMul(l, r) {
    if (Duration.isDuration(l)) return Duration.fromMillis(l.toMillis() * r);
    if (Duration.isDuration(r)) return Duration.fromMillis(r.toMillis() * l);
    return l * r;
  }
  return (function () {
    if (
      !kEq(
        (() => {
          const double = (x) => kMul(x, 2);
          return double(2);
        })(),
        4,
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
