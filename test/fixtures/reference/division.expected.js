





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


(function(_) { function kDiv(l, r) { if (Duration.isDuration(l) && typeof r === 'number') return Duration.fromMillis(l.toMillis() / r); return l / r; } function kEq(l, r) { if (Duration.isDuration(l) && Duration.isDuration(r)) return l.toMillis() === r.toMillis(); if (DateTime.isDateTime(l) && DateTime.isDateTime(r)) return l.toMillis() === r.toMillis(); if (Array.isArray(l) && Array.isArray(r)) { if (l.length !== r.length) return false; for (let i = 0; i < l.length; i++) if (!kEq(l[i], r[i])) return false; return true; } if (typeof l === 'object' && typeof r === 'object' && l !== null && r !== null && !Array.isArray(l) && !Array.isArray(r)) { const keysL = Object.keys(l); const keysR = Object.keys(r); if (keysL.length !== keysR.length) return false; for (const key of keysL) if (!(key in r) || !kEq(l[key], r[key])) return false; return true; } return l == r; } return (function() { if (!(kEq((() => { const f = (a, b) => kDiv(a, b); return f(7, 2); })(), 3.5))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kDiv(l, r) { if (Duration.isDuration(l) && typeof r === 'number') return Duration.fromMillis(l.toMillis() / r); return l / r; } function kEq(l, r) { if (Duration.isDuration(l) && Duration.isDuration(r)) return l.toMillis() === r.toMillis(); if (DateTime.isDateTime(l) && DateTime.isDateTime(r)) return l.toMillis() === r.toMillis(); if (Array.isArray(l) && Array.isArray(r)) { if (l.length !== r.length) return false; for (let i = 0; i < l.length; i++) if (!kEq(l[i], r[i])) return false; return true; } if (typeof l === 'object' && typeof r === 'object' && l !== null && r !== null && !Array.isArray(l) && !Array.isArray(r)) { const keysL = Object.keys(l); const keysR = Object.keys(r); if (keysL.length !== keysR.length) return false; for (const key of keysL) if (!(key in r) || !kEq(l[key], r[key])) return false; return true; } return l == r; } return (function() { if (!(kEq((() => { const f = (a, b) => kDiv(a, b); return f(1, 4); })(), 0.25))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kDiv(l, r) { if (Duration.isDuration(l) && typeof r === 'number') return Duration.fromMillis(l.toMillis() / r); return l / r; } function kEq(l, r) { if (Duration.isDuration(l) && Duration.isDuration(r)) return l.toMillis() === r.toMillis(); if (DateTime.isDateTime(l) && DateTime.isDateTime(r)) return l.toMillis() === r.toMillis(); if (Array.isArray(l) && Array.isArray(r)) { if (l.length !== r.length) return false; for (let i = 0; i < l.length; i++) if (!kEq(l[i], r[i])) return false; return true; } if (typeof l === 'object' && typeof r === 'object' && l !== null && r !== null && !Array.isArray(l) && !Array.isArray(r)) { const keysL = Object.keys(l); const keysR = Object.keys(r); if (keysL.length !== keysR.length) return false; for (const key of keysL) if (!(key in r) || !kEq(l[key], r[key])) return false; return true; } return l == r; } return (function() { if (!(kEq((() => { const f = (a, b) => kDiv(a, b); return f(7.5, 2.5); })(), 3))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const n = 2; return 7 / n; })() == 3.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const a = 10; const b = 4; return a / b; })() == 2.5)) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!((1 + 1) / 4 == 0.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(24 / (6 / 2) == 8)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(7 / 2) == 4)) throw new Error("Assertion failed"); return true; })(); })(null);
