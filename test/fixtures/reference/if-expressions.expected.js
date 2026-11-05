(function(_) { return (function() { if (!(((true) ? (1) : (2)) == 1)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(((5 > 3) ? ("yes") : ("no")) == "yes")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(((1 > 2) ? ("a") : (((2 > 1) ? ("b") : ("c")))) == "b")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(((10 > 5) ? (100 + 1) : (200 - 1)) == 101)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const x = 10; return ((x > 5) ? ("big") : ("small")); })() == "big")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(((true) ? ((() => { const x = 1; return x + 1; })()) : ((() => { const y = 2; return y + 2; })())) == 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(((true && true) ? (1) : (0)) == 1)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(((true) ? (true) : (false)))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(((5 > 3) ? (10 == 10) : (false)))) throw new Error("Assertion failed"); return true; })(); })(null);




(function(_) { return (function() { if (!(1 + ((true) ? (10) : (20)) == 11)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(1 + ((false) ? (10) : (20)) == 21)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(((true) ? (10) : (20)) + 1 == 11)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(((false) ? (10) : (20)) + 1 == 21)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(2 * ((false) ? (3) : (4)) == 8)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(((false) ? (3) : (4)) * 2 == 8)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(10 - ((false) ? (3) : (4)) == 6)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(12 / ((false) ? (3) : (4)) == 3)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("a" + ((false) ? ("b") : ("c")) == "ac")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(-((false) ? (3) : (4)) == -4)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(!((false) ? (true) : (false)))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(((false) ? (1) : (2)) == 2 && ((true) ? (1) : (2)) == 1)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(((false) ? (1) : (2)) + ((true) ? (10) : (20)) == 12)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } function kRoundTo(x, n) { const f = Math.pow(10, n); return kRound(x * f) / f; } return (function() { if (!(kRoundTo(((false) ? (1.26) : (2.34)), 1) == 2.3)) throw new Error("Assertion failed"); return true; })(); })(null);
