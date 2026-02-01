(function(_) { return (function() { if (!("hello" == "hello")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("hello world" == "hello world")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("" == "")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("test123" == "test123")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("a" != "b")) throw new Error("Assertion failed"); return true; })(); })(null);
