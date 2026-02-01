(function(_) { return (function() { if (!("hello world".includes("lo wo"))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("hello world".includes("hello"))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(!"hello world".includes("xyz"))) throw new Error("Assertion failed"); return true; })(); })(null);
