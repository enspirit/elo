(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-06-15").year == 2024))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2023-01-01").year == 2023))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-06-15").month == 6))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-12-25").month == 12))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-01-01").month == 1))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-06-15").day == 15))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-12-25").day == 25))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-01-01").day == 1))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-06-15T14:30:00Z").toUTC().hour == 14))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-06-15T00:00:00Z").toUTC().hour == 0))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-06-15T23:59:59Z").toUTC().hour == 23))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-06-15T14:30:00Z").toUTC().minute == 30))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-06-15T00:00:00Z").toUTC().minute == 0))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.fromISO("2024-06-15T23:59:59Z").toUTC().minute == 59))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
