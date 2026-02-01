(function(_) { return (function() { if (!("hello".concat(" world") == "hello world")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("".concat("test") == "test")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("hello" + " " + "world" == "hello world")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("hi".repeat(3) == "hihihi")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("hi".repeat(3) == "hihihi")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("ab".repeat(2) == "abab")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("".repeat(5) == "")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("x".repeat(0) == "")) throw new Error("Assertion failed"); return true; })(); })(null);
