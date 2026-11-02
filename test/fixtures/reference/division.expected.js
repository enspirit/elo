







(function(_) { return (function() { if (!(7 / 2 == 3.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(1 / 4 == 0.25)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(10 / 4 == 2.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(1 / 3 > 0.33)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(3 / 2 * 2 == 3)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(100 / 8 == 12.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(-7 / 2 == -3.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(0 / 5 == 0)) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(7.0 / 2 == 3.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(7 / 2.0 == 3.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(7.5 / 2.5 == 3)) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!((() => { const n = 2; return 7 / n; })() == 3.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const a = 10; const b = 4; return a / b; })() == 2.5)) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!((1 + 1) / 4 == 0.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(24 / (6 / 2) == 8)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(7 / 2) == 4)) throw new Error("Assertion failed"); return true; })(); })(null);
