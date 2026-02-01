(function(_) { return (function() { if (!("42".padStart(5, "0") == "00042")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!("hi".padEnd(5, ".") == "hi...")) throw new Error("Assertion failed"); return true; })(); })(null);
