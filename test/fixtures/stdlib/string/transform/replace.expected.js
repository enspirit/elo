(function(_) { return (function() { if (!("hello world".replace("world", "there") == "hello there")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("abab".replace("ab", "x") == "xab")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("abab".replaceAll("ab", "x") == "xx")) throw new Error("Assertion failed"); return true; })(); })(null);
