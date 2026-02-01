(function(_) { return (function() { if (!("hello".toUpperCase() == "HELLO")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("MiXeD".toUpperCase() == "MIXED")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(("hello" + " " + "world").toUpperCase() == "HELLO WORLD")) throw new Error("Assertion failed"); return true; })(); })(null);
