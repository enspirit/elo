(function(_) { return (function() { if (!("hello".length == 5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("".length == 0)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("abc def".length == 7)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(("ab" + "cd").length == 4)) throw new Error("Assertion failed"); return true; })(); })(null);
