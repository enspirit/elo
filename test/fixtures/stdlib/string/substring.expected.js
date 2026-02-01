(function(_) { return (function() { if (!("hello".substring(0, 0 + 2) == "he")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("hello".substring(1, 1 + 3) == "ell")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("hello world".substring(6, 6 + 5) == "world")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("hello".substring(2, 2 + 100) == "llo")) throw new Error("Assertion failed"); return true; })(); })(null);
