









(function(_) { return (function() { if (!(7.0 / 2 == 3.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(1.0 / 4 == 0.25)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(10.0 / 4 == 2.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(3.0 / 2 * 2 == 3)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(5.0 / 2 == 2.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(1.0 / 3 > 0.33)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const n = 2; return 5.0 / n; })() == 2.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kDiv(l, r) { if (Duration.isDuration(l) && typeof r === 'number') return Duration.fromMillis(l.toMillis() / r); return l / r; } function kEq(l, r) { if (Duration.isDuration(l) && Duration.isDuration(r)) return l.toMillis() === r.toMillis(); if (DateTime.isDateTime(l) && DateTime.isDateTime(r)) return l.toMillis() === r.toMillis(); if (Array.isArray(l) && Array.isArray(r)) { if (l.length !== r.length) return false; for (let i = 0; i < l.length; i++) if (!kEq(l[i], r[i])) return false; return true; } if (typeof l === 'object' && typeof r === 'object' && l !== null && r !== null && !Array.isArray(l) && !Array.isArray(r)) { const keysL = Object.keys(l); const keysR = Object.keys(r); if (keysL.length !== keysR.length) return false; for (const key of keysL) if (!(key in r) || !kEq(l[key], r[key])) return false; return true; } return l == r; } return (function() { if (!(kEq((() => { const f = (x) => kDiv(9.0, x); return f(2); })(), 4.5))) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(1.0 == 1)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(2.0 + 1 == 3)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(-0.0 == 0)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(42.0 == 42)) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(Math.round(2.0) == 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(Math.abs(-3.0) == 3)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kEq(l, r) { if (Duration.isDuration(l) && Duration.isDuration(r)) return l.toMillis() === r.toMillis(); if (DateTime.isDateTime(l) && DateTime.isDateTime(r)) return l.toMillis() === r.toMillis(); if (Array.isArray(l) && Array.isArray(r)) { if (l.length !== r.length) return false; for (let i = 0; i < l.length; i++) if (!kEq(l[i], r[i])) return false; return true; } if (typeof l === 'object' && typeof r === 'object' && l !== null && r !== null && !Array.isArray(l) && !Array.isArray(r)) { const keysL = Object.keys(l); const keysR = Object.keys(r); if (keysL.length !== keysR.length) return false; for (const key of keysL) if (!(key in r) || !kEq(l[key], r[key])) return false; return true; } return l == r; } return (function() { if (!(kEq((a => a.length === 0 ? null : a.reduce((x, y) => x < y ? x : y))([2.0, 1]), 1))) throw new Error("Assertion failed"); return true; })(); })(null);
