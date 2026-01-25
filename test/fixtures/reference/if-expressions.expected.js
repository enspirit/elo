(function (_) {
  return (function () {
    if (!(true ? 1 : 2 == 1)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(5 > 3 ? "yes" : "no" == "yes")) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(1 > 2 ? "a" : (2 > 1 ? "b" : "c") == "b"))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(10 > 5 ? 100 + 1 : 200 - 1 == 101))
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(
        (() => {
          const x = 10;
          return x > 5 ? "big" : "small";
        })() == "big"
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (
      !(true
        ? (() => {
            const x = 1;
            return x + 1;
          })()
        : (() => {
            const y = 2;
            return y + 2;
          })() == 2)
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(true && true ? 1 : 0 == 1)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(true ? true : false)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
(function (_) {
  return (function () {
    if (!(5 > 3 ? 10 == 10 : false)) throw new Error("Assertion failed");
    return true;
  })();
})(null);
