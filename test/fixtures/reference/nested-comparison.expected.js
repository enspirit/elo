














(function(_) { return (function() { if (!(1 == 1 == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(1 == 2 == false)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(1 != 2 == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(1 == 1 != false)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(1 == 2 != true)) throw new Error("Assertion failed"); return true; })(); })(null);

(function(_) { return (function() { if (!(1 < 2 == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(2 < 1 == false)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(1 > 2 == false)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(2 >= 2 == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(2 <= 1 == false)) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(1 <= 2 == 3 > 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(1 > 2 == 3 < 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(1 >= 1 != 2 > 3)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(1 < 2 != 2 < 1)) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(1 == 1 == true == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("a" == "a" == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kIsNull(v) { return v === null || v === undefined; } return (function() { if (!(kIsNull(null) == true == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2024-01-15", { zone: "utc" }).toMillis() === DateTime.fromISO("2024-01-15", { zone: "utc" }).toMillis() == true)) throw new Error("Assertion failed"); return true; })(); })(null);
