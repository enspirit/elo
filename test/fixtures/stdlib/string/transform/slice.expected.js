(function(_) { return (function() { if (!("hello".slice(0, 2) == "he")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("hello".slice(1, 3) == "el")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("hello world".slice(6, 11) == "world")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("hello".slice(2, 100) == "llo")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("hello".slice(0, 0) == "")) throw new Error("Assertion failed"); return true; })(); })(null);
