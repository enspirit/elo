(function(_) { return (function() { if (!([1, 2, 3].every((x) => x > 0) == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!([1, 2, 3].every((x) => x > 2) == false)) throw new Error("Assertion failed"); return true; })(); })(null);
