











(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(7, 3) == 1)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(9, 3) == 0)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(0, 5) == 0)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(1, 5) == 1)) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(-7, 3) == 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(-1, 3) == 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(-3, 3) == 0)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(-9, 5) == 1)) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(7, -3) == -2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(1, -3) == -2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(-7, -3) == -1)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(-9, -5) == -4)) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(7.5, 2) == 1.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(-7.5, 2) == 0.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(7.5, -2) == -0.5)) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(-1, 7) == 6)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(-8, 7) == 6)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(0 - 15, 7) == 6)) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(7, 3) + 10 == 11)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!(kMod(-7, 3) * 2 == 4)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMod(l, r) { return ((l % r) + r) % r; } return (function() { if (!((() => { const n = -7; return kMod(n, 3); })() == 2)) throw new Error("Assertion failed"); return true; })(); })(null);
