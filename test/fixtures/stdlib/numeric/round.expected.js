(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(3.2) == 3)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(3.5) == 4)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(3.7) == 4)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(-3.2) == -3)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(-3.7) == -4)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(5.0) == 5)) throw new Error("Assertion failed"); return true; })(); })(null);




(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(2.5) == 3)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(-2.5) == -3)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(-3.5) == -4)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(0.5) == 1)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(-0.5) == -1)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(1.5) == 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(-1.5) == -2)) throw new Error("Assertion failed"); return true; })(); })(null);




(function(_) { function kPow(l, r) { if (Number.isInteger(l) && Number.isInteger(r) && r > 1 && Math.abs(l) > 1 && r * Math.log2(Math.abs(l)) > 10000000) throw new Error("Exponentiation result exceeds the size limit (10000000 bits); raise ELO_MAX_STRING_LENGTH to allow larger results"); return Math.pow(l, r); } function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(kPow(5, 1) / 2) == 3)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kPow(l, r) { if (Number.isInteger(l) && Number.isInteger(r) && r > 1 && Math.abs(l) > 1 && r * Math.log2(Math.abs(l)) > 10000000) throw new Error("Exponentiation result exceeds the size limit (10000000 bits); raise ELO_MAX_STRING_LENGTH to allow larger results"); return Math.pow(l, r); } function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(kPow(-5, 1) / 2) == -3)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kPow(l, r) { if (Number.isInteger(l) && Number.isInteger(r) && r > 1 && Math.abs(l) > 1 && r * Math.log2(Math.abs(l)) > 10000000) throw new Error("Exponentiation result exceeds the size limit (10000000 bits); raise ELO_MAX_STRING_LENGTH to allow larger results"); return Math.pow(l, r); } function kRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); } return (function() { if (!(kRound(kPow(7, 1) / 2) == 4)) throw new Error("Assertion failed"); return true; })(); })(null);
