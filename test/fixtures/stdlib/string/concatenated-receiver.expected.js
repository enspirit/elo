








(function(_) { return (function() { if (!(("ab" + "cd").startsWith("abc") == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(("ab" + "cd").endsWith("bcd") == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(("ab" + "cd").includes("bc") == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kEq(l, r) { if (Duration.isDuration(l) && Duration.isDuration(r)) return l.toMillis() === r.toMillis(); if (DateTime.isDateTime(l) && DateTime.isDateTime(r)) return l.toMillis() === r.toMillis(); if (Array.isArray(l) && Array.isArray(r)) { if (l.length !== r.length) return false; for (let i = 0; i < l.length; i++) if (!kEq(l[i], r[i])) return false; return true; } if (typeof l === 'object' && typeof r === 'object' && l !== null && r !== null && !Array.isArray(l) && !Array.isArray(r)) { const keysL = Object.keys(l); const keysR = Object.keys(r); if (keysL.length !== keysR.length) return false; for (const key of keysL) if (!(key in r) || !kEq(l[key], r[key])) return false; return true; } return l == r; } return (function() { if (!(kEq((i => i === -1 ? null : i)(("ab" + "cd").indexOf("c")), 2))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(("ab" + "cd").concat("e") == "abcde")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(("ab" + "cd").substring(1, 1 + 2) == "bc")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(("ab" + "cd").slice(1, 3) == "bc")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(("ab" + "cd").replace("c", "Z") == "abZd")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(("ab" + "cdc").replaceAll("c", "Z") == "abZdZ")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kPad(s, n, p, atStart) { if (n > 10000000) throw new Error("String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings"); return atStart ? s.padStart(n, p) : s.padEnd(n, p); } return (function() { if (!(kPad(("a" + "b"), 4, "0", true) == "00ab")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kPad(s, n, p, atStart) { if (n > 10000000) throw new Error("String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings"); return atStart ? s.padStart(n, p) : s.padEnd(n, p); } return (function() { if (!(kPad(("a" + "b"), 4, "0", false) == "ab00")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kEq(l, r) { if (Duration.isDuration(l) && Duration.isDuration(r)) return l.toMillis() === r.toMillis(); if (DateTime.isDateTime(l) && DateTime.isDateTime(r)) return l.toMillis() === r.toMillis(); if (Array.isArray(l) && Array.isArray(r)) { if (l.length !== r.length) return false; for (let i = 0; i < l.length; i++) if (!kEq(l[i], r[i])) return false; return true; } if (typeof l === 'object' && typeof r === 'object' && l !== null && r !== null && !Array.isArray(l) && !Array.isArray(r)) { const keysL = Object.keys(l); const keysR = Object.keys(r); if (keysL.length !== keysR.length) return false; for (const key of keysL) if (!(key in r) || !kEq(l[key], r[key])) return false; return true; } return l == r; } return (function() { if (!(kEq((("a," + "b") === '' ? [] : ("a," + "b").split(",")), ["a", "b"]))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(("ab" + "cd").split('').reverse().join('') == "dcba")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((("a" + "b").length === 0) == false)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(((" " + " ").trim().length === 0) == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(("ab" + "cd").length == 4)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(("ab" + "cd").toUpperCase() == "ABCD")) throw new Error("Assertion failed"); return true; })(); })(null);
