(function(_) { return (function() { if (!("hello  ".trimEnd() == "hello")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("  hello  ".trimEnd() == "  hello")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("hello".trimEnd() == "hello")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("   ".trimEnd() == "")) throw new Error("Assertion failed"); return true; })(); })(null);
