(function (_) {
  return (function () {
    if (!(100 * (1 - 0.2) == 80)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(90 + 90 * 0.1 == 99)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(1000 * Math.pow(1 + 0.05, 10) > 1500))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(30 >= 18 && (50000 > 30000 || true == true)))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(0.8 * 100 == 80)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(70 / Math.pow(1.75, 2) < 25)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
