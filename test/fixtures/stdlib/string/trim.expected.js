(function(_) { return (function() { if (!("  hello  ".trim() == "hello")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("no spaces".trim() == "no spaces")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("   ".trim() == "")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((" hello " + " world ").trim() == "hello  world")) throw new Error("Assertion failed"); return true; })(); })(null);
