(function(_) { return (function() { if (!("hello world".endsWith("world"))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(!"hello world".endsWith("hello"))) throw new Error("Assertion failed"); return true; })(); })(null);
