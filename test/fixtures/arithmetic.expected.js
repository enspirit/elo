(function(_) { return (function() { if (!(2 + 3 == 5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(2 + 3 * 4 == 14)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(Math.pow(2, 3) == 8)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(Math.pow(2, 3) + 1 == 9)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((5 + 5) * (10 - 3) / 2 == 35)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(-5 + 10 == 5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(10 % 3 + 8 / 2 == 5)) throw new Error("Assertion failed"); return true; })(); })(null);
