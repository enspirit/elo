(function (_) {
  return (function () {
    if (
      !(
        (() => {
          if (!true) throw new Error("guard failed");
          return 42;
        })() == 42
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
        (() => {
          if (!(5 > 3)) throw new Error("guard failed");
          return 100;
        })() == 100
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
        (() => {
          if (!(10 > 0)) throw new Error("guard 'positive' failed");
          return 10;
        })() == 10
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
        (() => {
          if (!(7 > 0)) throw new Error("value must be positive");
          return 7;
        })() == 7
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
        (() => {
          if (!(10 > 0)) throw new Error("guard failed");
          if (!(10 < 100)) throw new Error("guard failed");
          return 10;
        })() == 10
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
        (() => {
          if (!(5 > 0)) throw new Error("guard 'positive' failed");
          if (!(5 < 10)) throw new Error("guard 'small' failed");
          return 5;
        })() == 5
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
        (() => {
          const x = 5;
          return (() => {
            if (!(x > 0)) throw new Error("guard failed");
            return x * 2;
          })();
        })() == 10
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
        (() => {
          if (!true) throw new Error("check failed");
          return 99;
        })() == 99
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
        (() => {
          if (!(3 > 0)) throw new Error("check 'valid' failed");
          return 3;
        })() == 3
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
        (() => {
          const x = 10;
          return (() => {
            if (!(x > 0)) throw new Error("check failed");
            return x + 5;
          })();
        })() == 15
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
        (() => {
          if (!(1 > 0)) throw new Error("guard failed");
          return (() => {
            const x = 10;
            const y = 20;
            return x + y;
          })();
        })() == 30
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
        (() => {
          if (!true) throw new Error("guard failed");
          return (() => {
            if (!true) throw new Error("guard failed");
            return 7;
          })();
        })() == 7
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
        (() => {
          if (!true) throw new Error("guard failed");
          return true ? 1 : 2;
        })() == 1
      )
    )
      throw new Error("Assertion failed");
    return true;
  })();
})(null);
