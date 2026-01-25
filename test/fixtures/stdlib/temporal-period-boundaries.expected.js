(function (_) {
  return (function () {
    if (!(DateTime.now().startOf("day") <= DateTime.now()))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.now().endOf("day") >= DateTime.now()))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.now().startOf("day") < DateTime.now().endOf("day")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.now().startOf("week") <= DateTime.now().startOf("day")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.now().endOf("week") >= DateTime.now().startOf("day")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.now().startOf("week") < DateTime.now().endOf("week")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.now().startOf("month") <= DateTime.now().startOf("day")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.now().endOf("month") >= DateTime.now().startOf("day")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.now().startOf("month") < DateTime.now().endOf("month")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.now().startOf("quarter") <= DateTime.now().startOf("day")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.now().endOf("quarter") >= DateTime.now().startOf("day")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.now().startOf("quarter") < DateTime.now().endOf("quarter")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.now().startOf("year") <= DateTime.now().startOf("day")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.now().endOf("year") >= DateTime.now().startOf("day")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(DateTime.now().startOf("year") < DateTime.now().endOf("year")))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
