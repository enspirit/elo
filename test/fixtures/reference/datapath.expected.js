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
  function kFetch(data, path) {
    let current = data;
    for (const segment of path) {
      if (current === null || current === undefined) return null;
      if (typeof segment === "number") {
        if (!Array.isArray(current)) return null;
        current = current[segment];
      } else {
        if (typeof current !== "object" || current === null) return null;
        current = current[segment];
      }
    }
    return current === undefined ? null : current;
  }
  return (function () {
    if (!kEq(kFetch({ name: "Alice" }, ["name"]), "Alice"))
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
  function kFetch(data, path) {
    let current = data;
    for (const segment of path) {
      if (current === null || current === undefined) return null;
      if (typeof segment === "number") {
        if (!Array.isArray(current)) return null;
        current = current[segment];
      } else {
        if (typeof current !== "object" || current === null) return null;
        current = current[segment];
      }
    }
    return current === undefined ? null : current;
  }
  return (function () {
    if (!kEq(kFetch({ user: { name: "Bob" } }, ["user", "name"]), "Bob"))
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
  function kFetch(data, path) {
    let current = data;
    for (const segment of path) {
      if (current === null || current === undefined) return null;
      if (typeof segment === "number") {
        if (!Array.isArray(current)) return null;
        current = current[segment];
      } else {
        if (typeof current !== "object" || current === null) return null;
        current = current[segment];
      }
    }
    return current === undefined ? null : current;
  }
  return (function () {
    if (!kEq(kFetch({ items: [10, 20, 30] }, ["items", 0]), 10))
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
  function kFetch(data, path) {
    let current = data;
    for (const segment of path) {
      if (current === null || current === undefined) return null;
      if (typeof segment === "number") {
        if (!Array.isArray(current)) return null;
        current = current[segment];
      } else {
        if (typeof current !== "object" || current === null) return null;
        current = current[segment];
      }
    }
    return current === undefined ? null : current;
  }
  return (function () {
    if (!kEq(kFetch({ items: [10, 20, 30] }, ["items", 2]), 30))
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
  function kFetch(data, path) {
    let current = data;
    for (const segment of path) {
      if (current === null || current === undefined) return null;
      if (typeof segment === "number") {
        if (!Array.isArray(current)) return null;
        current = current[segment];
      } else {
        if (typeof current !== "object" || current === null) return null;
        current = current[segment];
      }
    }
    return current === undefined ? null : current;
  }
  return (function () {
    if (!kEq(kFetch({ list: [{ id: 1 }, { id: 2 }] }, ["list", 0, "id"]), 1))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kFetch(data, path) {
    let current = data;
    for (const segment of path) {
      if (current === null || current === undefined) return null;
      if (typeof segment === "number") {
        if (!Array.isArray(current)) return null;
        current = current[segment];
      } else {
        if (typeof current !== "object" || current === null) return null;
        current = current[segment];
      }
    }
    return current === undefined ? null : current;
  }
  function kIsNull(v) {
    return v === null || v === undefined;
  }
  return (function () {
    if (!kIsNull(kFetch({ name: "Alice" }, ["missing"])))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kFetch(data, path) {
    let current = data;
    for (const segment of path) {
      if (current === null || current === undefined) return null;
      if (typeof segment === "number") {
        if (!Array.isArray(current)) return null;
        current = current[segment];
      } else {
        if (typeof current !== "object" || current === null) return null;
        current = current[segment];
      }
    }
    return current === undefined ? null : current;
  }
  function kIsNull(v) {
    return v === null || v === undefined;
  }
  return (function () {
    if (!kIsNull(kFetch({ name: "Alice" }, ["name", "child"])))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  function kFetch(data, path) {
    let current = data;
    for (const segment of path) {
      if (current === null || current === undefined) return null;
      if (typeof segment === "number") {
        if (!Array.isArray(current)) return null;
        current = current[segment];
      } else {
        if (typeof current !== "object" || current === null) return null;
        current = current[segment];
      }
    }
    return current === undefined ? null : current;
  }
  function kIsNull(v) {
    return v === null || v === undefined;
  }
  return (function () {
    if (!kIsNull(kFetch(null, ["x"]))) throw new Error("Assertion failed");
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
  function kFetch(data, path) {
    let current = data;
    for (const segment of path) {
      if (current === null || current === undefined) return null;
      if (typeof segment === "number") {
        if (!Array.isArray(current)) return null;
        current = current[segment];
      } else {
        if (typeof current !== "object" || current === null) return null;
        current = current[segment];
      }
    }
    return current === undefined ? null : current;
  }
  function kFetchObject(data, paths) {
    const result = {};
    for (const key of Object.keys(paths)) {
      result[key] = kFetch(data, paths[key]);
    }
    return result;
  }
  return (function () {
    if (
      !kEq(kFetchObject({ a: 1, b: 2 }, { x: ["a"], y: ["b"] }), { x: 1, y: 2 })
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
  function kFetch(data, path) {
    let current = data;
    for (const segment of path) {
      if (current === null || current === undefined) return null;
      if (typeof segment === "number") {
        if (!Array.isArray(current)) return null;
        current = current[segment];
      } else {
        if (typeof current !== "object" || current === null) return null;
        current = current[segment];
      }
    }
    return current === undefined ? null : current;
  }
  function kFetchObject(data, paths) {
    const result = {};
    for (const key of Object.keys(paths)) {
      result[key] = kFetch(data, paths[key]);
    }
    return result;
  }
  return (function () {
    if (
      !kEq(kFetchObject({ foo: { bar: 10 } }, { v: ["foo", "bar"] }), { v: 10 })
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
  function kFetch(data, path) {
    let current = data;
    for (const segment of path) {
      if (current === null || current === undefined) return null;
      if (typeof segment === "number") {
        if (!Array.isArray(current)) return null;
        current = current[segment];
      } else {
        if (typeof current !== "object" || current === null) return null;
        current = current[segment];
      }
    }
    return current === undefined ? null : current;
  }
  function kFetchObject(data, paths) {
    const result = {};
    for (const key of Object.keys(paths)) {
      result[key] = kFetch(data, paths[key]);
    }
    return result;
  }
  return (function () {
    if (
      !kEq(
        kFetchObject(
          { items: [1, 2, 3] },
          { first: ["items", 0], last: ["items", 2] },
        ),
        { first: 1, last: 3 },
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
  function kFetch(data, path) {
    let current = data;
    for (const segment of path) {
      if (current === null || current === undefined) return null;
      if (typeof segment === "number") {
        if (!Array.isArray(current)) return null;
        current = current[segment];
      } else {
        if (typeof current !== "object" || current === null) return null;
        current = current[segment];
      }
    }
    return current === undefined ? null : current;
  }
  function kFetchArray(data, paths) {
    return paths.map((p) => kFetch(data, p));
  }
  return (function () {
    if (!kEq(kFetchArray({ a: 1, b: 2 }, [["a"], ["b"]]), [1, 2]))
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
  function kFetch(data, path) {
    let current = data;
    for (const segment of path) {
      if (current === null || current === undefined) return null;
      if (typeof segment === "number") {
        if (!Array.isArray(current)) return null;
        current = current[segment];
      } else {
        if (typeof current !== "object" || current === null) return null;
        current = current[segment];
      }
    }
    return current === undefined ? null : current;
  }
  function kFetchArray(data, paths) {
    return paths.map((p) => kFetch(data, p));
  }
  return (function () {
    if (!kEq(kFetchArray({ foo: { bar: 10 } }, [["foo", "bar"]]), [10]))
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
  function kFetch(data, path) {
    let current = data;
    for (const segment of path) {
      if (current === null || current === undefined) return null;
      if (typeof segment === "number") {
        if (!Array.isArray(current)) return null;
        current = current[segment];
      } else {
        if (typeof current !== "object" || current === null) return null;
        current = current[segment];
      }
    }
    return current === undefined ? null : current;
  }
  function kFetchArray(data, paths) {
    return paths.map((p) => kFetch(data, p));
  }
  return (function () {
    if (
      !kEq(
        kFetchArray({ items: [1, 2, 3] }, [
          ["items", 0],
          ["items", 1],
          ["items", 2],
        ]),
        [1, 2, 3],
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
