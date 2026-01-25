(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-01-15") > DateTime.fromISO("2024-01-10")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!!(DateTime.fromISO("2024-01-15") < DateTime.fromISO("2024-01-10")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-01-15") >= DateTime.fromISO("2024-01-15")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-01-15") <= DateTime.fromISO("2024-01-15")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        DateTime.fromISO("2024-01-15T10:30:00Z") >
        DateTime.fromISO("2024-01-15T09:00:00Z")
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
        DateTime.fromISO("2024-01-15T10:30:00Z") <
        DateTime.fromISO("2024-01-15T11:00:00Z")
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
        DateTime.fromISO("2024-01-15T10:30:00Z") >=
        DateTime.fromISO("2024-01-15T10:30:00Z")
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
