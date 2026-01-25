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
      !(
        kTypeOf(Duration.fromISO("P1D").plus(Duration.fromISO("P1D"))) ==
        "Duration"
      )
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
      !(
        kTypeOf(Duration.fromISO("PT1H").plus(Duration.fromISO("PT30M"))) ==
        "Duration"
      )
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
      !(
        kTypeOf(Duration.fromISO("P1M").plus(Duration.fromISO("P2W"))) ==
        "Duration"
      )
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
      !(
        kTypeOf(Duration.fromMillis(Duration.fromISO("P1D").toMillis() * 2)) ==
        "Duration"
      )
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
      !(
        kTypeOf(Duration.fromMillis(Duration.fromISO("P1D").toMillis() * 2)) ==
        "Duration"
      )
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
      !(
        kTypeOf(Duration.fromMillis(Duration.fromISO("PT1H").toMillis() * 3)) ==
        "Duration"
      )
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
      !(
        kTypeOf(
          Duration.fromMillis(Duration.fromISO("P1W").toMillis() * 2.5),
        ) == "Duration"
      )
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
      !(
        kTypeOf(Duration.fromMillis(Duration.fromISO("P2D").toMillis() / 2)) ==
        "Duration"
      )
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
      !(
        kTypeOf(Duration.fromMillis(Duration.fromISO("PT2H").toMillis() / 2)) ==
        "Duration"
      )
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
      !(
        kTypeOf(DateTime.fromISO("2024-01-15").plus(Duration.fromISO("P1D"))) ==
        "DateTime"
      )
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
      !(
        kTypeOf(DateTime.fromISO("2024-01-15").plus(Duration.fromISO("P1M"))) ==
        "DateTime"
      )
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
      !(
        kTypeOf(
          DateTime.fromISO("2024-01-15").plus(Duration.fromISO("PT1H")),
        ) == "DateTime"
      )
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
      !(
        kTypeOf(
          DateTime.fromISO("2024-01-15").minus(Duration.fromISO("P1D")),
        ) == "DateTime"
      )
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
      !(
        kTypeOf(
          DateTime.fromISO("2024-01-15").minus(Duration.fromISO("P1M")),
        ) == "DateTime"
      )
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
      !(
        kTypeOf(
          DateTime.fromISO("2024-01-15T10:00:00Z").plus(
            Duration.fromISO("P1D"),
          ),
        ) == "DateTime"
      )
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
      !(
        kTypeOf(
          DateTime.fromISO("2024-01-15T10:00:00Z").plus(
            Duration.fromISO("PT2H"),
          ),
        ) == "DateTime"
      )
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
      !(
        kTypeOf(
          DateTime.fromISO("2024-01-15T10:00:00Z").minus(
            Duration.fromISO("P1D"),
          ),
        ) == "DateTime"
      )
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
      !(
        kTypeOf(
          DateTime.fromISO("2024-01-15T10:00:00Z").minus(
            Duration.fromISO("PT2H"),
          ),
        ) == "DateTime"
      )
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
      !(
        kTypeOf(DateTime.fromISO("2024-01-15").plus(Duration.fromISO("P1D"))) ==
        "DateTime"
      )
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
      !(
        kTypeOf(
          DateTime.fromISO("2024-01-15").plus(Duration.fromISO("PT1H")),
        ) == "DateTime"
      )
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
      !(
        kTypeOf(
          DateTime.fromISO("2024-01-15T10:00:00Z").plus(
            Duration.fromISO("P1D"),
          ),
        ) == "DateTime"
      )
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
      !(
        kTypeOf(
          DateTime.fromISO("2024-01-15T10:00:00Z").plus(
            Duration.fromISO("PT1H"),
          ),
        ) == "DateTime"
      )
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
    if (!(kTypeOf(DateTime.now().startOf("day")) == "DateTime"))
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
    if (!(kTypeOf(DateTime.now()) == "DateTime"))
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
    if (!(kTypeOf(DateTime.now().startOf("year")) == "DateTime"))
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
    if (!(kTypeOf(DateTime.now().endOf("year")) == "DateTime"))
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
    if (!(kTypeOf(DateTime.now().startOf("month")) == "DateTime"))
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
    if (!(kTypeOf(DateTime.now().endOf("month")) == "DateTime"))
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
    if (!(kTypeOf(DateTime.now().startOf("week")) == "DateTime"))
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
    if (!(kTypeOf(DateTime.now().endOf("week")) == "DateTime"))
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
    if (!(kTypeOf(DateTime.now().startOf("quarter")) == "DateTime"))
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
    if (!(kTypeOf(DateTime.now().endOf("quarter")) == "DateTime"))
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
      !(
        kTypeOf(
          DateTime.now()
            .startOf("day")
            .plus(Duration.fromISO("P1D"))
            .plus(Duration.fromISO("PT2H")),
        ) == "DateTime"
      )
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
      !(
        kTypeOf(
          DateTime.now()
            .minus(Duration.fromISO("P1W"))
            .plus(Duration.fromISO("PT30M")),
        ) == "DateTime"
      )
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
      !(
        kTypeOf(
          Duration.fromISO("P1D")
            .plus(Duration.fromISO("P1D"))
            .plus(Duration.fromISO("P1D")),
        ) == "Duration"
      )
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
      !(
        kTypeOf(
          Duration.fromMillis(Duration.fromISO("P1D").toMillis() * 2).plus(
            Duration.fromISO("PT1H"),
          ),
        ) == "Duration"
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
