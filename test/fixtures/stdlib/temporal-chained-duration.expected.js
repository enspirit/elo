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
            .plus(Duration.fromISO("P1M"))
            .plus(Duration.fromISO("PT12H")),
        ) == "DateTime"
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
