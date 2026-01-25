(function (_) {
  return (function () {
    if (!(100 * 1.1 > 100)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(10 * 5 - 10 == 40)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(75 >= 50 && 75 <= 100)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(50 > 0 && (true || 50 < 1000))) throw new Error("Assertion failed");
    return true;
  })();
})(null);
