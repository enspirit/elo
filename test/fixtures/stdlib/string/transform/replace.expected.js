(function(_) { return (function() { if (!("hello world".replace("world", "there") == "hello there")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("abab".replace("ab", "x") == "xab")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("abab".replaceAll("ab", "x") == "xx")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("a.b.c".replace(".", "X") == "aXb.c")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("a.b.c".replaceAll(".", "X") == "aXbXc")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("1+1".replace("+", "-") == "1-1")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("a(b)c".replaceAll("(", "[") == "a[b)c")) throw new Error("Assertion failed"); return true; })(); })(null);
