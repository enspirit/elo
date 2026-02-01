(function(_) { return (function() { if (!("hello world".startsWith("hello"))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(!"hello world".startsWith("world"))) throw new Error("Assertion failed"); return true; })(); })(null);
