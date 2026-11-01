(function(_) { return (function() { if (!("  hello".trimStart() == "hello")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("  hello  ".trimStart() == "hello  ")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("hello".trimStart() == "hello")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("   ".trimStart() == "")) throw new Error("Assertion failed"); return true; })(); })(null);
